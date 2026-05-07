const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString.replace('?pgbouncer=true', ''),
  ssl: {
    rejectUnauthorized: false
  }
});

async function listTables() {
  try {
    await client.connect();
    console.log('Connected to Postgres');
    
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Tables in public schema:');
    for (const row of res.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
      console.log(`- ${row.table_name} (Count: ${countRes.rows[0].count})`);
    }
    
    await client.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

listTables();
