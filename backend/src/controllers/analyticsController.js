// backend/src/controllers/analyticsController.js
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const ProductView = require("../models/ProductView");
const CartHistory = require("../models/CartHistory");

exports.getDashboardStats = async (req, res) => {
  try {
    // Fechas para comparaciones
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Estados válidos para contar como ingresos (excluye pending y cancelled)
    const validRevenueStatuses = [
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ];

    // Stats generales
    const totalOrders = await Order.countDocuments({
      orderStatus: { $in: validRevenueStatuses },
    });

    const totalRevenue = await Order.aggregate([
      { $match: { orderStatus: { $in: validRevenueStatuses } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const totalCustomers = await User.countDocuments({ role: "user" });
    const totalProducts = await Product.countDocuments({ isActive: true });

    // Ingresos del mes actual (solo pedidos confirmados o superiores)
    const currentMonthRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfCurrentMonth },
          orderStatus: { $in: validRevenueStatuses },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // Pedidos últimos 30 días (solo confirmados o superiores)
    const ordersLast30Days = await Order.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      orderStatus: { $in: validRevenueStatuses },
    });

    // Clientes nuevos este mes
    const newCustomersThisMonth = await User.countDocuments({
      role: "user",
      createdAt: { $gte: startOfCurrentMonth },
    });

    // Average Order Value (AOV) - solo pedidos confirmados o superiores
    const aov =
      totalOrders > 0 ? (totalRevenue[0]?.total || 0) / totalOrders : 0;

    // AOV últimos 30 días
    const revenueAndOrdersLast30 = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          orderStatus: { $in: validRevenueStatuses },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const aovLast30Days =
      revenueAndOrdersLast30[0]?.totalOrders > 0
        ? revenueAndOrdersLast30[0].totalRevenue /
          revenueAndOrdersLast30[0].totalOrders
        : 0;

    // Pedidos por estado
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Pedidos pendientes de procesar (pending + confirmed)
    const pendingOrders = await Order.countDocuments({
      orderStatus: { $in: ["pending", "confirmed"] },
    });

    // Productos con bajo stock (menos de 10 unidades)
    const allProducts = await Product.find({ isActive: true }).lean();
    let lowStockCount = 0;
    let outOfStockCount = 0;

    allProducts.forEach((product) => {
      const totalStock = product.variants.reduce((sum, variant) => {
        return sum + variant.sizes.reduce((s, size) => s + size.stock, 0);
      }, 0);

      if (totalStock === 0) {
        outOfStockCount++;
      } else if (totalStock < 10) {
        lowStockCount++;
      }
    });

    // Ventas por mes (últimos 12 meses) - solo confirmados o superiores
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const salesByMonth = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
          orderStatus: { $in: validRevenueStatuses },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Productos más vendidos (solo de pedidos confirmados o superiores)
    const topProducts = await Order.aggregate([
      { $match: { orderStatus: { $in: validRevenueStatuses } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
          name: { $first: "$items.name" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);

    // Productos más vistos
    const topViewedProducts = await ProductView.aggregate([
      {
        $group: {
          _id: "$product",
          views: { $sum: 1 },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
    ]);

    // Productos más agregados al carrito
    const topCartProducts = await CartHistory.aggregate([
      { $match: { action: "added" } },
      {
        $group: {
          _id: "$product",
          count: { $sum: 1 },
          productName: { $first: "$productName" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Tasa de conversión (pedidos / vistas)
    const totalViews = await ProductView.countDocuments();
    const conversionRate =
      totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(2) : 0;

    // Tasa de abandono de carrito
    const cartsCreated = await CartHistory.distinct("sessionId").length;
    const abandonmentRate =
      cartsCreated > 0
        ? (((cartsCreated - totalOrders) / cartsCreated) * 100).toFixed(2)
        : 0;

    // Revenue por cliente
    const revenuePerCustomer =
      totalCustomers > 0 ? (totalRevenue[0]?.total || 0) / totalCustomers : 0;

    // Clientes con múltiples compras (retención)
    const repeatCustomers = await Order.aggregate([
      { $match: { orderStatus: { $in: validRevenueStatuses } } },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
        },
      },
      { $match: { orderCount: { $gte: 2 } } },
      { $count: "count" },
    ]);

    const repeatCustomerCount = repeatCustomers[0]?.count || 0;
    const retentionRate =
      totalCustomers > 0
        ? ((repeatCustomerCount / totalCustomers) * 100).toFixed(2)
        : 0;

    // Clientes recientes
    const recentCustomers = await User.find({ role: "user" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("-password");

    // Pedidos recientes
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "firstName lastName email");

    // Categorías más vendidas (solo de pedidos confirmados o superiores)
    const topCategories = await Order.aggregate([
      { $match: { orderStatus: { $in: validRevenueStatuses } } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $project: {
          _id: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          categoryName: {
            $ifNull: [
              { $arrayElemAt: ["$categoryInfo.name", 0] },
              "Sin categoría",
            ],
          },
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        // Stats principales
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalCustomers,
        totalProducts,

        // Revenue metrics
        currentMonthRevenue: currentMonthRevenue[0]?.total || 0,

        // Order metrics
        ordersLast30Days,
        pendingOrders,

        // Customer metrics
        newCustomersThisMonth,
        repeatCustomerCount,
        retentionRate,
        revenuePerCustomer,

        // Product metrics
        lowStockCount,
        outOfStockCount,

        // Performance metrics
        aov,
        aovLast30Days,
        conversionRate,
        abandonmentRate,

        // Detailed data
        ordersByStatus,
        salesByMonth,
        topProducts,
        topViewedProducts,
        topCartProducts,
        topCategories,
        recentCustomers,
        recentOrders,
      },
    });
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
      error: error.message,
    });
  }
};

exports.getProductAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // Vistas por día (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsByDay = await ProductView.aggregate([
      {
        $match: {
          product: product._id,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          views: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Agregados al carrito
    const cartAdditions = await CartHistory.countDocuments({
      product: id,
      action: "added",
    });

    // Ventas (solo pedidos confirmados o superiores)
    const validRevenueStatuses = [
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ];
    const sales = await Order.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          "items.product": product._id,
          orderStatus: { $in: validRevenueStatuses },
        },
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
    ]);

    res.json({
      success: true,
      analytics: {
        product: {
          id: product._id,
          name: product.name,
          viewCount: product.viewCount,
        },
        viewsByDay,
        cartAdditions,
        sales: sales[0] || { totalQuantity: 0, totalRevenue: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener análisis del producto",
      error: error.message,
    });
  }
};

exports.getInventoryReport = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .select("name brand category price originalPrice variants priceConfig")
      .lean();

    const inventoryData = products.map((product) => {
      const variants = product.variants.map((variant) => ({
        color: variant.color,
        colorHex: variant.colorHex,
        images: variant.images || [],
        sizes: variant.sizes.map((size) => ({
          size: size.size,
          stock: size.stock,
        })),
      }));

      const totalStock = variants.reduce((sum, variant) => {
        return sum + variant.sizes.reduce((s, size) => s + size.stock, 0);
      }, 0);

      return {
        id: product._id,
        name: product.name,
        category: product.category,
        brand: product.brand,
        price: product.price,
        originalPrice: product.originalPrice,
        priceConfig: product.priceConfig,
        totalStock,
        variants,
      };
    });

    // Ordenar por stock total
    inventoryData.sort((a, b) => a.totalStock - b.totalStock);

    const lowStockProducts = inventoryData.filter(
      (p) => p.totalStock > 0 && p.totalStock < 10
    );
    const outOfStockProducts = inventoryData.filter((p) => p.totalStock === 0);

    res.json({
      success: true,
      inventory: {
        totalProducts: inventoryData.length,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        products: inventoryData,
        lowStockProducts,
        outOfStockProducts,
      },
    });
  } catch (error) {
    console.error("Error getting inventory report:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener reporte de inventario",
      error: error.message,
    });
  }
};

exports.getCustomerAnalytics = async (req, res) => {
  try {
    // Clientes por mes de registro
    const customersByMonth = await User.aggregate([
      { $match: { role: "user" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Top clientes por gasto (solo pedidos confirmados o superiores)
    const validRevenueStatuses = [
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ];
    const topCustomers = await Order.aggregate([
      { $match: { orderStatus: { $in: validRevenueStatuses } } },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$total" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ]);

    // Clientes con pedidos recurrentes
    const recurringCustomers = await Order.aggregate([
      { $match: { orderStatus: { $in: validRevenueStatuses } } },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
        },
      },
      { $match: { orderCount: { $gte: 2 } } },
      { $count: "count" },
    ]);

    res.json({
      success: true,
      analytics: {
        customersByMonth,
        topCustomers,
        recurringCustomersCount: recurringCustomers[0]?.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener análisis de clientes",
      error: error.message,
    });
  }
};
