require('dotenv').config();
const { Client } = require('pg');

async function confirmUser() {
  const email = 'edwinforwork14@gmail.com';
  const connectionString = process.env.DIRECT_URL;

  console.log(`🔧 Intentando confirmar email para: ${email} (sólo email_confirmed_at)...`);

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Actualizamos sólo email_confirmed_at
    const query = `
      UPDATE auth.users 
      SET email_confirmed_at = NOW()
      WHERE email = $1
    `;
    
    const res = await client.query(query, [email]);

    if (res.rowCount > 0) {
      console.log('✅ Email marcado como confirmado en Supabase Auth.');
    } else {
      console.log('⚠️ No se encontró el usuario en auth.users.');
    }

  } catch (error) {
    console.error('❌ Error al confirmar usuario vía SQL:', error.message);
  } finally {
    await client.end();
  }
}

confirmUser();
