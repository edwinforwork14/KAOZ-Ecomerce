const Settings = require("../models/Settings");
const ExchangeRate = require("../models/ExchangeRate");
const Product = require("../models/Product");

// ===== SETTINGS =====
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener configuraciones",
      error: error.message,
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.getSettings();

    const updateData = req.body;

    // Actualizar campos específicos
    if (updateData.currency) {
      settings.currency = { ...settings.currency, ...updateData.currency };
    }
    if (updateData.cashDiscount) {
      settings.cashDiscount = {
        ...settings.cashDiscount,
        ...updateData.cashDiscount,
      };
    }
    if (updateData.newProductDuration !== undefined) {
      settings.newProductDuration = updateData.newProductDuration;
    }
    if (updateData.orders) {
      settings.orders = { ...settings.orders, ...updateData.orders };
    }
    if (updateData.pricing) {
      settings.pricing = { ...settings.pricing, ...updateData.pricing };
    }
    if (updateData.whatsapp) {
      settings.whatsapp = { ...settings.whatsapp, ...updateData.whatsapp };
    }
    if (updateData.business) {
      settings.business = { ...settings.business, ...updateData.business };
    }

    await settings.save();

    res.json({
      success: true,
      message: "Configuraciones actualizadas exitosamente",
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar configuraciones",
      error: error.message,
    });
  }
};

// ===== PAYMENT METHODS =====
exports.getPaymentMethods = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const paymentMethods = settings.paymentMethods.sort(
      (a, b) => a.order - b.order
    );

    res.json({
      success: true,
      paymentMethods,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener métodos de pago",
      error: error.message,
    });
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const newMethod = req.body;

    // Generar ID único
    newMethod.id = newMethod.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");

    // Establecer orden
    const maxOrder = Math.max(
      ...settings.paymentMethods.map((m) => m.order),
      0
    );
    newMethod.order = maxOrder + 1;

    settings.paymentMethods.push(newMethod);
    await settings.save();

    res.status(201).json({
      success: true,
      message: "Método de pago agregado exitosamente",
      paymentMethod: newMethod,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al agregar método de pago",
      error: error.message,
    });
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const updateData = req.body;

    const settings = await Settings.getSettings();
    const methodIndex = settings.paymentMethods.findIndex(
      (m) => m.id === methodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Método de pago no encontrado",
      });
    }

    settings.paymentMethods[methodIndex] = {
      ...settings.paymentMethods[methodIndex].toObject(),
      ...updateData,
      id: methodId, // Mantener el ID original
    };

    await settings.save();

    res.json({
      success: true,
      message: "Método de pago actualizado exitosamente",
      paymentMethod: settings.paymentMethods[methodIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar método de pago",
      error: error.message,
    });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;

    const settings = await Settings.getSettings();
    const methodIndex = settings.paymentMethods.findIndex(
      (m) => m.id === methodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Método de pago no encontrado",
      });
    }

    settings.paymentMethods.splice(methodIndex, 1);
    await settings.save();

    res.json({
      success: true,
      message: "Método de pago eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar método de pago",
      error: error.message,
    });
  }
};

exports.reorderPaymentMethods = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    const settings = await Settings.getSettings();

    orderedIds.forEach((id, index) => {
      const method = settings.paymentMethods.find((m) => m.id === id);
      if (method) {
        method.order = index;
      }
    });

    await settings.save();

    res.json({
      success: true,
      message: "Orden actualizado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al reordenar métodos de pago",
      error: error.message,
    });
  }
};

// ===== SHIPPING METHODS =====
exports.getShippingMethods = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const shippingMethods = settings.shippingMethods.sort(
      (a, b) => a.order - b.order
    );

    res.json({
      success: true,
      shippingMethods,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener métodos de envío",
      error: error.message,
    });
  }
};

exports.addShippingMethod = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const newMethod = req.body;

    // Generar ID único
    newMethod.id = newMethod.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");

    // Establecer orden
    const maxOrder = Math.max(
      ...settings.shippingMethods.map((m) => m.order),
      0
    );
    newMethod.order = maxOrder + 1;

    settings.shippingMethods.push(newMethod);
    await settings.save();

    res.status(201).json({
      success: true,
      message: "Método de envío agregado exitosamente",
      shippingMethod: newMethod,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al agregar método de envío",
      error: error.message,
    });
  }
};

