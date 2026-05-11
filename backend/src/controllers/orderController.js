const { prisma } = require("../config/database");
const Settings = require("../services/settingsService");
const ExchangeRate = require("../services/exchangeRateService");

const generateOrderNumber = async (prefix = "YF") => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${timestamp}${random}`;
};

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

    const where = req.user
      ? { userId: req.user.id }
      : { sessionId: req.headers["x-session-id"] };

    const cart = await prisma.cart.findUnique({
      where: req.user ? { userId: req.user.id } : { sessionId: req.headers["x-session-id"] },
      include: {
        items: true
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "El carrito está vacío",
      });
    }

    // Verificar stock de todos los productos y recolectar información
    const itemsToCreate = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          variants: {
            where: { color: item.color || "N/A" },
            include: {
              sizes: { where: { size: item.size } }
            }
          }
        }
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Producto no encontrado: ${item.name}`,
        });
      }

      const variant = product.variants[0];
      const sizeStock = variant?.sizes[0];

      if (!sizeStock || sizeStock.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${product.name} - ${item.color} - ${item.size}`,
        });
      }

      itemsToCreate.push({
        productId: item.productId,
        name: item.name,
        image: item.image,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      });

      subtotal += item.price * item.quantity;
    }

    // Buscar métodos seleccionados
    const selectedPaymentMethod = settings.paymentMethods?.find((m) => m.id === paymentMethod);
    const selectedShippingMethod = settings.shippingMethods?.find((m) => m.id === shippingMethod);

    // Calcular costo de envío
    let shippingCost = 0;
    if (selectedShippingMethod) {
      if (selectedShippingMethod.freeFrom > 0 && subtotal >= selectedShippingMethod.freeFrom) {
        shippingCost = 0;
      } else {
        shippingCost = selectedShippingMethod.additionalCost || 0;
      }
    }

    // Calcular total
    let total = subtotal + shippingCost;

    // Calcular total en bolívares
    let totalInBs = null;
    if (exchangeRate) {
      const rate = settings.currency?.code === "EUR" ? exchangeRate.eur : exchangeRate.usd;
      totalInBs = total * rate;
    }

    const orderNumber = await generateOrderNumber(settings.orders?.prefix || "YF");

    // Transacción para crear la orden y reducir el stock
    const order = await prisma.$transaction(async (tx) => {
      // 1. Crear la orden
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: req.user?.id,
          customerInfo,
          shippingMethod: selectedShippingMethod ? {
            id: selectedShippingMethod.id,
            name: selectedShippingMethod.name,
            type: selectedShippingMethod.type,
            cost: shippingCost,
          } : null,
          shippingAddress: selectedShippingMethod?.requiresAddress ? shippingAddress : null,
          subtotal,
          shipping: shippingCost,
          total,
          totalInBs,
          paymentMethod: selectedPaymentMethod ? {
            id: selectedPaymentMethod.id,
            name: selectedPaymentMethod.name,
            requiresProof: selectedPaymentMethod.requiresProof,
          } : { id: paymentMethod, name: paymentMethod },
          notes,
          statusHistory: [
            {
              status: "pending",
              note: "Pedido creado",
              date: new Date(),
            },
          ],
          items: {
            create: itemsToCreate
          }
        },
        include: {
          items: true
        }
      });

      // 2. Reducir stock
      for (const item of itemsToCreate) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            variants: {
              where: { color: item.color || "N/A" },
              include: {
                sizes: { where: { size: item.size } }
              }
            }
          }
        });

        const sizeId = product.variants[0].sizes[0].id;

        await tx.productSize.update({
          where: { id: sizeId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // 3. Vaciar carrito
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: "Pedido creado exitosamente",
      order,
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

    // Nota: El esquema actual no tiene un campo 'whatsappSent'. 
    // Podrías agregarlo en el futuro. Por ahora solo confirmamos la acción.
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    res.json({
      success: true,
      message: "WhatsApp registrado (lógica de base de datos pendiente de esquema)",
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

    const orders = await prisma.order.findMany({
      where: {
        userId: req.user.id,
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

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
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!order || order.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    // Verificar que sea el dueño o admin
    if (
      req.user &&
      order.userId &&
      order.userId !== req.user.id &&
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

exports.searchOrder = async (req, res) => {
  try {
    const { orderNumber } = req.query;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Número de orden requerido",
      });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order || order.isDeleted) {
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
