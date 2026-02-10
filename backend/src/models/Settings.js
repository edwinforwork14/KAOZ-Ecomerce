const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  icon: String,
  instructions: String,
  accountData: {
    bankName: String,
    accountNumber: String,
    accountHolder: String,
    identification: String,
    phone: String,
    email: String,
    walletAddress: String,
    additionalInfo: String,
  },
  requiresProof: {
    type: Boolean,
    default: false,
  },
  whatsappMessage: String,
  hasDiscount: {
    type: Boolean,
    default: false,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  order: {
    type: Number,
    default: 0,
  },
});

const shippingMethodSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  icon: String,
  type: {
    type: String,
    enum: ["delivery", "pickup", "standard"],
    default: "standard",
  },
  additionalCost: {
    type: Number,
    default: 0,
  },
  freeFrom: {
    type: Number,
    default: 0,
  },
  estimatedTime: String,
  requiresAddress: {
    type: Boolean,
    default: true,
  },
  pickupData: {
    address: String,
    schedule: String,
    phone: String,
    mapUrl: String,
  },
  whatsappMessage: String,
  order: {
    type: Number,
    default: 0,
  },
});

const settingsSchema = new mongoose.Schema(
  {
    currency: {
      symbol: {
        type: String,
        default: "€",
        enum: ["€", "$", "Bs"],
      },
      code: {
        type: String,
        default: "EUR",
        enum: ["EUR", "USD", "VES"],
      },
      showBsPrice: {
        type: Boolean,
        default: true,
      },
    },

    cashDiscount: {
      isActive: {
        type: Boolean,
        default: false,
      },
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      applicablePaymentMethods: [
        {
          type: String,
        },
      ],
    },

    newProductDuration: {
      type: Number,
      default: 30,
      min: 1,
      max: 365,
    },

    paymentMethods: [paymentMethodSchema],

    shippingMethods: [shippingMethodSchema],

    orders: {
      allowDelete: {
        type: Boolean,
        default: false,
      },
      prefix: {
        type: String,
        default: "YF",
      },
    },

    pricing: {
      mode: {
        type: String,
        enum: ["fixed", "percentage"],
        default: "fixed",
      },
      markupPercentage: {
        type: Number,
        default: 0,
      },
      discountPercentage: {
        type: Number,
        default: 0,
      },
    },

    whatsapp: {
      number: String,
      defaultMessage: String,
    },

    business: {
      name: String,
      slogan: String,
      email: String,
      phone: String,
      address: String,
    },
  },
  {
    timestamps: true,
  }
);

settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      paymentMethods: [
        {
          id: "pago_movil",
          name: "Pago Móvil / Transferencia",
          description: "Pago mediante transferencia bancaria o pago móvil",
          isActive: true,
          requiresProof: true,
          whatsappMessage:
            "📱 *PAGO MÓVIL / TRANSFERENCIA*\n\nPor favor envía el capture del pago a este chat para confirmar tu pedido.",
          order: 1,
        },
        {
          id: "zelle",
          name: "Zelle",
          description: "Pago mediante Zelle",
          isActive: true,
          requiresProof: true,
          whatsappMessage:
            "💵 *PAGO CON ZELLE*\n\nPor favor envía el comprobante de Zelle a este chat para confirmar tu pedido.",
          order: 2,
        },
        {
          id: "binance",
          name: "Binance Pay / USDT",
          description: "Pago mediante Binance o criptomonedas",
          isActive: true,
          requiresProof: true,
          whatsappMessage:
            "🪙 *PAGO CON BINANCE/USDT*\n\nPor favor envía el comprobante de la transacción a este chat para confirmar tu pedido.",
          order: 3,
        },
        {
          id: "efectivo_divisas",
          name: "Efectivo (Divisas)",
          description: "Pago en efectivo con divisas al momento de la entrega",
          isActive: true,
          requiresProof: false,
          hasDiscount: true,
          discountPercentage: 5,
          whatsappMessage:
            "💰 *PAGO EN EFECTIVO (DIVISAS)*\n\n¡Excelente! Has elegido pagar en efectivo. Recuerda tener el monto exacto al momento de la entrega.",
          order: 4,
        },
        {
          id: "efectivo_bs",
          name: "Efectivo (Bolívares)",
          description:
            "Pago en efectivo con bolívares al momento de la entrega",
          isActive: true,
          requiresProof: false,
          whatsappMessage:
            "💵 *PAGO EN EFECTIVO (BOLÍVARES)*\n\nRecuerda tener el monto exacto en bolívares al momento de la entrega.",
          order: 5,
        },
      ],
      shippingMethods: [
        {
          id: "delivery",
          name: "Delivery",
          description: "Entrega a domicilio",
          isActive: true,
          type: "delivery",
          additionalCost: 0,
          requiresAddress: true,
          estimatedTime: "24-48 horas",
          whatsappMessage:
            "🚚 *DELIVERY*\n\nTu pedido será entregado en la dirección indicada.",
          order: 1,
        },
        {
          id: "pickup",
          name: "Retiro en Tienda",
          description: "Recoge tu pedido en nuestra tienda",
          isActive: true,
          type: "pickup",
          additionalCost: 0,
          requiresAddress: false,
          estimatedTime: "Disponible en 24 horas",
          pickupData: {
            address: "Tu dirección aquí",
            schedule: "Lunes a Viernes: 9am - 6pm",
            phone: "+58 412 223 4188",
          },
          whatsappMessage:
            "🏪 *RETIRO EN TIENDA*\n\nTu pedido estará listo para retirar. Te notificaremos cuando esté disponible.",
          order: 2,
        },
      ],
    });
  }
  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
