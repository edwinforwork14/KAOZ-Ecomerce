/**
 * KAOZ Admin Setup Script
 * ========================
 * Crea o actualiza un usuario administrador directamente en la base de datos.
 * Usa autenticación 100% del backend (bcrypt + JWT), sin depender de Supabase.
 *
 * USO:
 *   node scratch/setup-admin.js
 *
 * O con credenciales personalizadas:
 *   ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD=tuPassword123 node scratch/setup-admin.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "edwinforwork14@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Kaoz2024Admin!";
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || "Edwin";
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || "Admin";

async function main() {
  console.log("🚀 KAOZ Admin Setup");
  console.log("===================");
  console.log(`📧 Email: ${ADMIN_EMAIL}`);

  // Hash de la contraseña
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

  // Verificar si ya existe
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    // Actualizar contraseña y promover a admin
    const updated = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        password: hashedPassword,
        role: "admin",
        isActive: true,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
      },
    });
    console.log(`\n✅ Usuario existente actualizado a ADMIN`);
    console.log(`   ID:    ${updated.id}`);
    console.log(`   Email: ${updated.email}`);
    console.log(`   Rol:   ${updated.role}`);
  } else {
    // Crear nuevo admin
    const created = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        role: "admin",
        isActive: true,
        phone: "",
      },
    });
    console.log(`\n✅ Nuevo usuario ADMIN creado`);
    console.log(`   ID:    ${created.id}`);
    console.log(`   Email: ${created.email}`);
    console.log(`   Rol:   ${created.role}`);
  }

  console.log(`\n🔑 Credenciales de acceso:`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`\n🌐 Entra al dashboard en: http://localhost:3000/auth/login`);
  console.log(`\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login en producción.\n`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
