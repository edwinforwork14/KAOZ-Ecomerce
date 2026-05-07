const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

const connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL).replace('?pgbouncer=true', '');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkCartColumns() {
  await client.connect();
  
  const cartRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Cart'
  `);
  console.log('Columns in Cart table:');
  cartRes.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));

  const itemRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'CartItem'
  `);
  console.log('\nColumns in CartItem table:');
  itemRes.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));

  await client.end();
}

checkCartColumns();
