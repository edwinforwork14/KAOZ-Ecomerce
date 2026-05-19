const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkCustomersInOrders() {
  console.log("📊 [ORDERS CUSTOMER ANALYSIS]");
  
  try {
    const orders = await prisma.order.findMany({
      where: { isDeleted: false },
      select: {
        orderNumber: true,
        customerInfo: true,
        createdAt: true,
        total: true
      }
    });

    console.log(`\n📦 Total active orders found: ${orders.length}`);

    const uniqueCustomers = new Map();

    orders.forEach(order => {
      let info = order.customerInfo;
      if (typeof info === 'string') {
        try {
          info = JSON.parse(info);
        } catch (e) {}
      }

      if (info && info.email) {
        const email = info.email.toLowerCase().trim();
        const fullName = `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Guest';
        const phone = info.phone || 'N/A';
        
        if (!uniqueCustomers.has(email)) {
          uniqueCustomers.set(email, {
            email,
            name: fullName,
            phone,
            ordersCount: 1,
            totalSpent: order.total,
            lastOrderDate: order.createdAt
          });
        } else {
          const cust = uniqueCustomers.get(email);
          cust.ordersCount += 1;
          cust.totalSpent += order.total;
          if (order.createdAt > cust.lastOrderDate) {
            cust.lastOrderDate = order.createdAt;
          }
        }
      }
    });

    console.log(`👥 Unique customers found in orders: ${uniqueCustomers.size}\n`);
    
    if (uniqueCustomers.size > 0) {
      console.log("📝 Customer List:");
      Array.from(uniqueCustomers.values()).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} (${c.email})`);
        console.log(`      - Phone: ${c.phone}`);
        console.log(`      - Orders: ${c.ordersCount}`);
        console.log(`      - Total Spent: $${c.totalSpent.toFixed(2)}`);
        console.log(`      - Last Order: ${c.lastOrderDate.toLocaleDateString()}`);
      });
    } else {
      console.log("❌ No customer information found in orders.");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomersInOrders();
