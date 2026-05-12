const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testLogin() {
  const email = "edwinzuleta13@gmail.com";
  const password = "kaozadmin2024";

  console.log(`🔍 [TEST] Probando login para: ${email}`);

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log("❌ Usuario no encontrado en la base de datos.");
      return;
    }

    console.log("✅ Usuario encontrado. Verificando contraseña...");
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      console.log("🎉 ¡LOGIN EXITOSO! La contraseña coincide.");
      console.log(`   Rol: ${user.role}`);
    } else {
      console.log("❌ Contraseña INCORRECTA.");
    }
  } catch (error) {
    console.error("❌ Error durante la prueba:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
