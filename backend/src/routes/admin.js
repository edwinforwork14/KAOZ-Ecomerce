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
  reorderCategories,
  getAllExpenses,
  createExpense,
  deleteExpense,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/adminController");
const {
  initSession,
  uploadImages,
  getSession,
  updateSessionDrafts,
  publishSession,
} = require("../controllers/bulkProductController");
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

router.post(
  "/temp-upload",
  upload.array("images", 10),
  processImage,
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No se subieron archivos" });
    }
    // processImage ya subió los archivos a Supabase y añadió .url a cada file
    res.json({
      success: true,
      url: req.files[0].url,
      urls: req.files.map(f => f.url)
    });
  }
);
router.put(
  "/products/:id",
  upload.array("images", 10),
  processImage,
  updateProduct
);
router.delete("/products/:id", deleteProduct);

// Bulk Products
router.post("/bulk/init", initSession);
router.get("/bulk/:id", getSession);
router.post("/bulk/:sessionId/upload", upload.array("images", 50), uploadImages);
router.patch("/bulk/:id/drafts", updateSessionDrafts);
router.post("/bulk/:id/publish", publishSession);

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

// Expenses
router.get("/expenses", getAllExpenses);
router.post("/expenses", createExpense);
router.delete("/expenses/:id", deleteExpense);

module.exports = router;
