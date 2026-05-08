const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.product.findFirst({ orderBy: { createdAt: 'desc' }, include: { images: true } })
  .then(res => console.log(JSON.stringify(res, null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
