require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Usamos DIRECT_URL para tener permisos de administrador en la DB
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function confirmUser() {
  const email = 'edwinforwork14@gmail.com';
  console.log(`🔧 Intentando confirmar email para: ${email} vía SQL directo...`);

  try {
    // Intentamos actualizar la tabla auth.users directamente
    // Nota: Esto requiere que el usuario de la DB tenga permisos sobre el esquema auth
    // En Supabase, el usuario 'postgres' suele tenerlos.
    const result = await prisma.$executeRawUnsafe(
      `UPDATE auth.users SET email_confirmed_at = NOW(), confirmed_at = NOW(), last_sign_in_at = NOW() WHERE email = $1`,
      email
    );

    if (result > 0) {
      console.log('✅ Email confirmado exitosamente en Supabase Auth.');
    } else {
      console.log('⚠️ No se encontró el usuario en auth.users o ya estaba confirmado.');
    }

  } catch (error) {
    console.error('❌ Error al confirmar usuario vía SQL:', error.message);
    console.log('\n💡 Sugerencia: Si este script falló por permisos, por favor desactiva "Confirm Email" en el Dashboard de Supabase (Authentication -> Providers -> Email).');
  } finally {
    await prisma.$disconnect();
  }
}

confirmUser();
