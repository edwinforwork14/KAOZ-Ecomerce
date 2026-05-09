const { prisma } = require("../config/database");

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
    const skip = (pageNum - 1) * limitNum;

    const where = { isActive: true };

    if (category) {
      where.OR = [
        { categoryId: category },
        { subcategoryId: category }
      ];
    }

    if (featured === "true" || featured === "1") {
      where.isFeatured = true;
    }

    if (minPrice || maxPrice) {
      where.price = {
        gte: minPrice ? parseFloat(minPrice) : undefined,
        lte: maxPrice ? parseFloat(maxPrice) : undefined,
      };
    }

    if (search && search.trim()) {
      where.OR = [
        ...(where.OR || []),
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Sort mapping
    let orderBy = { createdAt: 'desc' };
    if (sort === "price") orderBy = { price: 'asc' };
    else if (sort === "-price") orderBy = { price: 'desc' };
    else if (sort === "name") orderBy = { name: 'asc' };
    else if (sort === "-name") orderBy = { name: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: { category: true, images: true, variants: { include: { sizes: true } } }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================= SINGLE PRODUCT =================
exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        category: true, 
        images: true, 
        variants: { include: { sizes: true, images: true } } 
      }
    });

    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 10,
      include: { category: true, images: true, variants: { include: { sizes: true } } }
    });

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================= CATEGORIES =================
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true, subProducts: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    const result = categories.map(cat => ({
      ...cat,
      productCount: (cat._count.products || 0) + (cat._count.subProducts || 0)
    }));

    res.json({ success: true, categories: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, subProducts: true }
        }
      }
    });

    if (!category || !category.isActive) {
      return res.status(404).json({ success: false, message: "Categoría no encontrada" });
    }

    res.json({
      success: true,
      category: {
        ...category,
        productCount: (category._count.products || 0) + (category._count.subProducts || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
