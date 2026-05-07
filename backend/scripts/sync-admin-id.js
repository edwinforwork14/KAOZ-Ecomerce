require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function syncAdmin() {
  const authId = '652026b4-9b5e-4863-9f72-22ffd23e9d31';
  const email = 'edwinforwork14@gmail.com';
  const password = '123456789';

  console.log(`🚀 Sincronizando usuario admin en tabla public.User: ${email}...`);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Eliminar cualquier usuario existente con ese email que NO tenga el ID de Auth correcto
    await prisma.user.deleteMany({
      where: {
        email: email,
        id: { not: authId }
      }
    });

    // 2. Upsert con el ID correcto
    const user = await prisma.user.upsert({
      where: { id: authId },
      update: {
        email: email,
        role: 'admin',
        isActive: true
      },
      create: {
        id: authId,
        email: email,
        password: hashedPassword,
        firstName: 'Edwin',
        lastName: 'Admin',
        role: 'admin',
        isActive: true
      }
    });

    console.log('✅ Usuario sincronizado con éxito:');
    console.log(`   ID: ${user.id} (Matches Supabase Auth)`);
    console.log(`   Email: ${user.email}`);

  } catch (error) {
    console.error('❌ Error al sincronizar usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncAdmin();
