const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ================= FILTER OPTIONS (NUEVO) =================
/**
 * Obtiene las opciones de filtro disponibles para TODOS los productos
 * (o filtrado por categoría si se proporciona)
 * Esto permite que los filtros sean consistentes independientemente de la paginación
 */
exports.getFilterOptions = async (req, res) => {
  try {
    const { category, search } = req.query;

    // Query base - solo productos activos
    const matchStage = { isActive: true };

    // Filtrar por categoría si se proporciona
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.json({
          success: true,
          filterOptions: {
            brands: [],
            colors: [],
            priceRange: { min: 0, max: 1000 },
            totalProducts: 0,
          },
        });
      }
      matchStage.category = new mongoose.Types.ObjectId(category);
    }

    // Si hay búsqueda, aplicarla también
    if (search && search.trim()) {
      const term = escapeRegExp(search.trim());
      const regex = new RegExp(term, "i");
      matchStage.$or = [
        { name: regex },
        { description: regex },
        { brand: regex },
        { tags: regex },
        { "variants.color": regex },
      ];
    }

    // Usar aggregation para obtener todos los valores únicos de una sola vez
    const [aggregationResult] = await Product.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // Obtener todas las marcas únicas
          brands: [
            { $match: { brand: { $exists: true, $ne: null, $ne: "" } } },
            { $group: { _id: "$brand" } },
            { $sort: { _id: 1 } },
          ],
          // Obtener todos los colores únicos con sus hex
          colors: [
            { $unwind: "$variants" },
            {
              $match: {
                "variants.color": { $exists: true, $ne: null, $ne: "" },
              },
            },
            {
              $group: {
                _id: "$variants.color",
                colorHex: { $first: "$variants.colorHex" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          // Obtener precio mínimo y máximo
          priceRange: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
              },
            },
          ],
          // Contar total de productos
          totalCount: [{ $count: "count" }],
          // Contar productos nuevos
          newCount: [{ $match: { isNew: true } }, { $count: "count" }],
          // Contar productos con descuento
          discountCount: [
            {
              $match: {
                originalPrice: { $exists: true },
                $expr: { $gt: ["$originalPrice", "$price"] },
              },
            },
            { $count: "count" },
          ],
          // Contar productos en stock
          inStockCount: [
            { $unwind: "$variants" },
            { $unwind: "$variants.sizes" },
            {
              $group: {
                _id: "$_id",
                totalStock: { $sum: "$variants.sizes.stock" },
              },
            },
            { $match: { totalStock: { $gt: 0 } } },
            { $count: "count" },
          ],
        },
      },
    ]);

    // Procesar resultados
    const brands = aggregationResult.brands.map((b) => b._id);
    const colors = aggregationResult.colors.map((c) => ({
      name: c._id,
      hex: c.colorHex || null,
    }));

    const priceData = aggregationResult.priceRange[0] || {
      minPrice: 0,
      maxPrice: 1000,
    };
    const totalProducts = aggregationResult.totalCount[0]?.count || 0;
    const newCount = aggregationResult.newCount[0]?.count || 0;
    const discountCount = aggregationResult.discountCount[0]?.count || 0;
    const inStockCount = aggregationResult.inStockCount[0]?.count || 0;

    res.json({
      success: true,
      filterOptions: {
        brands,
        colors,
        priceRange: {
          min: Math.floor(priceData.minPrice || 0),
          max: Math.ceil(priceData.maxPrice || 1000),
        },
        totalProducts,
        counts: {
          new: newCount,
          discount: discountCount,
          inStock: inStockCount,
        },
      },
    });
  } catch (error) {
    console.error("Error en getFilterOptions:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener opciones de filtro",
      error: error.message,
    });
  }
};

// ================= PRODUCTS =================
exports.getProducts = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      search,
      minPrice,
      maxPrice,
      brands, // NUEVO: filtro por marcas (comma-separated)
      colors, // NUEVO: filtro por colores (comma-separated)
      isNew, // NUEVO: filtro por nuevos
      hasDiscount, // NUEVO: filtro por descuento
      inStock, // NUEVO: filtro por stock
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

    // ===== SUBCATEGORY =====
    if (subcategory) {
      if (mongoose.Types.ObjectId.isValid(subcategory)) {
        query.subcategory = subcategory;
      }
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

    // ===== BRANDS (NUEVO) =====
    if (brands) {
      const brandList = brands
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);
      if (brandList.length > 0) {
        query.brand = { $in: brandList };
      }
    }

    // ===== COLORS (NUEVO) =====
    if (colors) {
      const colorList = colors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (colorList.length > 0) {
        query["variants.color"] = { $in: colorList };
      }
    }

    // ===== IS NEW (NUEVO) =====
    if (isNew === "true" || isNew === "1") {
      query.isNew = true;
    }

    // ===== HAS DISCOUNT (NUEVO) =====
    if (hasDiscount === "true" || hasDiscount === "1") {
      query.originalPrice = { $exists: true };
      query.$expr = { $gt: ["$originalPrice", "$price"] };
    }

    // ===== SEARCH =====
    if (search && search.trim()) {
      const term = escapeRegExp(search.trim());
      const regex = new RegExp(term, "i");

      query.$or = [
        { name: regex },
        { description: regex },
        { brand: regex },
        { tags: regex },
        { "variants.color": regex },
      ];
    }

    // ===== SORT =====
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
      default:
        sortQuery = { createdAt: -1 };
    }

    let products, total;

    // ===== IN STOCK (NUEVO) - Requiere aggregation =====
    if (inStock === "true" || inStock === "1") {
      // Usar aggregation para filtrar por stock
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            totalStock: {
              $sum: {
                $map: {
                  input: "$variants",
                  as: "variant",
                  in: {
                    $sum: {
                      $map: {
                        input: "$$variant.sizes",
                        as: "size",
                        in: "$$size.stock",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        { $match: { totalStock: { $gt: 0 } } },
      ];

      // Contar total
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await Product.aggregate(countPipeline);
      total = countResult[0]?.total || 0;

      // Obtener productos paginados
      const productsPipeline = [
        ...pipeline,
        { $sort: sortQuery },
        { $skip: (pageNum - 1) * limitNum },
        { $limit: limitNum },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      ];

      products = await Product.aggregate(productsPipeline);
    } else {
      // Query normal sin filtro de stock
      [products, total] = await Promise.all([
        Product.find(query)
          .populate("category")
          .sort(sortQuery)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        Product.countDocuments(query),
      ]);
    }

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

    // Incrementar contador de vistas
    product.viewCount += 1;
    await product.save();

    res.json({ success: true, product });
  } catch (error) {
    console.error("Error en getProduct:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener producto",
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
      .sort("-createdAt")
      .limit(8);

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
    });
  }
};

// ================= NEW PRODUCTS =================
exports.getNewProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      isNew: true,
    })
      .populate("category")
      .sort("-createdAt")
      .limit(8);

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error en getNewProducts:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener productos nuevos",
    });
  }
};

// ================= CATEGORIES =================
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      name: 1,
    });

    const withCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({
          category: cat._id,
          isActive: true,
        });

        return {
          ...cat.toObject(),
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
    });

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
        ...category.toObject(),
        productCount,
      },
    });
  } catch (error) {
    console.error("Error en getCategory:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener categoría",
    });
  }
};

// Alias para compatibilidad
exports.getAllProducts = exports.getProducts;
