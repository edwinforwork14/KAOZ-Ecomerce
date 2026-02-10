const express = require("express");
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartHistory,
  syncCart,
} = require("../controllers/cartController");
const { optional, protect } = require("../middleware/auth");

router.get("/", optional, getCart);
router.post("/add", optional, addToCart);
router.put("/item/:itemId", optional, updateCartItem);
router.delete("/item/:itemId", optional, removeFromCart);
router.delete("/clear", optional, clearCart);
router.get("/history", optional, getCartHistory);
router.post("/sync", protect, syncCart);

module.exports = router;
