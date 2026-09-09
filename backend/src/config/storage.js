const fs = require("fs");
const path = require("path");

/**
 * Capa de almacenamiento de imágenes en disco local (Contabo VPS).
 * Reemplaza a Supabase Storage. Guarda los archivos en <repo>/uploads/products
 * y sirven a través de las rutas estáticas /uploads y /images definidas en server.js.
 */

const UPLOADS_ROOT = path.join(__dirname, "../../uploads");
const PRODUCTS_DIR = path.join(UPLOADS_ROOT, "products");

// URL pública base del backend (ej: https://api.midominio.com)
// Si no está definida, se construye una URL relativa.
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

const ensureProductsDir = () => {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  }
};

/**
 * Sube un buffer al disco bajo el bucket lógico "products".
 * @param {string} filePath Ruta relativa dentro de products (ej: "product-123.webp" o "bulk/<sessionId>/<file>.webp")
 * @param {Buffer} buffer Contenido del archivo
 * @param {object} opts { contentType, cacheControl }
 * @returns {Promise<{ publicUrl: string }>}
 */
const uploadFile = async (filePath, buffer, opts = {}) => {
  const absolutePath = path.join(PRODUCTS_DIR, filePath);

  // Prevenir path traversal
  if (!absolutePath.startsWith(PRODUCTS_DIR)) {
    throw new Error("Ruta de archivo inválida");
  }

  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, buffer);

  return { publicUrl: getPublicUrl(filePath) };
};

/**
 * Genera la URL pública para un archivo del bucket "products".
 * Acepta rutas relativas ("product-123.webp", "bulk/x/y.webp") o URLs absolutas
 * previamente guardadas (las devuelve sin cambios).
 */
const getPublicUrl = (filePath) => {
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const cleanPath = filePath.replace(/^\/+/, "");
  if (PUBLIC_BASE_URL) {
    return `${PUBLIC_BASE_URL}/uploads/products/${cleanPath}`;
  }
  return `/uploads/products/${cleanPath}`;
};

/**
 * Elimina archivos del bucket "products".
 * Acepta rutas relativas o URLs públicas completas (extrae la ruta relativa).
 * No lanza error si el archivo no existe (comportamiento best-effort como Supabase).
 * @param {string[]} pathsOrUrls
 */
const removeFiles = async (pathsOrUrls) => {
  for (const item of pathsOrUrls || []) {
    if (!item) continue;
    try {
      let relativePath = item;

      // Si es una URL completa, extraer la parte después de /uploads/products/
      const marker = "/uploads/products/";
      const idx = item.indexOf(marker);
      if (idx !== -1) {
        relativePath = item.substring(idx + marker.length).split("?")[0];
      } else if (/^https?:\/\//i.test(item)) {
        // URL externa o de Supabase antigua: no tocar archivos locales
        continue;
      }

      const absolutePath = path.join(PRODUCTS_DIR, relativePath);
      if (!absolutePath.startsWith(PRODUCTS_DIR)) continue;

      await fs.promises.unlink(absolutePath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.warn("⚠️ [STORAGE] No se pudo eliminar el archivo:", item, err.message);
      }
    }
  }
};

module.exports = {
  uploadFile,
  getPublicUrl,
  removeFiles,
  PRODUCTS_DIR,
};
