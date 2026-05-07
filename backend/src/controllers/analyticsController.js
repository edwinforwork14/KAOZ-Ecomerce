const { prisma } = require("../config/database");

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const validRevenueStatuses = ["confirmed", "processing", "shipped", "delivered"];

    const [
      totalOrders,
      revenueResult,
      totalCustomers,
      totalProducts,
      currentMonthRevenueResult,
      ordersLast30Days,
      newCustomersThisMonth,
      ordersByStatus,
      pendingOrders,
    ] = await Promise.all([
      prisma.order.count({ where: { orderStatus: { in: validRevenueStatuses } } }),
      prisma.order.aggregate({
        where: { orderStatus: { in: validRevenueStatuses } },
        _sum: { total: true }
      }),
      prisma.user.count({ where: { role: "user" } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfCurrentMonth },
          orderStatus: { in: validRevenueStatuses }
        },
        _sum: { total: true }
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          orderStatus: { in: validRevenueStatuses }
        }
      }),
      prisma.user.count({
        where: { role: "user", createdAt: { gte: startOfCurrentMonth } }
      }),
      prisma.order.groupBy({
        by: ['orderStatus'],
        _count: { _all: true }
      }),
      prisma.order.count({
        where: { orderStatus: { in: ["pending", "confirmed"] } }
      })
    ]);

    const totalRevenue = revenueResult._sum.total || 0;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Productos con bajo stock
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { variants: { include: { sizes: true } } }
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(product => {
      const totalStock = product.variants.reduce((sum, v) => 
        sum + v.sizes.reduce((s, size) => s + size.stock, 0), 0
      );
      if (totalStock === 0) outOfStockCount++;
      else if (totalStock < 10) lowStockCount++;
    });

    // Top products (Simplificado: obtener órdenes recientes y procesar en JS o usar una query más compleja)
    // Para simplificar, obtenemos los items de órdenes válidas.
    const orderItems = await prisma.orderItem.findMany({
      where: { order: { orderStatus: { in: validRevenueStatuses } } },
      select: { productId: true, quantity: true, subtotal: true, name: true },
    });

    const productStats = {};
    orderItems.forEach(item => {
      if (!productStats[item.productId]) {
        productStats[item.productId] = { totalQuantity: 0, totalRevenue: 0, name: item.name };
      }
      productStats[item.productId].totalQuantity += item.quantity;
      productStats[item.productId].totalRevenue += item.subtotal;
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalProducts,
        currentMonthRevenue: currentMonthRevenueResult._sum.total || 0,
        ordersLast30Days,
        pendingOrders,
        newCustomersThisMonth,
        lowStockCount,
        outOfStockCount,
        aov,
        ordersByStatus: ordersByStatus.map(s => ({ _id: s.orderStatus, count: s._count._all })),
        topProducts,
      },
    });
  } catch (error) {
    console.error("Error dashboard stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProductAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ success: false, message: "No encontrado" });

    const cartAdditions = await prisma.cartHistory.count({
      where: { productId: id, action: "added" }
    });

    const sales = await prisma.orderItem.aggregate({
      where: {
        productId: id,
        order: { orderStatus: { in: ["confirmed", "processing", "shipped", "delivered"] } }
      },
      _sum: { quantity: true, subtotal: true }
    });

    res.json({
      success: true,
      analytics: {
        product: { id: product.id, name: product.name, viewCount: product.viewCount },
        cartAdditions,
        sales: {
          totalQuantity: sales._sum.quantity || 0,
          totalRevenue: sales._sum.subtotal || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInventoryReport = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: { include: { sizes: true } },
        category: true
      }
    });

    const inventoryData = products.map(product => {
      const totalStock = product.variants.reduce((sum, v) => 
        sum + v.sizes.reduce((s, size) => s + size.stock, 0), 0
      );

      return {
        id: product.id,
        name: product.name,
        category: product.category?.name,
        price: product.price,
        totalStock,
      };
    });

    res.json({
      success: true,
      inventory: {
        totalProducts: inventoryData.length,
        products: inventoryData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.getCustomerAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      newCustomersThisMonth,
      customersWithOrders,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "user" } }),
      prisma.user.count({
        where: { role: "user", createdAt: { gte: startOfMonth } }
      }),
      prisma.user.findMany({
        where: { role: "user" },
        select: {
          _count: {
            select: { orders: { where: { isDeleted: false } } }
          }
        }
      })
    ]);

    const orderDistribution = {
      0: 0,
      "1": 0,
      "2-5": 0,
      "5+": 0
    };

    customersWithOrders.forEach(c => {
      const count = c._count.orders;
      if (count === 0) orderDistribution[0]++;
      else if (count === 1) orderDistribution["1"]++;
      else if (count <= 5) orderDistribution["2-5"]++;
      else orderDistribution["5+"]++;
    });

    res.json({
      success: true,
      analytics: {
        totalCustomers,
        newCustomersThisMonth,
        orderDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
