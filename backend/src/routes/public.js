const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getCategories,
  getCategory,
} = require("../controllers/publicController");
const checkDeploymentActive = require("../middleware/deploymentCheck");

// Products - Rutas públicas
router.get("/products", checkDeploymentActive, getProducts);
router.get("/products/featured", checkDeploymentActive, getFeaturedProducts);
router.get("/products/:id", checkDeploymentActive, getProduct);

// Categories - Rutas públicas
router.get("/categories", checkDeploymentActive, getCategories);
router.get("/categories/:id", checkDeploymentActive, getCategory);

module.exports = router;
