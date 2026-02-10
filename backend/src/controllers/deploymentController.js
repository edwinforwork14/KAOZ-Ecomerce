const Deployment = require("../models/Deployment");

exports.getDeployments = async (req, res) => {
  try {
    const deployments = await Deployment.find().sort({ deployedAt: -1 });
    res.json({
      success: true,
      data: deployments,
    });
  } catch (error) {
    console.error("Error al obtener implementaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener implementaciones",
    });
  }
};

exports.toggleDeployment = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const deployment = await Deployment.toggleDeployment(id, isActive);
    if (!deployment) {
      return res.status(404).json({
        success: false,
        message: "Implementación no encontrada",
      });
    }

    res.json({
      success: true,
      data: deployment,
      message: `Implementación ${isActive ? "activada" : "desactivada"}`,
    });
  } catch (error) {
    console.error("Error al cambiar estado de implementación:", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar estado de implementación",
    });
  }
};

exports.getActiveDeployment = async (req, res) => {
  try {
    const deployment = await Deployment.getActiveDeployment();
    res.json({
      success: true,
      data: deployment,
    });
  } catch (error) {
    console.error("Error al obtener implementación activa:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener implementación activa",
    });
  }
};