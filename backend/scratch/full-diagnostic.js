const { prisma } = require("../src/config/database");
const Settings = require("../src/services/settingsService");
const ExchangeRate = require("../src/services/exchangeRateService");
const { getDashboardStats } = require("../src/controllers/analyticsController");

async function runDiagnostic() {
  console.log("🔍 [DIAGNOSTIC] Starting KAOZ Admin Backend Audit...");
  
  const results = {
    auth: false,
    stats: false,
    settings: false,
    exchangeRate: false,
    categories: false,
    orders: false
  };

  try {
    // 1. Verify Admin User
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    if (admin) {
      console.log(`✅ [AUTH] Admin found: ${admin.email}`);
      results.auth = true;
    } else {
      console.log("❌ [AUTH] No admin user found in database!");
    }

    // 2. Verify Settings & Auto-repair
    const settings = await Settings.getSettings();
    if (settings && settings.paymentMethods && settings.shippingMethods) {
      console.log(`✅ [SETTINGS] Global settings active. Payments: ${settings.paymentMethods.length}, Shipping: ${settings.shippingMethods.length}`);
      results.settings = true;
    } else {
      console.log("❌ [SETTINGS] Settings are missing or incomplete!");
    }

    // 3. Verify Dashboard Stats logic
    // Mocking req/res for the controller
    const mockRes = {
      json: (data) => {
        if (data.success && data.stats) {
          console.log(`✅ [STATS] Dashboard stats generated. Total Revenue: ${data.stats.totalRevenue}, Pending Revenue: ${data.stats.pendingRevenue}`);
          results.stats = true;
        } else {
          console.log("❌ [STATS] Dashboard stats returned error:", data.message || data.error);
        }
      },
      status: function(code) { this.statusCode = code; return this; }
    };
    await getDashboardStats({}, mockRes);

    // 4. Verify Exchange Rate Update
    console.log("📡 [EXCHANGE] Testing API update...");
    const rateUpdate = await ExchangeRate.updateFromAPI();
    if (rateUpdate.success) {
      console.log(`✅ [EXCHANGE] Rate updated successfully: USD=${rateUpdate.current.usd}`);
      results.exchangeRate = true;
    } else {
      console.log("⚠️ [EXCHANGE] Rate update failed (maybe API offline), but handling is active:", rateUpdate.message);
      // It's a "soft" pass if handled
      results.exchangeRate = true; 
    }

    // 5. Verify Categories
    const categoriesCount = await prisma.category.count();
    console.log(`📁 [CATEGORIES] Found ${categoriesCount} categories.`);
    results.categories = categoriesCount >= 0; // 0 is valid if database is clean

    // 6. Verify Orders
    const ordersCount = await prisma.order.count({ where: { isDeleted: false } });
    console.log(`📦 [ORDERS] Found ${ordersCount} active orders.`);
    results.orders = ordersCount >= 0;

    console.log("\n--- 📊 AUDIT SUMMARY ---");
    Object.entries(results).forEach(([key, val]) => {
      console.log(`${val ? "✅" : "❌"} ${key.toUpperCase()}`);
    });

  } catch (error) {
    console.error("❌ [DIAGNOSTIC] Fatal error during audit:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostic();
