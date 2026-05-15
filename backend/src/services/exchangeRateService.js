const { prisma } = require("../config/database");

const getCurrentRate = async () => {
  try {
    return await prisma.exchangeRate.findFirst({
      orderBy: { date: 'desc' }
    });
  } catch (error) {
    console.error("Error al obtener tasa actual:", error.message);
    return null;
  }
};

const updateFromAPI = async (manualRate = null) => {
  try {
    // Si se proporciona una tasa manual, usarla directamente
    if (manualRate && manualRate.usd) {
      const updatedRate = await prisma.exchangeRate.upsert({
        where: { date: new Date().toISOString().split('T')[0] },
        update: {
          usd: parseFloat(manualRate.usd),
          eur: parseFloat(manualRate.eur || manualRate.usd),
        },
        create: {
          date: new Date().toISOString().split('T')[0],
          usd: parseFloat(manualRate.usd),
          eur: parseFloat(manualRate.eur || manualRate.usd),
        }
      });
      return { success: true, current: updatedRate, manual: true };
    }

    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    console.log("📡 [EXCHANGE SERVICE] Consultando ve.dolarapi.com...");
    
    const [usdRes, eurRes] = await Promise.all([
      fetch("https://ve.dolarapi.com/v1/dolares"),
      fetch("https://ve.dolarapi.com/v1/euros")
    ]);

    const usdData = await usdRes.json();
    const eurData = await eurRes.json();

    // Buscar la tasa oficial (BCV) en los arrays
    const bcvUsd = usdData.find(d => d.fuente === "oficial");
    const bcvEur = eurData.find(d => d.fuente === "oficial");

    if (bcvUsd) {
      const dateStr = bcvUsd.fechaActualizacion.split('T')[0];
      const usdValue = parseFloat(bcvUsd.promedio);
      const eurValue = bcvEur ? parseFloat(bcvEur.promedio) : usdValue;

      const updatedRate = await prisma.exchangeRate.upsert({
        where: { date: dateStr },
        update: {
          usd: usdValue,
          eur: eurValue,
        },
        create: {
          date: dateStr,
          usd: usdValue,
          eur: eurValue,
        }
      });

      return {
        success: true,
        current: updatedRate
      };
    }

    return { success: false, message: "No se encontró la tasa oficial en el proveedor" };
  } catch (error) {
    console.error("❌ Error al actualizar tasa de cambio:", error.message);
    return { success: false, message: error.message };
  }
};

module.exports = { getCurrentRate, updateFromAPI };
