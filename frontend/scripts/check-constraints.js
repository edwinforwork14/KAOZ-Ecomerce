const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

const connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL).replace('?pgbouncer=true', '');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkConstraints() {
  await client.connect();
  const res = await client.query(`
    SELECT
        conname AS constraint_name,
        contype AS constraint_type
    FROM
        pg_catalog.pg_constraint con
        INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE
        nsp.nspname = 'public'
        AND rel.relname = 'Category';
  `);
  console.log('Constraints on Category table:');
  res.rows.forEach(row => console.log(`- ${row.constraint_name} (${row.constraint_type})`));
  await client.end();
}

checkConstraints();
