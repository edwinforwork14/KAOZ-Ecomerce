const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

const connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL).replace('?pgbouncer=true', '');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixPermissions() {
  try {
    await client.connect();
    console.log('Connected to Postgres');
    
    console.log('Granting permissions to anon and authenticated roles...');
    await client.query('GRANT USAGE ON SCHEMA public TO anon, authenticated;');
    await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;');
    await client.query('GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;'); // Optional, depends on security needs
    await client.query('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;');
    
    console.log('Permissions granted successfully.');
    await client.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixPermissions();
