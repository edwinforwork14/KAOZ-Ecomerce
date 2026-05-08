const { prisma } = require("../config/database");

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ================= FILTER OPTIONS (NUEVO) =================
/**
 * Obtiene las opciones de filtro disponibles para TODOS los productos
 * (o filtrado por categoría si se proporciona)
 */
exports.getFilterOptions = async (req, res) => {
  try {
    const { category, search } = req.query;

    const where = { isActive: true };

    if (category) {
      where.categoryId = category;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { brand: { contains: term, mode: "insensitive" } },
      ];
    }

    // Obtener marcas únicas
    const brandsResult = await prisma.product.groupBy({
      by: ["brand"],
      where,
      _count: {
        brand: true,
      },
    });
    const brands = brandsResult.map((b) => b.brand).filter(Boolean);

    // Obtener colores únicos de las variantes
    const productsWithVariants = await prisma.product.findMany({
      where,
      select: {
        variants: {
          select: {
            color: true,
            colorHex: true,
          },
        },
      },
    });

    const colorsMap = new Map();
    productsWithVariants.forEach((p) => {
      p.variants.forEach((v) => {
        if (v.color && !colorsMap.has(v.color)) {
          colorsMap.set(v.color, v.colorHex || null);
        }
      });
    });
    const colors = Array.from(colorsMap.entries()).map(([name, hex]) => ({
      name,
      hex,
    }));

    // Obtener precio mínimo y máximo
    const aggregatePrice = await prisma.product.aggregate({
      where,
      _min: { price: true },
      _max: { price: true },
      _count: { id: true },
    });

    // Conteos adicionales
    const newCount = await prisma.product.count({
      where: { ...where, isNew: true },
    });

    const discountCount = await prisma.product.count({
      where: {
        ...where,
        originalPrice: { not: null },
        AND: [
          { originalPrice: { gt: prisma.product.fields.price } }
        ]
      },
    });

    // Para el stock, necesitamos una consulta que verifique si hay algún size con stock > 0
    const inStockCount = await prisma.product.count({
      where: {
        ...where,
        variants: {
          some: {
            sizes: {
              some: {
                stock: { gt: 0 }
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      filterOptions: {
        brands,
        colors,
        priceRange: {
          min: Math.floor(aggregatePrice._min.price || 0),
          max: Math.ceil(aggregatePrice._max.price || 1000),
        },
        totalProducts: aggregatePrice._count.id || 0,
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
      brands,
      colors,
      isNew,
      hasDiscount,
      inStock,
      sort = "-createdAt",
      page = 1,
      limit = 12,
      featured,
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 12, 1), 200);

    const where = { isActive: true };

    if (category) where.categoryId = category;
    if (subcategory) where.subcategoryId = subcategory;
    if (featured === "true" || featured === "1") where.isFeatured = true;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    if (brands) {
      const brandList = brands.split(",").map((b) => b.trim()).filter(Boolean);
      if (brandList.length > 0) where.brand = { in: brandList };
    }

    if (colors) {
      const colorList = colors.split(",").map((c) => c.trim()).filter(Boolean);
      if (colorList.length > 0) {
        where.variants = {
          some: {
            color: { in: colorList }
          }
        };
      }
    }

    if (isNew === "true" || isNew === "1") where.isNew = true;

    if (hasDiscount === "true" || hasDiscount === "1") {
      where.originalPrice = { not: null, gt: prisma.product.fields.price };
    }

    if (inStock === "true" || inStock === "1") {
      where.variants = {
        some: {
          sizes: {
            some: {
              stock: { gt: 0 }
            }
          }
        }
      };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { brand: { contains: term, mode: "insensitive" } },
      ];
    }

    // ===== SORT =====
    let orderBy = {};
    switch (sort) {
      case "featured": orderBy = [{ isFeatured: "desc" }, { createdAt: "desc" }]; break;
      case "-createdAt": orderBy = { createdAt: "desc" }; break;
      case "createdAt": orderBy = { createdAt: "asc" }; break;
      case "price": orderBy = { price: "asc" }; break;
      case "-price": orderBy = { price: "desc" }; break;
      case "name": orderBy = { name: "asc" }; break;
      case "-name": orderBy = { name: "desc" }; break;
      default: orderBy = { createdAt: "desc" };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true,
          variants: {
            include: {
              sizes: true,
              images: true
            }
          }
        },
        orderBy,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.product.count({ where }),
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

    const product = await prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        category: true,
        images: true,
        variants: {
          include: {
            sizes: true,
            images: true
          }
        }
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // Incrementar contador de vistas
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

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
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      include: {
        category: true,
        images: true
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

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
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isNew: true,
      },
      include: {
        category: true,
        images: true
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

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
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } }
        }
      }
    });

    const categoriesWithCount = categories.map(cat => ({
      ...cat,
      productCount: cat._count.products
    }));

    res.json({
      success: true,
      count: categoriesWithCount.length,
      categories: categoriesWithCount,
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

    const category = await prisma.category.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    res.json({
      success: true,
      category: {
        ...category,
        productCount: category._count.products,
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
