const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

const connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL).replace('?pgbouncer=true', '');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'ProductImage'
  `);
  console.log('Columns in ProductImage table:');
  res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
  await client.end();
}

checkColumns();
