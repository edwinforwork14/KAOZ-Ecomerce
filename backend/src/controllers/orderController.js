const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Settings = require("../models/Settings");
const ExchangeRate = require("../models/ExchangeRate");

exports.createOrder = async (req, res) => {
  try {
    const {
      customerInfo,
      shippingAddress,
      shippingMethod,
      paymentMethod,
      notes,
    } = req.body;

    // Obtener configuraciones
    const settings = await Settings.getSettings();
    const exchangeRate = await ExchangeRate.getCurrentRate();

    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.headers["x-session-id"] };
    const cart = await Cart.findOne(query).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "El carrito está vacío",
      });
    }

    // Verificar stock de todos los productos
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      const variant = product.variants.find((v) => v.color === item.color);
      const sizeStock = variant?.sizes.find((s) => s.size === item.size);

      if (!sizeStock || sizeStock.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${product.name} - ${item.color} - ${item.size}`,
        });
      }
    }

    // Buscar método de pago seleccionado
    const selectedPaymentMethod = settings.paymentMethods.find(
      (m) => m.id === paymentMethod
    );

    // Buscar método de envío seleccionado
    const selectedShippingMethod = settings.shippingMethods.find(
      (m) => m.id === shippingMethod
    );

    // Crear items de orden
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      name: item.name,
      image: item.image,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      originalPrice: item.originalPrice,
      subtotal: item.price * item.quantity,
    }));

    let subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Calcular costo de envío
    let shippingCost = 0;
    if (selectedShippingMethod) {
      if (
        selectedShippingMethod.freeFrom > 0 &&
        subtotal >= selectedShippingMethod.freeFrom
      ) {
        shippingCost = 0;
      } else {
        shippingCost = selectedShippingMethod.additionalCost || 0;
      }
    }

    // Calcular descuento si aplica
    let discount = null;
    if (selectedPaymentMethod && selectedPaymentMethod.hasDiscount) {
      const discountPercentage = selectedPaymentMethod.discountPercentage || 0;
      const discountAmount = (subtotal * discountPercentage) / 100;
      discount = {
        type: "payment_method",
        value: discountPercentage,
        amount: discountAmount,
        description: `Descuento por pago con ${selectedPaymentMethod.name}`,
      };
    }

    // Calcular total
    let total = subtotal + shippingCost;
    if (discount) {
      total -= discount.amount;
    }

    // Calcular total en bolívares
    let totalInBs = null;
    if (exchangeRate) {
      const rate =
        settings.currency.code === "EUR" ? exchangeRate.eur : exchangeRate.usd;
      totalInBs = total * rate;
    }

    // Generar número de orden
    const orderNumber = await Order.generateOrderNumber(settings.orders.prefix);

    const order = await Order.create({
      orderNumber,
      user: req.user?._id,
      customerInfo,
      shippingMethod: selectedShippingMethod
        ? {
            id: selectedShippingMethod.id,
            name: selectedShippingMethod.name,
            type: selectedShippingMethod.type,
            cost: shippingCost,
          }
        : null,
      shippingAddress: selectedShippingMethod?.requiresAddress
        ? shippingAddress
        : null,
      items: orderItems,
      subtotal,
      shipping: shippingCost,
      discount,
      total,
      currency: {
        symbol: settings.currency.symbol,
        code: settings.currency.code,
        exchangeRate: exchangeRate
          ? {
              usd: exchangeRate.usd,
              eur: exchangeRate.eur,
            }
          : null,
      },
      totalInBs,
      paymentMethod: selectedPaymentMethod
        ? {
            id: selectedPaymentMethod.id,
            name: selectedPaymentMethod.name,
            requiresProof: selectedPaymentMethod.requiresProof,
          }
        : {
            id: paymentMethod,
            name: paymentMethod,
          },
      notes,
      statusHistory: [
        {
          status: "pending",
          note: "Pedido creado",
          date: new Date(),
        },
      ],
    });

    // Reducir stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      const variant = product.variants.find((v) => v.color === item.color);
      const sizeStock = variant.sizes.find((s) => s.size === item.size);
      sizeStock.stock -= item.quantity;
      await product.save();
    }

    // Vaciar carrito
    cart.items = [];
    await cart.save();

    const populatedOrder = await Order.findById(order._id).populate(
      "items.product"
    );

    res.status(201).json({
      success: true,
      message: "Pedido creado exitosamente",
      order: populatedOrder,
      // Incluir mensaje de WhatsApp personalizado
      whatsappMessage: selectedPaymentMethod?.whatsappMessage || null,
      shippingMessage: selectedShippingMethod?.whatsappMessage || null,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear pedido",
      error: error.message,
    });
  }
};

exports.updateOrderWhatsApp = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        whatsappSent: true,
        whatsappSentAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Pedido actualizado",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar pedido",
      error: error.message,
    });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Debes iniciar sesión",
      });
    }

    const orders = await Order.find({
      user: req.user._id,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("items.product");

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener pedidos",
      error: error.message,
    });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    }).populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    // Verificar que sea el dueño o admin
    if (
      req.user &&
      order.user &&
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "No autorizado",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener pedido",
      error: error.message,
    });
  }
};

// Buscar pedido por número de orden
exports.searchOrder = async (req, res) => {
  try {
    const { orderNumber } = req.query;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Número de orden requerido",
      });
    }

    const order = await Order.findByOrderNumber(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al buscar pedido",
      error: error.message,
    });
  }
};
