const { prisma } = require("../config/database");
const zernioService = require("../services/zernioService");

/**
 * GET /api/settings/zernio
 * Retrieves the current Zernio integration configuration, connection state, cached posts, and diagnostic logs.
 */
exports.getZernioConfig = async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "global" }
    });

    if (!settings || !settings.zernioConfig) {
      return res.json({
        success: true,
        config: {
          apiKey: "",
          connected: false,
          accountId: "",
          username: "",
          displayName: "",
          profilePicture: "",
          limit: 7,
          posts: [],
          logs: [{
            timestamp: new Date().toISOString(),
            type: "info",
            message: "Módulo de Instagram inicializado. Listo para vincular Zernio."
          }],
          lastSyncedAt: null
        }
      });
    }

    // Mask the API Key for security in the response
    const config = { ...settings.zernioConfig };
    if (config.apiKey) {
      config.apiKey = config.apiKey.substring(0, 8) + "..." + config.apiKey.substring(config.apiKey.length - 8);
    }

    res.json({ success: true, config });
  } catch (error) {
    console.error("❌ [ZERNIO CONTROLLER] Error en getZernioConfig:", error.message);
    res.status(500).json({
      success: false,
      message: "Error al obtener la configuración de Zernio",
      error: error.message
    });
  }
};

/**
 * POST /api/settings/zernio/connect
 * Establishes connection by verifying API Key, linking Instagram account, doing initial sync, and caching data.
 */
exports.connectZernio = async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({
      success: false,
      message: "La API Key de Zernio es requerida para iniciar el enlace"
    });
  }

  try {
    console.log("🔗 [ZERNIO CONTROLLER] Iniciando vinculación de API Key...");
    
    // 1. Verificar conexión a Zernio
    await zernioService.verifyConnection(apiKey);

    // 2. Buscar cuenta de Instagram activa
    const igAccount = await zernioService.getInstagramAccount(apiKey);

    if (!igAccount) {
      return res.status(400).json({
        success: false,
        message: "API Key válida, pero no se encontró ninguna cuenta de Instagram Business o Creator conectada y activa en Zernio. Asegúrate de conectar tu Instagram en el panel de Zernio primero."
      });
    }

    // 3. Traer posts iniciales
    const settings = await prisma.settings.findUnique({
      where: { id: "global" }
    });
    
    const limit = (settings?.zernioConfig?.limit) || 7;
    const posts = await zernioService.fetchInstagramPosts(apiKey, igAccount._id, limit);

    // 4. Armar log
    const username = igAccount.username || "Usuario IG";
    const initialLogs = zernioService.appendLog(
      [],
      "info",
      `Conexión inicial establecida exitosamente. Vinculado a @${username} y sincronizados ${posts.length} posts.`
    );

    // 5. Guardar configuraciones completas
    const newConfig = {
      apiKey: apiKey.trim(),
      connected: true,
      accountId: igAccount._id,
      username: igAccount.username || "",
      displayName: igAccount.displayName || "",
      profilePicture: igAccount.profilePicture || "",
      limit,
      posts,
      logs: initialLogs,
      lastSyncedAt: new Date().toISOString(),
      reconnectAttempts: 0
    };

    const updatedSettings = await prisma.settings.update({
      where: { id: "global" },
      data: { zernioConfig: newConfig }
    });

    // Enmascarar API Key para retornar
    const returnedConfig = { ...newConfig };
    returnedConfig.apiKey = returnedConfig.apiKey.substring(0, 8) + "..." + returnedConfig.apiKey.substring(returnedConfig.apiKey.length - 8);

    res.json({
      success: true,
      message: `Enlace establecido correctamente con @${igAccount.username}!`,
      config: returnedConfig
    });
  } catch (error) {
    console.error("❌ [ZERNIO CONTROLLER] Error en connectZernio:", error.message);
    
    // Registrar error en la DB si ya existe la configuración para guardar el log del fallo
    try {
      const settings = await prisma.settings.findUnique({ where: { id: "global" } });
      if (settings) {
        const config = settings.zernioConfig || {};
        const logs = zernioService.appendLog(config.logs || [], "error", `Fallo al intentar conectar: ${error.message}`);
        await prisma.settings.update({
          where: { id: "global" },
          data: { zernioConfig: { ...config, logs } }
        });
      }
    } catch (logErr) {
      console.error("Fallo al escribir log de error de conexión en DB:", logErr.message);
    }

    res.status(500).json({
      success: false,
      message: "Fallo al establecer conexión con Zernio",
      error: error.message
    });
  }
};

