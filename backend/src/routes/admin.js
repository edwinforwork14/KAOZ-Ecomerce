const express = require("express");
const router = express.Router();
const {
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  uploadVariantImages,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  restoreOrder,
  getAllCustomers,
  getCustomerDetails,
  getCustomerCartHistory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  reorderCategories,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");
const { upload, processImage } = require("../middleware/upload");

// Todas las rutas requieren autenticación y rol de admin
router.use(protect, authorize("admin"));

// Products
router.post(
  "/products",
  upload.array("images", 10),
  processImage,
  createProduct
);
router.put(
  "/products/:id",
  upload.array("images", 10),
  processImage,
  updateProduct
);
router.delete("/products/:id", deleteProduct);

router.delete("/products/:id/images/:imageId", deleteProductImage);

router.post(
  "/products/:id/variants/:variantIndex/images",
  upload.array("images", 10),
  processImage,
  uploadVariantImages
);

// Orders
router.get("/orders", getAllOrders);
router.put("/orders/:id/status", updateOrderStatus);
router.delete("/orders/:id", deleteOrder);
router.post("/orders/:id/restore", restoreOrder);

// Customers
router.get("/customers", getAllCustomers);
router.get("/customers/:id", getCustomerDetails);
router.get("/customers/:customerId/cart-history", getCustomerCartHistory);

// Categories
router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);
router.post("/categories/reorder", reorderCategories);

module.exports = router;
