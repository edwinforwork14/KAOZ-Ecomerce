const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: String,
  image: String,
  color: String,
  size: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  originalPrice: Number,
  subtotal: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerInfo: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },
    // Método de envío seleccionado
    shippingMethod: {
      id: String,
      name: String,
      type: {
        type: String,
        enum: ["delivery", "pickup", "standard"],
      },
      cost: {
        type: Number,
        default: 0,
      },
    },
    // Dirección de envío (solo si requiere dirección)
    shippingAddress: {
      address: String,
      city: String,
      state: String,
      zipCode: String,
      reference: String,
    },
    // Datos de pickup (si aplica)
    pickupInfo: {
      scheduledDate: Date,
      scheduledTime: String,
      notes: String,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    shipping: {
      type: Number,
      default: 0,
    },
    // Descuento aplicado
    discount: {
      type: {
        type: String,
        enum: ["percentage", "fixed", "payment_method"],
      },
      value: Number,
      amount: Number,
      description: String,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    // Moneda y tasa de cambio al momento del pedido
    currency: {
      symbol: {
        type: String,
        default: "€",
      },
      code: {
        type: String,
        default: "EUR",
      },
      exchangeRate: {
        usd: Number,
        eur: Number,
      },
    },
    // Total en bolívares al momento del pedido
    totalInBs: Number,
    // Método de pago
    paymentMethod: {
      id: String,
      name: String,
      requiresProof: Boolean,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    // Comprobante de pago
    paymentProof: {
      url: String,
      uploadedAt: Date,
      verified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    adminNotes: {
      type: String,
      maxlength: 1000,
    },
    whatsappSent: {
      type: Boolean,
      default: false,
    },
    whatsappSentAt: Date,
    statusHistory: [
      {
        status: String,
        note: String,
        date: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Información de eliminación (soft delete)
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletionReason: String,
  },
  {
    timestamps: true,
  }
);

// Índices
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ "customerInfo.email": 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ isDeleted: 1 });

// Virtual para calcular el ahorro total
orderSchema.virtual("totalSavings").get(function () {
  let savings = 0;
  this.items.forEach((item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      savings += (item.originalPrice - item.price) * item.quantity;
    }
  });
  if (this.discount && this.discount.amount) {
    savings += this.discount.amount;
  }
  return savings;
});

// Método estático para generar número de orden
orderSchema.statics.generateOrderNumber = async function (prefix = "YF") {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${timestamp}${random}`;
};

// Método estático para buscar por número de orden
orderSchema.statics.findByOrderNumber = async function (orderNumber) {
  return this.findOne({ orderNumber, isDeleted: { $ne: true } });
};

// Método estático para búsqueda avanzada
orderSchema.statics.search = async function (query) {
  const {
    search,
    status,
    paymentStatus,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    includeDeleted = false,
  } = query;

  const filter = {};

  if (!includeDeleted) {
    // Use $ne: true to include documents where isDeleted is false, null, or doesn't exist
    filter.isDeleted = { $ne: true };
  }

  if (search) {
    filter.$or = [
      { orderNumber: new RegExp(search, "i") },
      { "customerInfo.firstName": new RegExp(search, "i") },
      { "customerInfo.lastName": new RegExp(search, "i") },
      { "customerInfo.email": new RegExp(search, "i") },
      { "customerInfo.phone": new RegExp(search, "i") },
    ];
  }

  // Valid status values - ignore "undefined", "null", "all", empty strings
  const validOrderStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];

  if (status && validOrderStatuses.includes(status)) {
    filter.orderStatus = status;
  }
  if (paymentStatus && validPaymentStatuses.includes(paymentStatus)) {
    filter.paymentStatus = paymentStatus;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const orders = await this.find(filter)
    .populate("user", "firstName lastName email")
    .populate("items.product")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await this.countDocuments(filter);

  return {
    orders,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
  };
};

// Método para soft delete
orderSchema.methods.softDelete = async function (userId, reason) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.deletionReason = reason;
  await this.save();
};

// Método para restaurar
orderSchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.deletionReason = undefined;
  await this.save();
};

module.exports = mongoose.model("Order", orderSchema);
