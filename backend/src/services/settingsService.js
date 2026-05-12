const { prisma } = require("../config/database");

const getSettings = async () => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "global" }
    });

    console.log("📊 [SETTINGS SERVICE] Raw DB Settings:", settings ? "Existe" : "Null");
    
    if (settings) {
      // Forzar conversión a array si es necesario y contar
      const pMethods = Array.isArray(settings.paymentMethods) ? settings.paymentMethods : [];
      const sMethods = Array.isArray(settings.shippingMethods) ? settings.shippingMethods : [];
      
      console.log(`✅ [SETTINGS SERVICE] Métodos en DB: Payment=${pMethods.length}, Shipping=${sMethods.length}`);

      if (pMethods.length === 0 || sMethods.length === 0) {
        console.log("🛠️ [SETTINGS SERVICE] Detectados métodos vacíos. Auto-reparando...");
        try {
          const repaired = await prisma.settings.update({
            where: { id: "global" },
            data: {
              paymentMethods: pMethods.length > 0 ? pMethods : [
                { id: "whatsapp", name: "WhatsApp Pay / Transferencia", isActive: true, icon: "whatsapp", order: 1 },
                { id: "zelle", name: "Zelle", isActive: true, icon: "zelle", order: 2 }
              ],
              shippingMethods: sMethods.length > 0 ? sMethods : [
                { id: "standard", name: "Envío Estándar", isActive: true, type: "standard", additionalCost: 5, order: 1 },
                { id: "pickup", name: "Retiro en Tienda", isActive: true, type: "pickup", additionalCost: 0, order: 2 }
              ]
            }
          });
          return repaired;
        } catch (updateErr) {
          console.error("❌ Error en auto-reparación:", updateErr.message);
        }
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
