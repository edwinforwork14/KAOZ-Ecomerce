const { prisma } = require("../config/database");

const getSettings = async () => {
  try {
    console.log("🔍 [SETTINGS SERVICE] Buscando configuración 'global'...");
    let settings = await prisma.settings.findUnique({
      where: { id: "global" }
    });

    console.log("📊 [SETTINGS SERVICE] Resultado de DB:", settings ? "Encontrado" : "No encontrado (null)");
    
    if (settings) {
      console.log("✅ [SETTINGS SERVICE] Métodos encontrados:", {
        payment: settings.paymentMethods?.length || 0,
        shipping: settings.shippingMethods?.length || 0
      });

      // Auto-reparar si los métodos están vacíos (esto pasa si se creó el registro incompleto)
      if (!settings.paymentMethods || settings.paymentMethods.length === 0 || 
          !settings.shippingMethods || settings.shippingMethods.length === 0) {
        console.log("🛠️ [SETTINGS SERVICE] Detectados métodos vacíos. Auto-reparando...");
        settings = await prisma.settings.update({
          where: { id: "global" },
          data: {
            paymentMethods: settings.paymentMethods?.length ? settings.paymentMethods : [
              { id: "whatsapp", name: "WhatsApp Pay / Transferencia", isActive: true, icon: "whatsapp" },
              { id: "zelle", name: "Zelle", isActive: true, icon: "zelle" }
            ],
            shippingMethods: settings.shippingMethods?.length ? settings.shippingMethods : [
              { id: "standard", name: "Envío Estándar", isActive: true, type: "standard", additionalCost: 5 },
              { id: "pickup", name: "Retiro en Tienda", isActive: true, type: "pickup", additionalCost: 0 }
            ]
          }
        });
      }
    }

    if (!settings) {
      console.log("⚠️ No se encontró la configuración 'global'. Creándola...");
      try {
        settings = await prisma.settings.create({
          data: {
            id: "global",
            newProductDuration: 30,
            currency: {
              symbol: "$",
              code: "USD",
              showBsPrice: true
            },
            paymentMethods: [
              { id: "whatsapp", name: "WhatsApp Pay / Transferencia", isActive: true, icon: "whatsapp" },
              { id: "zelle", name: "Zelle", isActive: true, icon: "zelle" }
            ],
            shippingMethods: [
              { id: "standard", name: "Envío Estándar", isActive: true, type: "standard", additionalCost: 5 },
              { id: "pickup", name: "Retiro en Tienda", isActive: true, type: "pickup", additionalCost: 0 }
            ]
          }
        });
      } catch (createError) {
        console.error("❌ Error al crear configuración inicial:", createError.message);
      }
    }
    return settings;
  } catch (error) {
    console.error("❌ Error crítico al obtener configuraciones:", error.message);
    // Fallback ROBUSTO para que el sitio no se vea vacío si la DB falla
    return {
      id: "fallback",
      newProductDuration: 30,
      currency: { symbol: "$", code: "USD", showBsPrice: true },
      paymentMethods: [
        { id: "whatsapp", name: "WhatsApp (Fallback)", isActive: true, icon: "whatsapp" }
      ],
      shippingMethods: [
        { id: "pickup", name: "Retiro en Tienda (Fallback)", isActive: true, type: "pickup" }
      ]
    };
  }
};

module.exports = { getSettings };
