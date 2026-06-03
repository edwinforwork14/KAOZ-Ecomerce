const bulkProductService = require("../services/bulkProductService");
const { prisma } = require("../config/database");
const fs = require("fs");

/**
 * Inicia una sesión de carga masiva
 */
exports.initSession = async (req, res) => {
  try {
    const session = await bulkProductService.createSession(req.user.id);
    res.status(201).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Sube imágenes a una sesión
 */
exports.uploadImages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await bulkProductService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: "Sesión no encontrada" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No se subieron archivos" });
    }

    const uploadPromises = req.files.map(file => 
      bulkProductService.processAndUploadImage(file, sessionId)
    );

    const uploadedAssets = await Promise.all(uploadPromises);
    
    // Actualizar sesión con nuevos assets
    const currentAssets = session.assets || {};
    uploadedAssets.forEach(asset => {
      currentAssets[asset.originalName] = asset;
    });

    // Generar o actualizar drafts
    const newDrafts = await bulkProductService.generateDraftsFromAssets(sessionId, currentAssets);

    const updatedSession = await prisma.bulkUploadSession.update({
      where: { id: sessionId },
      data: { 
        assets: currentAssets,
        drafts: newDrafts,
        totalItems: newDrafts.length
      }
    });

    res.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error("Error in uploadImages controller:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtiene el estado de una sesión
 */
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await bulkProductService.getSession(id);
    if (!session) return res.status(404).json({ success: false, message: "Sesión no encontrada" });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualiza los drafts de la sesión
 */
exports.updateSessionDrafts = async (req, res) => {
  try {
    const { id } = req.params;
    const { drafts } = req.body;
    const session = await bulkProductService.updateDrafts(id, drafts);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Publica la sesión
 */
exports.publishSession = async (req, res) => {
  try {
    const { id } = req.params;
    const results = await bulkProductService.publishSession(id);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Elimina un asset de la sesión
 */
exports.deleteSessionAsset = async (req, res) => {
  try {
    const { id, assetKey } = req.params;
    const session = await bulkProductService.deleteSessionAsset(id, decodeURIComponent(assetKey));
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Valida la sesión completa y devuelve reporte
 */
exports.validateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = await bulkProductService.validateSession(id);
    res.json({ success: true, ...validation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
