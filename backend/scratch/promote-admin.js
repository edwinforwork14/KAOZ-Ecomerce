const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const email = process.argv[2];

if (!email) {
  console.error("❌ Por favor proporciona un email: node promote-admin.js user@example.com");
  process.exit(1);
}

async function promote() {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ Usuario con email ${email} no encontrado en la base de datos local.`);
      console.log("Asegúrate de que el usuario ya se haya registrado en la app.");
      process.exit(1);
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: "admin" },
    });

    console.log(`✅ ¡ÉXITO! Usuario ${email} ahora tiene el rol: ${updatedUser.role}`);
    console.log("Reinicia tu sesión en el dashboard para aplicar los cambios.");
  } catch (error) {
    console.error("❌ Error al promover usuario:", error);
  } finally {
    await prisma.$disconnect();
  }
}

promote();
