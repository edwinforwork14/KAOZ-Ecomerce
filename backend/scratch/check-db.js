const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("📊 [DB CHECK]");
  
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.deployment.count()
  ]);

  console.log(`- Users: ${counts[0]}`);
  console.log(`- Products: ${counts[1]}`);
  console.log(`- Categories: ${counts[2]}`);
  console.log(`- Orders: ${counts[3]}`);
  console.log(`- Deployments: ${counts[4]}`);

  const admins = await prisma.user.findMany({ where: { role: "admin" } });
  console.log("\n🔑 [ADMINS]");
  admins.forEach(a => console.log(`- ${a.email} (${a.role})`));

  if (counts[2] > 0) {
    const categories = await prisma.category.findMany({ take: 5 });
    console.log("\n📁 [SAMPLE CATEGORIES]");
    categories.forEach(c => console.log(`- ${c.name} (${c.id})`));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
