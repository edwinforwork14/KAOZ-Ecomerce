const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ================= PRODUCTS =================
exports.getProducts = async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      sort = "-createdAt",
      page = 1,
      limit = 12,
      featured,
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 12, 1), 200);

    const query = { isActive: true };

    // ===== CATEGORY =====
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.json({
          success: true,
          count: 0,
          total: 0,
          totalPages: 0,
          currentPage: pageNum,
          products: [],
        });
      }
      query.category = category;
    }

    // ===== FEATURED =====
    if (featured === "true" || featured === "1") {
      query.isFeatured = true;
    }

    // ===== PRICE =====
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // ===== SEARCH (MEJORADA PARA BÚSQUEDA PARCIAL) =====
    if (search && search.trim()) {
      const term = escapeRegExp(search.trim());
      const regex = new RegExp(term, "i");

      query.$or = [
        { name: regex },
        { description: regex },
        { brand: regex },
        { tags: regex },
        { "features.name": regex },
        { "features.value": regex },
        { "variants.color": regex },
      ];
    }

    // ===== SORT (CORREGIDO) =====
    let sortQuery = {};

    switch (sort) {
      case "featured":
        sortQuery = { isFeatured: -1, createdAt: -1 };
        break;
      case "-createdAt":
        sortQuery = { createdAt: -1 };
        break;
      case "createdAt":
        sortQuery = { createdAt: 1 };
        break;
      case "price":
        sortQuery = { price: 1 };
        break;
      case "-price":
        sortQuery = { price: -1 };
        break;
      case "name":
        sortQuery = { name: 1 };
        break;
      case "-name":
        sortQuery = { name: -1 };
        break;
      case "rating":
        sortQuery = { rating: -1 };
        break;
      case "-rating":
        sortQuery = { rating: 1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("category")
        .sort(sortQuery)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: products.length,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limitNum),
      currentPage: pageNum,
      products,
    });
  } catch (error) {
    console.error("Error en getProducts:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener productos",
      error: error.message,
    });
  }
};

// ================= SINGLE PRODUCT =================
exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "ID de producto inválido",
      });
    }

    const product = await Product.findOne({
      _id: id,
      isActive: true,
    }).populate("category");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error("Error en getProduct:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener producto",
      error: error.message,
    });
  }
};

// ================= FEATURED =================
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      isFeatured: true,
    })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error en getFeaturedProducts:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener productos destacados",
      error: error.message,
    });
  }
};

// ================= CATEGORIES =================
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    const withCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({
          category: cat._id,
          isActive: true,
        });

        return {
          ...cat,
          productCount: count,
        };
      })
    );

    res.json({
      success: true,
      count: withCount.length,
      categories: withCount,
    });
  } catch (error) {
    console.error("Error en getCategories:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener categorías",
      error: error.message,
    });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "ID de categoría inválido",
      });
    }

    const category = await Category.findOne({
      _id: id,
      isActive: true,
    }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    const productCount = await Product.countDocuments({
      category: id,
      isActive: true,
    });

    res.json({
      success: true,
      category: {
        ...category,
        productCount,
      },
    });
  } catch (error) {
    console.error("Error en getCategory:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener categoría",
      error: error.message,
    });
  }
};
