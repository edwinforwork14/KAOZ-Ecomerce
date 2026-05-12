const { prisma } = require("../config/database");
const Settings = require("../services/settingsService");
const ExchangeRate = require("../services/exchangeRateService");
const OrderService = require("../services/orderService");

const createOrder = async (req, res) => {
  try {
    const {
      customerInfo,
      shippingAddress,
      shippingMethod,
      paymentMethod,
      notes,
    } = req.body;

    // Basic validation
    if (!customerInfo || !customerInfo.email || !customerInfo.firstName) {
      return res.status(400).json({
        success: false,
        message: "Información del cliente incompleta",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Método de pago no especificado",
      });
    }

    const sessionId = req.headers["x-session-id"];
    const userId = req.user?.id;

    const result = await OrderService.createOrder({
      userId,
      sessionId,
      customerInfo,
      shippingAddress,
      shippingMethod,
      paymentMethod,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Pedido creado exitosamente",
      ...result
    });
  } catch (error) {
    console.error("Error creating order:", error);
    
    // Distinguish between business logic errors and system errors
    const statusCode = error.message.includes("carrito está vacío") || 
                       error.message.includes("Stock insuficiente") ||
                       error.message.includes("no encontrada") 
                       ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || "Error al crear pedido",
    });
  }
};


const updateOrderWhatsApp = async (req, res) => {
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

const getMyOrders = async (req, res) => {
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

const getOrder = async (req, res) => {
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

const searchOrder = async (req, res) => {
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

module.exports = {
  createOrder,
  updateOrderWhatsApp,
  getMyOrders,
  getOrder,
  searchOrder,
};
