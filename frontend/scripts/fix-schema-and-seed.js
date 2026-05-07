const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

const connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL).replace('?pgbouncer=true', '');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixSchemaAndSeed() {
  try {
    await client.connect();
    console.log('Connected to Postgres');

    // 1. Fix Category table
    console.log('Fixing Category table...');
    await client.query('ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "slug" TEXT;');
    await client.query('ALTER TABLE "Category" ADD CONSTRAINT "Category_slug_key" UNIQUE (slug);').catch(() => {});
    
    // 2. Fix Product table
    console.log('Fixing Product table...');
    await client.query('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "slug" TEXT;');
    await client.query('ALTER TABLE "Product" ADD CONSTRAINT "Product_slug_key" UNIQUE (slug);').catch(() => {});

    // 3. Fix other tables for upsert
    await client.query('ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_url_key" UNIQUE ("productId", url);').catch(() => {});
    await client.query('ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_color_key" UNIQUE ("productId", color);').catch(() => {});
    await client.query('ALTER TABLE "ProductSize" ADD CONSTRAINT "ProductSize_variantId_size_key" UNIQUE ("variantId", size);').catch(() => {});

    console.log('Schema fixes applied.');

    // 4. Seed Data
    console.log('Seeding initial data...');
    
    // Categories
    const categories = [
      ['Hombre', 'men', 'Colección para hombres', 1, true],
      ['Mujer', 'women', 'Colección para mujeres', 2, true],
      ['Kids', 'kids', 'Colección infantil', 3, true],
      ['Accesorios', 'accessories', 'Accesorios y complementos', 4, true]
    ];

    for (const [name, slug, desc, order, active] of categories) {
      await client.query(`
        INSERT INTO "Category" (id, name, slug, description, "order", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET name = $1, description = $3, "order" = $4, "isActive" = $5, "updatedAt" = NOW()
      `, [name, slug, desc, order, active]);
    }

    // Get category IDs
    const catRes = await client.query('SELECT id, slug FROM "Category"');
    const catMap = {};
    catRes.rows.forEach(row => catMap[row.slug] = row.id);

    // Products
    const products = [
      {
        name: 'Chaqueta Reflectiva KAOZ',
        slug: 'chaqueta-reflectiva-kaoz',
        description: 'Chaqueta técnica con materiales reflectivos para mayor visibilidad y estilo urbano.',
        price: 75.0,
        categoryId: catMap['men'],
        brand: 'KAOZ',
        isNew: true,
        isFeatured: true,
        isActive: true,
        imageUrl: '/images/Chaqueta reflectiva.jpeg'
      },
      {
        name: 'Franela Oversized Urban',
        slug: 'franela-oversized-urban',
        description: 'Franela de algodón premium con corte oversized para un look relajado y moderno.',
        price: 35.0,
        categoryId: catMap['men'],
        brand: 'KAOZ',
        isNew: true,
        isFeatured: true,
        isActive: true,
        imageUrl: '/images/Franela Oversized.jpeg'
      },
      {
        name: 'Suéter UV Kids Adventure',
        slug: 'sueter-uv-kids-adventure',
        description: 'Protección solar y comodidad para los más pequeños en sus aventuras al aire libre.',
        price: 25.0,
        categoryId: catMap['kids'],
        brand: 'KAOZ',
        isNew: true,
        isFeatured: true,
        isActive: true,
        imageUrl: '/images/Suéter UV con capucha para niños.jpeg'
      },
      {
        name: 'Gorra KAOZ Classic',
        slug: 'gorra-kaoz-classic',
        description: 'Gorra ajustable con logo bordado, el accesorio perfecto para cualquier outfit.',
        price: 20.0,
        categoryId: catMap['accessories'],
        brand: 'KAOZ',
        isNew: false,
        isFeatured: true,
        isActive: true,
        imageUrl: '/images/gorras.jpeg'
      }
    ];

    for (const p of products) {
      if (!p.categoryId) {
        console.warn(`Skipping ${p.name}: Category ID not found`);
        continue;
      }

      const pRes = await client.query(`
        INSERT INTO "Product" (id, name, slug, description, price, "categoryId", brand, "isNew", "isFeatured", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET 
          name = $1, description = $3, price = $4, "categoryId" = $5, brand = $6, "isNew" = $7, "isFeatured" = $8, "isActive" = $9, "updatedAt" = NOW()
        RETURNING id
      `, [p.name, p.slug, p.description, p.price, p.categoryId, p.brand, p.isNew, p.isFeatured, p.isActive]);

      const productId = pRes.rows[0].id;

      // Image
      await client.query(`
        INSERT INTO "ProductImage" (id, "productId", url, "isMain")
        VALUES (gen_random_uuid(), $1, $2, true)
        ON CONFLICT ("productId", url) DO NOTHING
      `, [productId, p.imageUrl]);

      // Variant
      const vRes = await client.query(`
        INSERT INTO "ProductVariant" (id, "productId", color, "colorHex")
        VALUES (gen_random_uuid(), $1, 'Único', '#000000')
        ON CONFLICT ("productId", color) DO UPDATE SET "productId" = $1
        RETURNING id
      `, [productId]);

      const variantId = vRes.rows[0].id;

      // Size
      await client.query(`
        INSERT INTO "ProductSize" (id, "variantId", size, stock)
        VALUES (gen_random_uuid(), $1, 'Estándar', 50)
        ON CONFLICT ("variantId", size) DO UPDATE SET stock = 50
      `, [variantId]);
    }

    console.log('Seed finished successfully.');
    await client.end();
  } catch (err) {
    console.error('Error during schema fix and seed:', err);
    process.exit(1);
  }
}

fixSchemaAndSeed();
