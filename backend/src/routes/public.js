const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getCategories,
  getCategory,
} = require("../controllers/publicController");
// Products - Rutas públicas
router.get("/products", getProducts);
router.get("/products/featured", getFeaturedProducts);
router.get("/products/:id", getProduct);

// Categories - Rutas públicas
router.get("/categories", getCategories);
router.get("/categories/:id", getCategory);

module.exports = router;
