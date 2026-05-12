const { prisma } = require("../config/database");
const Settings = require("../services/settingsService");
const ExchangeRate = require("../services/exchangeRateService");

// ===== SETTINGS =====
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener configuraciones", error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const updateData = req.body;

    const settings = await prisma.settings.update({
      where: { id: "global" },
      data: updateData
    });

    res.json({ success: true, message: "Configuraciones actualizadas", settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar", error: error.message });
  }
};

// ===== PAYMENT METHODS =====
exports.getPaymentMethods = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const paymentMethods = (settings.paymentMethods || []).sort((a, b) => a.order - b.order);
    res.json({ success: true, paymentMethods });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const newMethod = req.body;
    newMethod.id = newMethod.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    
    const methods = [...(settings.paymentMethods || []), newMethod];
    await prisma.settings.update({
      where: { id: "global" },
      data: { paymentMethods: methods }
    });

    res.status(201).json({ success: true, paymentMethod: newMethod });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const updateData = req.body;
    const settings = await Settings.getSettings();
    
    const methods = (settings.paymentMethods || []).map(m => 
      m.id === methodId ? { ...m, ...updateData, id: methodId } : m
    );

    await prisma.settings.update({
      where: { id: "global" },
      data: { paymentMethods: methods }
    });

    res.json({ success: true, message: "Método actualizado" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const settings = await Settings.getSettings();
    
    const methods = (settings.paymentMethods || []).filter(m => m.id !== methodId);

    await prisma.settings.update({
      where: { id: "global" },
      data: { paymentMethods: methods }
    });

    res.json({ success: true, message: "Método eliminado" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reorderPaymentMethods = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    const settings = await Settings.getSettings();
    
    const methods = [...(settings.paymentMethods || [])];
    const orderedMethods = orderedIds.map(id => methods.find(m => m.id === id)).filter(Boolean);

    await prisma.settings.update({
      where: { id: "global" },
      data: { paymentMethods: orderedMethods }
    });

    res.json({ success: true, message: "Orden actualizado" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== SHIPPING METHODS =====
exports.getShippingMethods = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const shippingMethods = (settings.shippingMethods || []).sort((a, b) => a.order - b.order);
    res.json({ success: true, shippingMethods });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addShippingMethod = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const newMethod = req.body;
    newMethod.id = newMethod.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    
    const methods = [...(settings.shippingMethods || []), newMethod];
    await prisma.settings.update({
      where: { id: "global" },
      data: { shippingMethods: methods }
    });

    res.status(201).json({ success: true, shippingMethod: newMethod });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateShippingMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const updateData = req.body;
    const settings = await Settings.getSettings();
    
    const methods = (settings.shippingMethods || []).map(m => 
      m.id === methodId ? { ...m, ...updateData, id: methodId } : m
    );

    await prisma.settings.update({
      where: { id: "global" },
      data: { shippingMethods: methods }
    });

    res.json({ success: true, message: "Método de envío actualizado" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteShippingMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const settings = await Settings.getSettings();
    
    const methods = (settings.shippingMethods || []).filter(m => m.id !== methodId);

    await prisma.settings.update({
      where: { id: "global" },
      data: { shippingMethods: methods }
    });

    res.json({ success: true, message: "Método de envío eliminado" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== EXCHANGE RATE =====
exports.getExchangeRate = async (req, res) => {
  try {
    const rate = await ExchangeRate.getCurrentRate();
    res.json({ success: true, rate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateExchangeRate = async (req, res) => {
  try {
    const { usd, eur } = req.body;
    const result = await ExchangeRate.updateFromAPI(usd ? { usd, eur } : null);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getExchangeRateHistory = async (req, res) => {
  try {
    const history = await prisma.exchangeRate.findMany({
      orderBy: { date: 'desc' },
      take: 30
    });
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.syncExchangeRateHistory = async (req, res) => {
  try {
    const result = await ExchangeRate.updateFromAPI();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateNewProductStatus = async (req, res) => {
  try {
    const { updateNewStatus } = require("../services/productService");
    const settings = await Settings.getSettings();
    const result = await updateNewStatus(settings.newProductDuration);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== PUBLIC SETTINGS =====
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings() || {
      currency: { symbol: "$", code: "USD", showBsPrice: true },
      paymentMethods: [],
      shippingMethods: [],
      business: {},
      whatsapp: ""
    };
    const exchangeRate = await ExchangeRate.getCurrentRate();

    console.log("🌐 [SETTINGS CONTROLLER] Generando respuesta pública...");
    const paymentMethods = (settings.paymentMethods || []).filter(m => m.isActive);
    const shippingMethods = (settings.shippingMethods || []).filter(m => m.isActive);

    const response = {
      success: true,
      settings: {
        currency: settings.currency || { symbol: "$", code: "USD" },
        cashDiscount: settings.cashDiscount || 0,
        paymentMethods: paymentMethods.length > 0 ? paymentMethods : [
          { id: "whatsapp", name: "WhatsApp Pay (Default)", isActive: true, icon: "whatsapp" }
        ],
        shippingMethods: shippingMethods.length > 0 ? shippingMethods : [
          { id: "pickup", name: "Retiro en Tienda (Default)", isActive: true, type: "pickup", additionalCost: 0 }
        ],
        business: settings.business || {},
        whatsapp: settings.whatsapp || ""
      },
      exchangeRate: exchangeRate || { usd: 1, eur: 1 }
    };

    console.log("📤 [SETTINGS CONTROLLER] Enviando métodos:", {
      payment: response.settings.paymentMethods.length,
      shipping: response.settings.shippingMethods.length
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Error en getPublicSettings:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Error al cargar configuraciones",
      error: error.message 
    });
  }
};
