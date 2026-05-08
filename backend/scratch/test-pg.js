const { Client } = require('pg');
require('dotenv').config();

async function testPg() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Testing with pg driver...');
  console.log('URL:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connection successful with pg');
    const res = await client.query('SELECT NOW()');
    console.log('Server time:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Connection failed with pg:');
    console.error(err);
  } finally {
    await client.end();
  }
}

testPg();
