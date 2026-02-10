const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

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

        // Convertir y guardar
        await sharp(file.buffer)
          .toFormat("webp", { quality: 80 })
          .toFile(outputPath);

        // ACTUALIZAMOS la información del archivo en el request
        // Esto es clave: engañamos al controlador haciéndole creer
        // que multer guardó el archivo en disco, pero fuimos nosotros con Sharp.
        file.filename = filename;
        file.path = outputPath;
        file.mimetype = "image/webp";
        // Importante: Multer memoryStorage no pone 'destination', lo agregamos
        file.destination = uploadDir;
      })
    );

    next();
  } catch (error) {
    console.error("Error procesando imágenes:", error);
    return res.status(500).json({
      success: false,
      message: "Error al procesar las imágenes (conversión fallida)",
    });
  }
};

module.exports = { upload, processImage };
