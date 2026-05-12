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
    
    const response = await fetch(
      "https://api.dolarvzla.com/public/exchange-rate",
      {
        method: "GET",
        headers: {
          "x-dolarvzla-key": "39bedc1d3c0c0b60fea4fc556a9936952de5673c00dd24c3b97b96fea2b1c2c1",
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (data && data.current) {
      const updatedRate = await prisma.exchangeRate.upsert({
        where: { date: data.current.date },
        update: {
          usd: parseFloat(data.current.usd),
          eur: parseFloat(data.current.eur),
        },
        create: {
          date: data.current.date,
          usd: parseFloat(data.current.usd),
          eur: parseFloat(data.current.eur),
        }
      });

      return {
        success: true,
        current: updatedRate
      };
    }

    return { success: false, message: "Estructura de datos inesperada o API desactualizada" };
  } catch (error) {
    console.error("❌ Error al actualizar tasa de cambio:", error.message);
    return { success: false, message: error.message };
  }
};

module.exports = { getCurrentRate, updateFromAPI };
