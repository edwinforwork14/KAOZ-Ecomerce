const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const { supabase } = require("../config/supabase");

// 1. Configuración de Directorios
const uploadDir = path.join(__dirname, "../../uploads/products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Almacenamiento en MEMORIA (Crucial)
const storage = multer.memoryStorage();

// 3. Filtro de Archivos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif|avif|tiff|tif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  // Aceptamos si la extensión es válida, ignoramos mimetype estricto por bugs de heic
  if (extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Formato no válido. Se permiten: jpg, png, gif, webp, heic, avif"
      )
    );
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter,
});

// 4. Middleware de Procesamiento (Soporte para Arrays)
const processImage = async (req, res, next) => {
  // Verificamos si hay archivos (soporta tanto un archivo simple como un array)
  if (!req.files && !req.file) return next();

  try {
    // Normalizamos para trabajar siempre con un array
    const files = req.files || [req.file];

    // Procesamos todas las imágenes en paralelo
    await Promise.all(
      files.map(async (file) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename = `product-${uniqueSuffix}.webp`;
        const outputPath = path.join(uploadDir, filename);

        let inputBuffer = file.buffer;

        // Detectar si es formato HEIC/HEIF (iPhones)
        const isHeic = file.originalname.toLowerCase().endsWith('.heic') || file.originalname.toLowerCase().endsWith('.heif');
        if (isHeic) {
          inputBuffer = await heicConvert({
            buffer: file.buffer,
            format: 'JPEG',
            quality: 1 // 1 = Máxima calidad
          });
        }

        // Convertir a buffer en memoria
        const buffer = await sharp(inputBuffer)
          .toFormat("webp", { quality: 80 })
          .toBuffer();

        // Subir a Supabase Storage bucket "products"
        const { data, error } = await supabase.storage
          .from("products")
          .upload(filename, buffer, {
            contentType: "image/webp",
            upsert: false,
          });

        if (error) {
          throw error;
        }

        // Obtener URL pública
        const { data: publicData } = supabase.storage
          .from("products")
          .getPublicUrl(filename);

        // ACTUALIZAMOS la información del archivo en el request
        file.filename = filename;
        file.url = publicData.publicUrl; // Importante: pasamos directamente la URL completa de Supabase
        file.mimetype = "image/webp";
        // Ya no necesitamos destination ni path local
      })
    );

    next();
  } catch (error) {
    console.error("Error procesando imágenes:", error);
    return res.status(500).json({
      success: false,
      message: "Error al procesar las imágenes (conversión fallida)",
      error: error.message || error,
    });
  }
};

module.exports = { upload, processImage };
