require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function resetAdmin() {
  const email = process.env.ADMIN_EMAIL || "edwinforwork14@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "kaozadmin2024";

  console.log(`🧹 [RESET] Cleaning up admin user: ${email}`);

  try {
    // 1. Eliminar cualquier rastro del usuario con ese email
    await prisma.user.deleteMany({
      where: { email: email }
    });

    // 2. Crear el nuevo usuario admin con ROL EXPLÍCITO y UUID
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: email,
        password: hashedPassword,
        firstName: "Edwin",
        lastName: "Admin",
        role: "admin", // IMPORTANTE
        isActive: true,
        phone: "123456789"
      }
    });

    console.log("✅ [RESET] Nuevo Admin creado exitosamente:");
    console.log(`   ID: ${newAdmin.id}`);
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   Rol: ${newAdmin.role}`);

  } catch (error) {
    console.error("❌ [RESET] Error fatal:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
