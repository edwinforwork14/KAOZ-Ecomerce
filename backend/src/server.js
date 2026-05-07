require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const cron = require("node-cron");
const { execSync } = require("child_process");

const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const Deployment = require("./services/deploymentService");
const Product = require("./services/productService");
const Settings = require("./services/settingsService");
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

// Conectar a la base de datos
connectDB();

// Registrar implementación actual
(async () => {
  try {
    const version = execSync("git rev-parse HEAD").toString().trim();
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

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://yenfit.shop",
  "https://www.yenfit.shop",
  "http://yenfit.shop",
  "http://www.yenfit.shop",
];

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS bloqueado para origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(morgan("dev"));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Servir archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Rutas - Ordenadas por especificidad (más específicas primero)
app.use("/api/deployments", deploymentRoutes);
app.use("/api/auth", authRoutes); // Permitir auth para que el admin pueda entrar a activar el sistema

// Aplicar el "seguro" de implementación activa al resto de las rutas
app.use("/api/products", checkDeploymentActive, productRoutes);
// Ruta de prueba
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "YF E-commerce API",
    version: "2.0.0",
  });
});

// Ruta de diagnóstico
app.get("/api/debug", (req, res) => {
  res.json({
    success: true,
    message: "Diagnóstico",
    headers: req.headers,
    timestamp: new Date().toISOString(),
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

// ===== TAREAS PROGRAMADAS =====

// Actualizar tasa de cambio cada hora
cron.schedule("0 * * * *", async () => {
  console.log("⏰ Actualizando tasa de cambio...");
  try {
    const result = await ExchangeRate.updateFromAPI();
    if (result.success) {
      console.log("✅ Tasa de cambio actualizada:", result.current);
    } else {
      console.error("❌ Error al actualizar tasa:", result.message);
    }
  } catch (error) {
    console.error("❌ Error en cron de tasa:", error.message);
  }
});

// Actualizar estado "nuevo" de productos cada día a las 00:00
cron.schedule("0 0 * * *", async () => {
  console.log("⏰ Actualizando estado de productos nuevos...");
  try {
    const settings = await Settings.getSettings();
    const result = await Product.updateNewStatus(settings.newProductDuration);
    console.log(`✅ Productos actualizados: ${result.updated}`);
  } catch (error) {
    console.error("❌ Error en cron de productos:", error.message);
  }
});

// Actualizar tasa de cambio al iniciar el servidor
(async () => {
  try {
    console.log("🔄 Sincronizando tasa de cambio inicial...");
    await ExchangeRate.updateFromAPI();
    console.log("✅ Tasa de cambio sincronizada");
  } catch (error) {
    console.error("❌ Error al sincronizar tasa inicial:", error.message);
  }
})();

// Manejo de errores
app.use(errorHandler);

// Ruta 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📝 Modo: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
