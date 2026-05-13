const { prisma } = require("../config/database");

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Ingresos confirmados (excluyendo cancelados)
    const validRevenueStatuses = ["confirmed", "processing", "shipped", "delivered"];
    // Para conteos totales incluimos pendientes también
    const allActiveStatuses = ["pending", "confirmed", "processing", "shipped", "delivered"];

    const [
      totalOrders,
      revenueResult,
      pendingRevenueResult,
      totalCustomers,
      totalProducts,
      currentMonthRevenueResult,
      ordersLast30Days,
      newCustomersThisMonth,
      ordersByStatus,
      pendingOrders,
      activeCarts,
      totalViewsResult,
      paymentMethodStats,
    ] = await Promise.all([
      // Total de pedidos activos (incluyendo pending)
      prisma.order.count({ where: { orderStatus: { in: allActiveStatuses }, isDeleted: false } }),
      // Ingresos de pedidos confirmados
      prisma.order.aggregate({
        where: { orderStatus: { in: validRevenueStatuses }, isDeleted: false },
        _sum: { total: true }
      }),
      // Ingresos de pedidos pendientes (para mostrar como "potencial")
      prisma.order.aggregate({
        where: { orderStatus: "pending", isDeleted: false },
        _sum: { total: true }
      }),
      prisma.user.count({ where: { role: "user", isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfCurrentMonth },
          orderStatus: { in: allActiveStatuses },
          isDeleted: false
        },
        _sum: { total: true }
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          orderStatus: { in: allActiveStatuses },
          isDeleted: false
        }
      }),
      prisma.user.count({
        where: { role: "user", createdAt: { gte: startOfCurrentMonth } }
      }),
      prisma.order.groupBy({
        by: ['orderStatus'],
        where: { isDeleted: false },
        _count: { _all: true }
      }),
      prisma.order.count({
        where: { orderStatus: { in: ["pending", "confirmed"] }, isDeleted: false }
      }),
      prisma.cart.count({
        where: { items: { some: {} } }
      }),
      prisma.product.aggregate({
        _sum: { viewCount: true }
      }),
      prisma.order.groupBy({
        by: ['paymentMethod'],
        where: { orderStatus: { in: allActiveStatuses }, isDeleted: false },
        _count: { _all: true },
        _sum: { total: true }
      }),
      // Órdenes recientes
      prisma.order.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { items: true }
      }),
      // Gastos totales
      prisma.expense.aggregate({
        _sum: { amount: true }
      })
    ]);

    const totalRevenue = revenueResult._sum.total || 0;
    const pendingRevenue = pendingRevenueResult._sum.total || 0;
    const aov = totalOrders > 0 ? (totalRevenue + pendingRevenue) / totalOrders : 0;
    const totalViews = totalViewsResult._sum.viewCount || 1;
    const conversionRate = (totalOrders / totalViews) * 100;

    // Productos con bajo stock
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { 
        variants: { include: { sizes: true } },
        category: true
      }
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockProducts = [];

    products.forEach(product => {
      const totalStock = product.variants.reduce((sum, v) => 
        sum + v.sizes.reduce((s, size) => s + size.stock, 0), 0
      );
      if (totalStock === 0) {
        outOfStockCount++;
        lowStockProducts.push({ id: product.id, name: product.name, stock: 0 });
      } else if (totalStock < 5) {
        lowStockCount++;
        lowStockProducts.push({ id: product.id, name: product.name, stock: totalStock });
      }
    });

    // Top VIP Customers (CLV)
    const users = await prisma.user.findMany({
      where: { role: "user" },
      include: {
        orders: {
          where: { orderStatus: { in: validRevenueStatuses }, isDeleted: false },
          select: { total: true }
        }
      },
      take: 50 // Analizamos los top 50
    });

    const vipCustomers = users.map(u => {
      const totalSpent = u.orders.reduce((sum, o) => sum + o.total, 0);
      const orderCount = u.orders.length;
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        totalSpent,
        orderCount,
        avgTicket: orderCount > 0 ? totalSpent / orderCount : 0
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

    // Sales by Category
    const categoryDistribution = {};
    products.forEach(p => {
      if (p.category) {
        if (!categoryDistribution[p.category.name]) {
          categoryDistribution[p.category.name] = { name: p.category.name, value: 0 };
        }
      }
    });

    // Obtenemos items vendidos para calcular distribución por categoría
    const soldItems = await prisma.orderItem.findMany({
      where: { order: { orderStatus: { in: validRevenueStatuses }, isDeleted: false } },
      select: { productId: true, quantity: true, subtotal: true }
    });

    soldItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product && product.category) {
        categoryDistribution[product.category.name].value += item.subtotal;
      }
    });

    // Top products con tendencia (Mock tendencia por ahora o calcular real si hay timestamps)
    const productStats = {};
    soldItems.forEach(item => {
      if (!productStats[item.productId]) {
        productStats[item.productId] = { totalQuantity: 0, totalRevenue: 0 };
      }
      productStats[item.productId].totalQuantity += item.quantity;
      productStats[item.productId].totalRevenue += item.subtotal;
    });

    const topProducts = Object.keys(productStats)
      .map(id => {
        const product = products.find(p => p.id === id);
        return {
          id,
          name: product?.name || "Producto Eliminado",
          totalQuantity: productStats[id].totalQuantity,
          totalRevenue: productStats[id].totalRevenue,
          // Trend: 7 puntos aleatorios para el sparkline (idealmente vendrían de ventas diarias)
          trend: Array.from({ length: 7 }, () => Math.floor(Math.random() * 20) + 5)
        };
      })
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    // Revenue History (last 6 months)
    const revenueHistory = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      
      const monthRevenue = await prisma.order.aggregate({
        where: {
          createdAt: { gte: d, lt: nextMonth },
          orderStatus: { in: validRevenueStatuses },
          isDeleted: false
        },
        _sum: { total: true }
      });
      
      revenueHistory.push({
        date: monthName,
        revenue: monthRevenue._sum.total || 0,
        orders: await prisma.order.count({
          where: {
            createdAt: { gte: d, lt: nextMonth },
            isDeleted: false
          }
        })
      });
    }

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue,
        pendingRevenue,
        totalCombinedRevenue: totalRevenue + pendingRevenue,
        totalCustomers,
        totalProducts,
        currentMonthRevenue: currentMonthRevenueResult._sum.total || 0,
        ordersLast30Days,
        pendingOrders,
        newCustomersThisMonth,
        activeCarts,
        conversionRate,
        lowStockCount,
        outOfStockCount,
        lowStockProducts: lowStockProducts.slice(0, 5),
        aov,
        ordersByStatus: ordersByStatus.map(s => ({ _id: s.orderStatus, count: s._count._all })),
        vipCustomers,
        categoryDistribution: Object.values(categoryDistribution),
        paymentMethods: paymentMethodStats.map(p => ({
          name: typeof p.paymentMethod === 'string' ? p.paymentMethod : (p.paymentMethod?.name || "Otros"),
          count: p._count._all,
          total: p._sum.total
        })),
        topProducts,
        recentOrders: recentOrders || [],
        revenueHistory,
        totalExpenses: totalExpensesResult._sum.amount || 0,
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

exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: { include: { sizes: true } },
        category: true
      }
    });

    const lowStock = [];
    const outOfStock = [];

    products.forEach(product => {
      const totalStock = product.variants.reduce((sum, v) => 
        sum + v.sizes.reduce((s, size) => s + size.stock, 0), 0
      );
      
      if (totalStock === 0) {
        outOfStock.push({
          id: product.id,
          name: product.name,
          category: product.category?.name,
          price: product.price,
          stock: 0
        });
      } else if (totalStock < 5) {
        lowStock.push({
          id: product.id,
          name: product.name,
          category: product.category?.name,
          price: product.price,
          stock: totalStock
        });
      }
    });

    res.json({
      success: true,
      lowStockProducts: lowStock,
      outOfStockProducts: outOfStock,
      totalCritical: lowStock.length + outOfStock.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
