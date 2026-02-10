const express = require("express");
const router = express.Router();
const {
  createOrder,
  updateOrderWhatsApp,
  getMyOrders,
  getOrder,
  searchOrder,
} = require("../controllers/orderController");
const { protect, optional } = require("../middleware/auth");

router.post("/", optional, createOrder);
router.put("/:orderId/whatsapp", updateOrderWhatsApp);
router.get("/my-orders", protect, getMyOrders);
router.get("/search", optional, searchOrder);
router.get("/:id", optional, getOrder);

module.exports = router;
