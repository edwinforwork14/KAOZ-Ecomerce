const mongoose = require("mongoose");

const productViewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sessionId: String,
    ipAddress: String,
    userAgent: String,
    referrer: String,
    viewDuration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

productViewSchema.index({ product: 1, createdAt: -1 });
productViewSchema.index({ user: 1 });

module.exports = mongoose.model("ProductView", productViewSchema);
