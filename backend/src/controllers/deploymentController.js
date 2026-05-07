const { prisma } = require("../config/database");
const Deployment = require("../services/deploymentService");

exports.getDeployments = async (req, res) => {
  try {
    const deployments = await prisma.deployment.findMany({
      orderBy: { deployedAt: 'desc' }
    });
    res.json({ success: true, data: deployments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener implementaciones" });
  }
};

exports.toggleDeployment = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const deployment = await Deployment.toggleDeployment(id, isActive);
    res.json({ success: true, data: deployment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado" });
  }
};

exports.getActiveDeployment = async (req, res) => {
  try {
    const deployment = await Deployment.getActiveDeployment();
    res.json({ success: true, data: deployment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener activa" });
  }
};