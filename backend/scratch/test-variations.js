const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testVariations() {
  const variations = [
    { name: 'Original', url: process.env.DATABASE_URL },
    { name: 'With sslmode=require', url: process.env.DATABASE_URL + '&sslmode=require' },
    { name: 'Session Mode (5432)', url: process.env.DATABASE_URL.replace(':6543/', ':5432/').replace('?pgbouncer=true', '') },
    { name: 'Without pgbouncer=true', url: process.env.DATABASE_URL.replace('?pgbouncer=true', '?sslmode=require') },
  ];

  for (const variant of variations) {
    console.log(`--- Testing: ${variant.name} ---`);
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: variant.url,
        },
      },
    });

    try {
      await prisma.$connect();
      console.log(`✅ ${variant.name} success!`);
      const count = await prisma.deployment.count();
      console.log(`Count: ${count}`);
      await prisma.$disconnect();
      break; // Stop if one works
    } catch (error) {
      console.log(`❌ ${variant.name} failed: ${error.message.split('\n')[0]}`);
      await prisma.$disconnect();
    }
  }
}

testVariations();
