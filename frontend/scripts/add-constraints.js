const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

const connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL).replace('?pgbouncer=true', '');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function addConstraints() {
  try {
    await client.connect();
    console.log('Connected to Postgres');
    
    console.log('Adding unique constraints...');
    
    // Category slug
    await client.query('ALTER TABLE "Category" ADD CONSTRAINT "Category_slug_key" UNIQUE (slug);').catch(e => console.log('Category slug key already exists or error:', e.message));
    
    // Product slug
    await client.query('ALTER TABLE "Product" ADD CONSTRAINT "Product_slug_key" UNIQUE (slug);').catch(e => console.log('Product slug key already exists or error:', e.message));
    
    // ProductImage unique combination
    await client.query('ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_url_key" UNIQUE ("productId", url);').catch(e => console.log('ProductImage key already exists or error:', e.message));
    
    // ProductVariant unique combination
    await client.query('ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_color_key" UNIQUE ("productId", color);').catch(e => console.log('ProductVariant key already exists or error:', e.message));
    
    // ProductSize unique combination
    await client.query('ALTER TABLE "ProductSize" ADD CONSTRAINT "ProductSize_variantId_size_key" UNIQUE ("variantId", size);').catch(e => console.log('ProductSize key already exists or error:', e.message));
    
    console.log('Constraints check/add finished.');
    await client.end();
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

addConstraints();
