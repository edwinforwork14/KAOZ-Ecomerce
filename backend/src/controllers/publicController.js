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

// ================= INSTAGRAM FEED (ZERNIO) =================
const zernioService = require("../services/zernioService");

exports.getInstagramPosts = async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "global" }
    });

    const zernioConfig = settings?.zernioConfig || {};

    if (zernioConfig.connected && Array.isArray(zernioConfig.posts) && zernioConfig.posts.length > 0) {
      // Trigger background sync if last sync was more than 1 hour ago (non-blocking)
      const lastSynced = zernioConfig.lastSyncedAt ? new Date(zernioConfig.lastSyncedAt) : new Date(0);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastSynced < oneHourAgo) {
        console.log("⏱️ [PUBLIC API] La caché de posts tiene más de 1 hora. Iniciando sincronización en segundo plano...");
        zernioService.syncZernioData(false).catch(err => {
          console.error("❌ [PUBLIC API] Error en sincronización de fondo:", err.message);
        });
      }

      return res.json({
        success: true,
        source: "zernio",
        username: zernioConfig.username || "kaos.vzla",
        posts: zernioConfig.posts
      });
    }

    // Fallback Mock Posts (High quality streetwear fashion)
    const fallbacks = [
      {
        id: "mock_1",
        picture: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
        permalink: "https://instagram.com/kaos.vzla",
        message: "STREET CULTURE FOR THE UNTAMED. Nueva colección disponible online. #kaos #streetwear",
        likeCount: 245,
        commentCount: 18,
        createdTime: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: "mock_2",
        picture: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80",
        permalink: "https://instagram.com/kaos.vzla",
        message: "Detalles que definen identidad. KAOS Oversized Hoodie en gris asfalto. Disponible ahora.",
        likeCount: 312,
        commentCount: 24,
        createdTime: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        id: "mock_3",
        picture: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&auto=format&fit=crop&q=80",
        permalink: "https://instagram.com/kaos.vzla",
        message: "No sigas las reglas, crea las tuyas. Drop 02 / Outfits completos en el link de la bio.",
        likeCount: 189,
        commentCount: 12,
        createdTime: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: "mock_4",
        picture: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80",
        permalink: "https://instagram.com/kaos.vzla",
        message: "Urban vibes & premium aesthetics. Envíos gratis a todo el país para compras superiores a 1500 Bs.",
        likeCount: 420,
        commentCount: 45,
        createdTime: new Date(Date.now() - 3600000 * 36).toISOString()
      },
      {
        id: "mock_5",
        picture: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
        permalink: "https://instagram.com/kaos.vzla",
        message: "Minimalism is an attitude. KAOS Cargo Pants & Utility Vest. Estilo sin esfuerzo.",
        likeCount: 278,
        commentCount: 15,
        createdTime: new Date(Date.now() - 3600000 * 48).toISOString()
      },
      {
        id: "mock_6",
        picture: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
        permalink: "https://instagram.com/kaos.vzla",
        message: "Diseñado para resistir. Calidad premium en cada hilo. Descubre los nuevos ingresos.",
        likeCount: 356,
        commentCount: 29,
        createdTime: new Date(Date.now() - 3600000 * 72).toISOString()
      },
      {
        id: "mock_7",
        picture: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&auto=format&fit=crop&q=80",
        permalink: "https://instagram.com/kaos.vzla",
        message: "THE FUTURE IS NOW. Únete a la cultura. Visita nuestro manifesto corporativo para saber más.",
        likeCount: 512,
        commentCount: 52,
        createdTime: new Date(Date.now() - 3600000 * 96).toISOString()
      }
    ];

    res.json({
      success: true,
      source: "fallback",
      username: "kaos.vzla",
      posts: fallbacks
    });
  } catch (error) {
    console.error("❌ [PUBLIC CONTROLLER] Error en getInstagramPosts:", error.message);
    res.status(500).json({
      success: false,
      message: "Error al obtener las publicaciones de Instagram",
      error: error.message
    });
  }
};
