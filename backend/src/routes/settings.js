const express = require("express");
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  reorderPaymentMethods,
  getShippingMethods,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  getExchangeRate,
  getExchangeRateHistory,
  updateExchangeRate,
  syncExchangeRateHistory,
  updateNewProductStatus,
  getPublicSettings,
} = require("../controllers/settingsController");
const zernioController = require("../controllers/zernioController");
const { protect, authorize } = require("../middleware/auth");

// Ruta pública para obtener configuraciones
router.get("/public", getPublicSettings);

// Rutas protegidas para admin
router.use(protect, authorize("admin"));

// Settings generales
router.get("/", getSettings);
router.put("/", updateSettings);

// Zernio Instagram Integration
router.get("/zernio", zernioController.getZernioConfig);
router.post("/zernio/connect", zernioController.connectZernio);
router.post("/zernio/disconnect", zernioController.disconnectZernio);
router.post("/zernio/sync", zernioController.syncZernio);
router.put("/zernio/configure", zernioController.updateZernioConfig);

// Payment Methods
router.get("/payment-methods", getPaymentMethods);
router.post("/payment-methods", addPaymentMethod);
router.put("/payment-methods/:methodId", updatePaymentMethod);
router.delete("/payment-methods/:methodId", deletePaymentMethod);
router.post("/payment-methods/reorder", reorderPaymentMethods);

// Shipping Methods
router.get("/shipping-methods", getShippingMethods);
router.post("/shipping-methods", addShippingMethod);
router.put("/shipping-methods/:methodId", updateShippingMethod);
router.delete("/shipping-methods/:methodId", deleteShippingMethod);

// Exchange Rate
router.get("/exchange-rate", getExchangeRate);
router.get("/exchange-rate/history", getExchangeRateHistory);
router.post("/exchange-rate/update", updateExchangeRate);
router.post("/exchange-rate/sync", syncExchangeRateHistory);

// Products - Update new status
router.post("/products/update-new-status", updateNewProductStatus);

module.exports = router;