/**
 * POST /api/settings/zernio/disconnect
 * Manually disconnects Zernio, wiping API Key and posts while preserving diagnostic logs.
 */
exports.disconnectZernio = async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "global" }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron las configuraciones globales"
      });
    }

    const currentConfig = settings.zernioConfig || {};
    const logs = zernioService.appendLog(
      currentConfig.logs || [],
      "info",
      "Integración desvinculada manualmente por el administrador. API Key y posts limpiados."
    );

    const newConfig = {
      apiKey: "",
      connected: false,
      accountId: "",
      username: "",
      displayName: "",
      profilePicture: "",
      limit: currentConfig.limit || 7,
      posts: [],
      logs,
      lastSyncedAt: null,
      reconnectAttempts: 0
    };

    await prisma.settings.update({
      where: { id: "global" },
      data: { zernioConfig: newConfig }
    });

    res.json({
      success: true,
      message: "Desvinculación exitosa. Servicio de Instagram desactivado.",
      config: newConfig
    });
  } catch (error) {
    console.error("❌ [ZERNIO CONTROLLER] Error en disconnectZernio:", error.message);
    res.status(500).json({
      success: false,
      message: "Error al desvincular el servicio",
      error: error.message
    });
  }
};

/**
 * POST /api/settings/zernio/sync
 * Manually triggers a synchronization of Instagram posts from Zernio.
 */
exports.syncZernio = async (req, res) => {
  try {
    const syncResult = await zernioService.syncZernioData(true);
    
    if (!syncResult.success) {
      return res.status(400).json({
        success: false,
        message: syncResult.message || "Error al sincronizar datos",
        posts: syncResult.posts || []
      });
    }

    // Obtener la configuración final actualizada para retornar los logs
    const settings = await prisma.settings.findUnique({ where: { id: "global" } });
    const config = settings.zernioConfig || {};
    if (config.apiKey) {
      config.apiKey = config.apiKey.substring(0, 8) + "..." + config.apiKey.substring(config.apiKey.length - 8);
    }

    res.json({
      success: true,
      message: "Sincronización forzada completada con éxito",
      config
    });
  } catch (error) {
    console.error("❌ [ZERNIO CONTROLLER] Error en syncZernio:", error.message);
    res.status(500).json({
      success: false,
      message: "Error en el servidor al sincronizar",
      error: error.message
    });
  }
};

/**
 * PUT /api/settings/zernio/configure
 * Updates configurations like feed limits and force syncs to update cache immediately.
 */
exports.updateZernioConfig = async (req, res) => {
  const { limit } = req.body;
  const parsedLimit = parseInt(limit);

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) {
    return res.status(400).json({
      success: false,
      message: "El límite de publicaciones a mostrar debe ser un número entero entre 1 y 20"
    });
  }

  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "global" }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron las configuraciones globales"
      });
    }

    const currentConfig = settings.zernioConfig || {};
    const logs = zernioService.appendLog(
      currentConfig.logs || [],
      "info",
      `Límite de visualización de posts actualizado a ${parsedLimit}.`
    );

    const newConfig = {
      ...currentConfig,
      limit: parsedLimit,
      logs
    };

    // Actualizar configuración en la DB
    await prisma.settings.update({
      where: { id: "global" },
      data: { zernioConfig: newConfig }
    });

    // Si está conectado, forzar sincronización con el nuevo límite para refrescar caché inmediatamente
    if (currentConfig.connected) {
      await zernioService.syncZernioData(true);
    }

    // Obtener la configuración final actualizada
    const updatedSettings = await prisma.settings.findUnique({ where: { id: "global" } });
    const finalConfig = updatedSettings.zernioConfig || {};
    if (finalConfig.apiKey) {
      finalConfig.apiKey = finalConfig.apiKey.substring(0, 8) + "..." + finalConfig.apiKey.substring(finalConfig.apiKey.length - 8);
    }

    res.json({
      success: true,
      message: "Parámetros actualizados y caché regenerada",
      config: finalConfig
    });
  } catch (error) {
    console.error("❌ [ZERNIO CONTROLLER] Error en updateZernioConfig:", error.message);
    res.status(500).json({
      success: false,
      message: "Error al actualizar la configuración",
      error: error.message
    });
  }
};
