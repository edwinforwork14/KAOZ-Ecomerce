const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dropAllUniqueConstraints() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT conname::text, conrelid::regclass::text AS table_name
    FROM pg_constraint
    WHERE contype = 'u'
    AND conrelid::regclass::text IN (
      '"Category"', '"Product"', '"ProductImage"', '"ProductSize"',
      '"ProductVariant"', '"Cart"', '"CartItem"', '"User"',
      '"Order"', '"OrderItem"', '"ExchangeRate"', '"Settings"',
      '"ProductView"', '"CartHistory"'
    )
  `);

  console.log('Found ' + result.length + ' unique constraints:\n');

  for (const row of result) {
    const sql = 'ALTER TABLE ' + row.table_name + ' DROP CONSTRAINT IF EXISTS "' + row.conname + '" CASCADE;';
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✅ Dropped: ' + row.table_name + '.' + row.conname);
    } catch (err) {
      console.warn('⚠️  Skip ' + row.conname + ': ' + err.message);
    }
  }
}

dropAllUniqueConstraints()
  .then(() => console.log('\n🎉 Done!'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
