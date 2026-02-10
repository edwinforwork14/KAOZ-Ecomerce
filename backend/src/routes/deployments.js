const express = require("express");
const router = express.Router();
const deploymentController = require("../controllers/deploymentController");

// Todas las rutas son públicas para el panel de control directo
// La seguridad se maneja en el frontend con contraseña

// GET /api/deployments - Listar todas las implementaciones
router.get("/", deploymentController.getDeployments);

// PUT /api/deployments/:id/toggle - Activar/desactivar implementación
router.put("/:id/toggle", deploymentController.toggleDeployment);

// GET /api/deployments/active - Obtener implementación activa
router.get("/active", deploymentController.getActiveDeployment);

module.exports = router;