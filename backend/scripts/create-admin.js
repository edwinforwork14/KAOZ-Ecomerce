require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'edwinforwork14@gmail.com';
  const password = '123456789';
  const firstName = 'Edwin';
  const lastName = 'Admin';

  console.log(`🚀 Intentando crear usuario admin: ${email}...`);

  try {
    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear o actualizar el usuario
    const user = await prisma.user.upsert({
      where: { email: email },
      update: {
        password: hashedPassword,
        role: 'admin',
        isActive: true
      },
      create: {
        email: email,
        password: hashedPassword,
        firstName: firstName,
        lastName: lastName,
        role: 'admin',
        isActive: true
      }
    });

    console.log('✅ Usuario admin creado/actualizado con éxito:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

  } catch (error) {
    console.error('❌ Error al crear usuario admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
