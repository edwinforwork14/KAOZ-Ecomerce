const mongoose = require("mongoose");

const cartHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sessionId: String,
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: String,
    color: String,
    size: String,
    quantity: {
      type: Number,
      default: 1,
    },
    price: Number,
    originalPrice: Number,
    action: {
      type: String,
      enum: ["added", "removed", "updated", "cleared"],
      default: "added",
    },
  },
  {
    timestamps: true,
  }
);

cartHistorySchema.index({ product: 1, createdAt: -1 });
cartHistorySchema.index({ user: 1, createdAt: -1 });
cartHistorySchema.index({ sessionId: 1, createdAt: -1 });
cartHistorySchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("CartHistory", cartHistorySchema);
