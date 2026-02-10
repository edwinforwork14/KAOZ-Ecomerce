const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getProductAnalytics,
  getInventoryReport,
  getCustomerAnalytics,
} = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/auth");

// Todas las rutas requieren autenticación y rol de admin
router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboardStats);
router.get("/products/:id", getProductAnalytics);
router.get("/inventory", getInventoryReport);
router.get("/customers", getCustomerAnalytics);

module.exports = router;
