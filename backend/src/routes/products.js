const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getFilterOptions, // NUEVO
} = require("../controllers/productController");
const { optional } = require("../middleware/auth");

// NUEVO: Endpoint para obtener opciones de filtro de TODOS los productos
// Debe ir ANTES de /:id para que no sea capturado por ese patrón
router.get("/filter-options", getFilterOptions);

router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/:id", optional, getProduct);

module.exports = router;
