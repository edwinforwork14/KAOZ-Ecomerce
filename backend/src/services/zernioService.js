const fetch = require("node-fetch");
const { prisma } = require("../config/database");

// Base URL for Zernio API
const ZERNIO_BASE_URL = "https://zernio.com/api/v1";

/**
 * Helper to append structured activity/error logs (max 20 entries)
 */
function appendLog(currentLogs, type, message) {
  const logs = Array.isArray(currentLogs) ? currentLogs : [];
  const newLog = {
    timestamp: new Date().toISOString(),
    type, // 'info' | 'error' | 'warning'
    message
  };
  
  // Prepend new log and slice to keep only the last 20 entries
  return [newLog, ...logs].slice(0, 20);
}

/**
 * Verify Zernio API Key connection by listing profiles
 */
async function verifyConnection(apiKey) {
  if (!apiKey) {
    throw new Error("API Key de Zernio es requerida");
  }

  const url = `${ZERNIO_BASE_URL}/profiles`;
  console.log(`📡 [ZERNIO SERVICE] Verificando API Key en: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (response.status !== 200) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status} de Zernio: ${errorText || "No autorizado"}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ [ZERNIO SERVICE] Error en verifyConnection:", error.message);
    throw error;
  }
}

/**
 * Get the connected Instagram creator/business account
 */
async function getInstagramAccount(apiKey) {
  const url = `${ZERNIO_BASE_URL}/accounts`;
  console.log(`📡 [ZERNIO SERVICE] Obteniendo cuentas en: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (response.status !== 200) {
      throw new Error(`Error ${response.status} de Zernio al listar cuentas`);
    }

    const data = await response.json();
    const accounts = data.accounts || [];

    // Buscamos la primera cuenta de Instagram que esté activa
    const igAccount = accounts.find(acc => acc.platform === "instagram" && acc.isActive);
    return igAccount || null;
  } catch (error) {
    console.error("❌ [ZERNIO SERVICE] Error en getInstagramAccount:", error.message);
    throw error;
  }
}

/**
 * Fetch Instagram posts for a given account
 */