exports.updateShippingMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const updateData = req.body;

    const settings = await Settings.getSettings();
    const methodIndex = settings.shippingMethods.findIndex(
      (m) => m.id === methodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Método de envío no encontrado",
      });
    }

    settings.shippingMethods[methodIndex] = {
      ...settings.shippingMethods[methodIndex].toObject(),
      ...updateData,
      id: methodId,
    };

    await settings.save();

    res.json({
      success: true,
      message: "Método de envío actualizado exitosamente",
      shippingMethod: settings.shippingMethods[methodIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar método de envío",
      error: error.message,
    });
  }
};

exports.deleteShippingMethod = async (req, res) => {
  try {
    const { methodId } = req.params;

    const settings = await Settings.getSettings();
    const methodIndex = settings.shippingMethods.findIndex(
      (m) => m.id === methodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Método de envío no encontrado",
      });
    }

    settings.shippingMethods.splice(methodIndex, 1);
    await settings.save();

    res.json({
      success: true,
      message: "Método de envío eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar método de envío",
      error: error.message,
    });
  }
};

// ===== EXCHANGE RATE =====
exports.getExchangeRate = async (req, res) => {
  try {
    const currentRate = await ExchangeRate.getCurrentRate();

    res.json({
      success: true,
      rate: currentRate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener tasa de cambio",
      error: error.message,
    });
  }
};

exports.getExchangeRateHistory = async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const history = await ExchangeRate.getHistory(parseInt(limit));

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener historial de tasas",
      error: error.message,
    });
  }
};

exports.updateExchangeRate = async (req, res) => {
  try {
    const result = await ExchangeRate.updateFromAPI();

    if (result.success) {
      res.json({
        success: true,
        message: "Tasa de cambio actualizada",
        rate: result.current,
        changePercentage: result.changePercentage,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || "Error al actualizar tasa",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar tasa de cambio",
      error: error.message,
    });
  }
};

exports.syncExchangeRateHistory = async (req, res) => {
  try {
    const result = await ExchangeRate.syncHistory();

    if (result.success) {
      res.json({
        success: true,
        message: "Historial sincronizado",
        count: result.count,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || "Error al sincronizar historial",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al sincronizar historial",
      error: error.message,
    });
  }
};

// ===== NEW PRODUCT STATUS =====
exports.updateNewProductStatus = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const result = await Product.updateNewStatus(settings.newProductDuration);

    res.json({
      success: true,
      message: `Se actualizaron ${result.updated} productos`,
      updated: result.updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar estado de productos nuevos",
      error: error.message,
    });
  }
};

// ===== PUBLIC SETTINGS (sin autenticación) =====
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const exchangeRate = await ExchangeRate.getCurrentRate();

    // Solo devolver información pública
    res.json({
      success: true,
      settings: {
        currency: settings.currency,
        cashDiscount: {
          isActive: settings.cashDiscount.isActive,
          percentage: settings.cashDiscount.percentage,
          applicablePaymentMethods:
            settings.cashDiscount.applicablePaymentMethods,
        },
        paymentMethods: settings.paymentMethods
          .filter((m) => m.isActive)
          .sort((a, b) => a.order - b.order)
          .map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            icon: m.icon,
            instructions: m.instructions,
            accountData: m.accountData,
            requiresProof: m.requiresProof,
            hasDiscount: m.hasDiscount,
            discountPercentage: m.discountPercentage,
          })),
        shippingMethods: settings.shippingMethods
          .filter((m) => m.isActive)
          .sort((a, b) => a.order - b.order)
          .map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            icon: m.icon,
            type: m.type,
            additionalCost: m.additionalCost,
            freeFrom: m.freeFrom,
            estimatedTime: m.estimatedTime,
            requiresAddress: m.requiresAddress,
            pickupData: m.pickupData,
          })),
        business: settings.business,
        whatsapp: {
          number: settings.whatsapp?.number,
        },
      },
      exchangeRate: exchangeRate
        ? {
            date: exchangeRate.date,
            usd: exchangeRate.usd,
            eur: exchangeRate.eur,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener configuraciones",
      error: error.message,
    });
  }
};
