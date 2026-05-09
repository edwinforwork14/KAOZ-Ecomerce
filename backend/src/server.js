require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");

// Notas: node-cron y execSync (git) no son compatibles con Vercel Serverless
// Las tareas programadas deben configurarse en el panel de Vercel (Cron Jobs)

const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const Deployment = require("./services/deploymentService");
const ExchangeRate = require("./services/exchangeRateService");

// Rutas
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const analyticsRoutes = require("./routes/analytics");
const publicRoutes = require("./routes/public");
const settingsRoutes = require("./routes/settings");
const deploymentRoutes = require("./routes/deployments");
const checkDeploymentActive = require("./middleware/deploymentCheck");

const app = express();

// Conectar a la base de datos (se maneja la conexión persistente en config/database)
connectDB();

// Registrar implementación actual (usando variables de entorno de Vercel si existen)
(async () => {
  try {
    const version = process.env.VERCEL_GIT_COMMIT_SHA || "local-dev";
    const environment = process.env.NODE_ENV || "development";
    await Deployment.registerDeployment(version, environment);
  } catch (error) {
    console.error("❌ Error al registrar implementación:", error.message);
  }
})();

// Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.set("trust proxy", 1);

// Configuración de CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://kaoz-ecomerce.vercel.app',
  'http://localhost:3000'
].filter(Boolean);

app.use((req, res, next) => {
  console.log(`📡 [BACKEND] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 [CORS] bloqueado para:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Servir archivos estáticos (Nota: Vercel no persiste archivos en /uploads, usar Supabase Storage)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Rutas
app.use("/api/deployments", deploymentRoutes);
app.use("/api/auth", authRoutes);

// Ruta de prueba/salud
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "YF E-commerce API (Vercel Serverless)",
    version: "2.1.0",
    environment: process.env.NODE_ENV
  });
});

// Aplicar el "seguro" de implementación activa al resto de las rutas
app.use("/api/products", checkDeploymentActive, productRoutes);
app.use("/api/cart", checkDeploymentActive, cartRoutes);
app.use("/api/orders", checkDeploymentActive, orderRoutes);
app.use("/api/admin", checkDeploymentActive, adminRoutes);
app.use("/api/analytics", checkDeploymentActive, analyticsRoutes);
app.use("/api/settings", checkDeploymentActive, settingsRoutes);
app.use("/api/public", checkDeploymentActive, publicRoutes);
app.use("/api", checkDeploymentActive, publicRoutes);

// Manejo de errores
app.use(errorHandler);

// Ruta 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// Solo iniciar el servidor si no estamos en Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5010;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor local corriendo en puerto ${PORT}`);
    console.log(`✅ Supabase (PostgreSQL) via Prisma conectado`);
  });

  // Manejo de errores del servidor (como EADDRINUSE)
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ El puerto ${PORT} ya está en uso. Intenta cerrando otros procesos o usa otro puerto.`);
      process.exit(1);
    } else {
      console.error('❌ Error en el servidor:', error);
    }
  });

// Inicialización del servidor (Solo para entornos que no sean Vercel Serverless)
const PORT = process.env.PORT || 5010;

// En Railway, process.env.PORT siempre está definido. 
// En Vercel Serverless, no queremos correr app.listen()
if (process.env.PORT && process.env.VERCEL !== '1') {
  const server = app.listen(PORT, () => {
    console.log(`
🚀 [SERVER] KAOZ API Online
📡 [PORT] ${PORT}
🌍 [ENV] ${process.env.NODE_ENV}
    `);
  });

  // Cierre gracioso (Graceful Shutdown)
  const shutdown = async () => {
    console.log('🛑 [SERVER] Recibida señal de cierre. Cerrando...');
    server.close(() => {
      console.log('📡 [SERVER] Servidor HTTP cerrado.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Exportar para Vercel
module.exports = app;
