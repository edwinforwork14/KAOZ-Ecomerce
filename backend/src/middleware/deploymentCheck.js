const Deployment = require("../services/deploymentService");

const checkDeploymentActive = async (req, res, next) => {
  try {
    const activeDeployment = await Deployment.getActiveDeployment();
    
    // Si no hay implementación activa O es el fallback (porque la DB falló)
    // seguimos adelante para permitir que los controladores manejen sus propios fallbacks.
    if (!activeDeployment && process.env.NODE_ENV === "production") {
      return res.status(503).json({
        success: false,
        message: "Servicio en mantenimiento - Implementación no activa",
      });
    }

    req.activeDeployment = activeDeployment || { isActive: true };
    next();
  } catch (error) {
    console.error("⚠️ Error en middleware de implementación (resiliencia activada):", error.message);
    // En lugar de devolver 500, dejamos pasar la petición para que los fallbacks de los controllers actúen
    req.activeDeployment = { id: "fallback-active", isActive: true, version: "fallback" };
    next();
  }
};

module.exports = checkDeploymentActive;