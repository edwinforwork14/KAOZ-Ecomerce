const { prisma } = require("../config/database");

const getSettings = async () => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: "global" }
    });

    if (!settings) {
      // Crear configuración inicial si no existe
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
            { id: "zelle", name: "Zelle", isActive: true },
            { id: "pago_movil", name: "Pago Móvil", isActive: true }
          ],
          shippingMethods: [
            { id: "delivery", name: "Delivery", isActive: true },
            { id: "pickup", name: "Pickup", isActive: true }
          ]
        }
      });
    }
    return settings;
  } catch (error) {
    console.error("❌ Error al obtener configuraciones en Prisma:", error.message);
    return {
      newProductDuration: 30,
      currency: { symbol: "$", code: "USD" }
    };
  }
};

module.exports = { getSettings };