async function fetchInstagramPosts(apiKey, accountId, limit = 7) {
  const url = `${ZERNIO_BASE_URL}/accounts/${accountId}/posts`;
  console.log(`📡 [ZERNIO SERVICE] Obteniendo posts en: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (response.status !== 200) {
      throw new Error(`Error ${response.status} de Zernio al obtener posts`);
    }

    const data = await response.json();
    const rawPosts = data.posts || [];

    // Limpiar y mapear el formato de posts
    const mappedPosts = rawPosts.map(post => ({
      id: post.id,
      message: post.message || "",
      createdTime: post.createdTime,
      picture: post.picture || "",
      permalink: post.permalink || "",
      mediaType: post.mediaType || "image",
      likeCount: typeof post.likeCount === "number" ? post.likeCount : 0,
      commentCount: typeof post.commentCount === "number" ? post.commentCount : 0
    }));

    // Retornar limitados
    return mappedPosts.slice(0, limit);
  } catch (error) {
    console.error("❌ [ZERNIO SERVICE] Error en fetchInstagramPosts:", error.message);
    throw error;
  }
}

/**
 * Full Sync Orchestrator
 * Performs connection check, account details retrieval, fetches latest posts,
 * logs execution details, and caches everything in DB.
 */
async function syncZernioData(force = false) {
  console.log("🔄 [ZERNIO SERVICE] Iniciando sincronización de datos de Zernio...");
  
  try {
    // 1. Obtener configuraciones de la DB
    const settings = await prisma.settings.findUnique({
      where: { id: "global" }
    });

    if (!settings) {
      throw new Error("No se encontraron las configuraciones globales 'global' en la base de datos");
    }

    const zernioConfig = settings.zernioConfig || {};
    
    // Si no está conectado ni tiene API Key, abortar
    if (!zernioConfig.apiKey || !zernioConfig.connected) {
      console.log("⚠️ [ZERNIO SERVICE] Sincronización abortada: Zernio no está conectado o falta API Key");
      return { success: false, message: "Zernio no conectado" };
    }

    const apiKey = zernioConfig.apiKey;
    const limit = zernioConfig.limit || 7;
    let currentLogs = zernioConfig.logs || [];

    // Evitar peticiones repetidas a Zernio si se sincronizó recientemente (por ejemplo, hace menos de 10 minutos)
    // a menos que sea forzado por el admin.
    const lastSynced = zernioConfig.lastSyncedAt ? new Date(zernioConfig.lastSyncedAt) : new Date(0);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    if (!force && lastSynced > tenMinutesAgo && zernioConfig.posts && zernioConfig.posts.length > 0) {
      console.log("⏱️ [ZERNIO SERVICE] Usando caché de posts reciente (sincronizado hace menos de 10 min)");
      return { success: true, cached: true, posts: zernioConfig.posts };
    }

    let updatedLogs = currentLogs;
    let igAccount = null;
    let posts = [];

    try {
      // 2. Verificar perfiles
      await verifyConnection(apiKey);

      // 3. Obtener cuenta de Instagram activa
      igAccount = await getInstagramAccount(apiKey);

      if (!igAccount) {
        throw new Error("Conectado a Zernio, pero no se encontró ninguna cuenta de Instagram Business o Creator activa");
      }

      // 4. Buscar posts
      const accountId = igAccount._id;
      posts = await fetchInstagramPosts(apiKey, accountId, limit);

      // 5. Registrar log de éxito
      const username = igAccount.username || "Usuario IG";
      updatedLogs = appendLog(
        updatedLogs, 
        "info", 
        `Sincronización exitosa con @${username}. Se cargaron ${posts.length} posts.`
      );

      // 6. Actualizar base de datos con éxito
      const newConfig = {
        ...zernioConfig,
        connected: true,
        accountId: igAccount._id,
        username: igAccount.username || "",
        displayName: igAccount.displayName || "",
        profilePicture: igAccount.profilePicture || "",
        posts: posts,
        logs: updatedLogs,
        lastSyncedAt: new Date().toISOString(),
        reconnectAttempts: 0 // Resetear reintentos de conexión
      };

      await prisma.settings.update({
        where: { id: "global" },
        data: { zernioConfig: newConfig }
      });

      console.log(`✅ [ZERNIO SERVICE] Sincronización exitosa. Posts: ${posts.length}`);
      return { success: true, posts };
    } catch (syncError) {
      console.error("❌ [ZERNIO SERVICE] Falló la sincronización con Zernio:", syncError.message);
      
      // Implementación del sistema de reconexión automática ante fallos de la API
      const attempts = (zernioConfig.reconnectAttempts || 0) + 1;
      const isTransient = attempts <= 3; // Reintento automático hasta 3 veces
      
      updatedLogs = appendLog(
        currentLogs, 
        "error", 
        `Error de sincronización (Intento de reconexión ${attempts}/3): ${syncError.message}`
      );

      // Conservar el estado conectado y posts existentes si es un error transitorio
      const newConfig = {
        ...zernioConfig,
        reconnectAttempts: attempts,
        logs: updatedLogs,
        // Si superamos los intentos, marcamos como inactivo temporalmente o dejamos conectado usando la caché
        connected: isTransient ? true : false, 
      };

      await prisma.settings.update({
        where: { id: "global" },
        data: { zernioConfig: newConfig }
      });

      // Retornar los posts cacheados de todas formas para no romper el frontend
      return { 
        success: false, 
        message: syncError.message, 
        posts: zernioConfig.posts || [], 
        cached: true 
      };
    }
  } catch (globalError) {
    console.error("❌ [ZERNIO SERVICE] Error crítico global en syncZernioData:", globalError.message);
    return { success: false, message: globalError.message };
  }
}

module.exports = {
  verifyConnection,
  getInstagramAccount,
  fetchInstagramPosts,
  syncZernioData,
  appendLog
};
