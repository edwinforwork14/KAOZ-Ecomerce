import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function listAllTables() {
  console.log('Listing all tables via RPC or SQL...')
  // Try to query the information_schema
  const { data, error } = await supabase.rpc('get_tables') // Usually doesn't exist unless created
  if (error) {
    console.log('RPC get_tables failed, trying raw select from a known table...')
    // Try to see what hints we get from a non-existent table
    const { error: error2 } = await supabase.from('non_existent').select('*')
    console.log('Hint from non_existent:', error2?.hint)
  } else {
    console.log('Tables:', data)
  }
}

listAllTables()
