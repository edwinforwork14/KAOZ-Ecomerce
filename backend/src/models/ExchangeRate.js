const mongoose = require("mongoose");

const exchangeRateSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
    },
    usd: {
      type: Number,
      required: true,
    },
    eur: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Índice para búsqueda rápida por fecha
exchangeRateSchema.index({ date: -1 });

// Método estático para obtener la tasa actual
exchangeRateSchema.statics.getCurrentRate = async function () {
  const rate = await this.findOne().sort({ date: -1 });
  return rate;
};

// Método estático para obtener historial
exchangeRateSchema.statics.getHistory = async function (limit = 30) {
  const rates = await this.find().sort({ date: -1 }).limit(limit);
  return rates;
};

// Método estático para actualizar desde la API
exchangeRateSchema.statics.updateFromAPI = async function () {
  try {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(
      "https://api.dolarvzla.com/public/exchange-rate",
      {
        method: "GET",
        headers: {
          "x-dolarvzla-key":
            "39bedc1d3c0c0b60fea4fc556a9936952de5673c00dd24c3b97b96fea2b1c2c1",
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    // Verificación de seguridad por si la API responde con error de Key
    if (data.error) {
      return { success: false, message: data.error };
    }

    if (data && data.current) {
      // Usamos findOneAndUpdate con upsert: true para simplificar la lógica
      const updatedRate = await this.findOneAndUpdate(
        { date: data.current.date },
        {
          usd: data.current.usd,
          eur: data.current.eur,
        },
        { upsert: true, new: true },
      );

      return {
        success: true,
        current: updatedRate,
        changePercentage: data.changePercentage,
      };
    }

    return { success: false, message: "Estructura de datos inesperada" };
  } catch (error) {
    console.error("Error updating exchange rate:", error);
    return { success: false, message: error.message };
  }
};

// Método estático para sincronizar historial completo
exchangeRateSchema.statics.syncHistory = async function () {
  try {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(
      "https://api.dolarvzla.com/public/exchange-rate/list",
    );
    const data = await response.json();

    if (data && data.rates) {
      for (const rate of data.rates) {
        await this.findOneAndUpdate(
          { date: rate.date },
          { date: rate.date, usd: rate.usd, eur: rate.eur },
          { upsert: true },
        );
      }
      return { success: true, count: data.rates.length };
    }

    return { success: false, message: "No data received from API" };
  } catch (error) {
    console.error("Error syncing exchange rate history:", error);
    return { success: false, message: error.message };
  }
};

module.exports = mongoose.model("ExchangeRate", exchangeRateSchema);
