const Deployment = require("../services/deploymentService");

const checkDeploymentActive = async (req, res, next) => {
  try {
    const activeDeployment = await Deployment.getActiveDeployment();
    if (!activeDeployment) {
      return res.status(503).json({
        success: false,
        message: "Servicio no disponible - Implementación no activa",
      });
    }
    // Agregar la implementación activa a req para uso posterior
    req.activeDeployment = activeDeployment;
    next();
  } catch (error) {
    console.error("Error al verificar implementación activa:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

module.exports = checkDeploymentActive;