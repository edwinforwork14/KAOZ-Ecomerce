const { PrismaClient } = require("@prisma/client");

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // En desarrollo, adjuntamos el cliente al objeto global para evitar
  // que se agoten las conexiones durante los reinicios de nodemon.
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Supabase (PostgreSQL) via Prisma conectado");
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:", error.message);
    // No salimos del proceso para permitir reintentos o manejo de errores superior
  }
};

module.exports = connectDB;
module.exports.prisma = prisma;
