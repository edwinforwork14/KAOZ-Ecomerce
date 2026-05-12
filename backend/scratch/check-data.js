const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkData() {
  console.log("📊 [DATA CHECK] Checking for orders and customers...");
  
  try {
    const orders = await prisma.order.count({ where: { isDeleted: false } });
    const customers = await prisma.user.count({ where: { role: "user" } });
    const allUsers = await prisma.user.findMany({ select: { email: true, role: true } });

    console.log(`📦 Orders: ${orders}`);
    console.log(`👥 Customers (role user): ${customers}`);
    console.log("📝 All Users in DB:");
    allUsers.forEach(u => console.log(`   - ${u.email} (${u.role})`));

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
