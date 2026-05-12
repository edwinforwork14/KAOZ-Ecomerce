const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSettings() {
  console.log('🔍 Checking Settings table...');
  try {
    const settings = await prisma.settings.findMany();
    console.log('Settings records:', JSON.stringify(settings, null, 2));
    
    if (settings.length === 0) {
      console.log('⚠️ No settings records found. Attempting to create global...');
      const created = await prisma.settings.create({
        data: {
          id: "global",
          currency: { symbol: "$", code: "USD" },
          paymentMethods: [{ id: "whatsapp", name: "WhatsApp", isActive: true }],
          shippingMethods: [{ id: "delivery", name: "Delivery", isActive: true }]
        }
      });
      console.log('✅ Created settings:', created);
    }
  } catch (err) {
    console.error('❌ Error debugging settings:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugSettings();
