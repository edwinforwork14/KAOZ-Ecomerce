import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Try backend .env first as it has DATABASE_URL
dotenv.config({ path: resolve(__dirname, '../../backend/.env') })

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL

if (!connectionString) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const client = new Client({
  connectionString: connectionString.replace('?pgbouncer=true', ''), // Avoid bouncer for simple queries if possible
})

async function listTables() {
  try {
    await client.connect()
    console.log('Connected to Postgres')
    
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log('Tables in public schema:')
    res.rows.forEach(row => console.log(`- ${row.table_name}`))
    
    // Also check if they have content
    for (const row of res.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${row.table_name}"`)
      console.log(`  Count for ${row.table_name}: ${countRes.rows[0].count}`)
    }
    
    await client.end()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

listTables()
