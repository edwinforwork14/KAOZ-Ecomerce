const { prisma } = require("../config/database");
const { supabase } = require("../config/supabase");
const sharp = require("sharp");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const heicConvert = require("heic-convert");

class BulkProductService {
  /**
   * Inicializa una nueva sesión de carga masiva
   */
  async createSession(userId) {
    return await prisma.bulkUploadSession.create({
      data: {
        userId,
        status: "uploading",
        drafts: [],
        assets: {}
      }
    });
  }

  /**
   * Obtiene una sesión por ID
   */
  async getSession(sessionId) {
    return await prisma.bulkUploadSession.findUnique({
      where: { id: sessionId }
    });
  }

  /**
   * Procesa y sube una imagen a Supabase Storage
   */
  async processAndUploadImage(file, sessionId) {
    try {
      const fileName = `${uuidv4()}.webp`;
      const filePath = `bulk/${sessionId}/${fileName}`;

      let inputBuffer = file.buffer;

      // Soporte para HEIC (iPhone)
      const isHeic = file.originalname.toLowerCase().endsWith('.heic') || file.originalname.toLowerCase().endsWith('.heif');
      if (isHeic) {
        inputBuffer = await heicConvert({
          buffer: file.buffer,
          format: 'JPEG',
          quality: 1
        });
      }

      // Procesar con Sharp
      const buffer = await sharp(inputBuffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const { data, error } = await supabase.storage
        .from("products")
        .upload(filePath, buffer, {
          contentType: "image/webp",
          cacheControl: "3600"
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      return {
        originalName: file.originalname,
        url: publicUrlData.publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error("Error processing image:", error);
      throw error;
    }
  }

  /**
   * Genera drafts inteligentes basados en los assets subidos
   */
  async generateDraftsFromAssets(sessionId, assets) {
    const drafts = [];
    const groupedAssets = {};

    // Agrupar por nombre base (removiendo números finales y extensiones)
    Object.values(assets).forEach(asset => {
      const baseName = asset.originalName
        .replace(/\.[^/.]+$/, "") // Quitar extensión
        .replace(/[-_]\d+$/, "")   // Quitar sufijos numéricos como -1, _2
        .replace(/\s+\d+$/, "")    // Quitar espacios + números
        .trim();

      if (!groupedAssets[baseName]) {
        groupedAssets[baseName] = [];
      }
      groupedAssets[baseName].push(asset);
    });

    for (const [name, images] of Object.entries(groupedAssets)) {
      // Intentar limpiar el nombre para que parezca un producto real
      const cleanName = name
        .split(/[-_\s]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      drafts.push({
        id: uuidv4(),
        name: cleanName,
        slug: this.generateSlug(cleanName),
        description: `Producto de alta calidad: ${cleanName}`,
        price: 0,
        originalPrice: null,
        stock: 0,
        categoryId: null,
        subcategoryId: null,
        brand: "KAOZ",
        isNew: true,
        isActive: false, // Por defecto inactivo hasta revisión
        images: images.map((img, idx) => ({
          url: img.url,
          isMain: idx === 0,
          originalName: img.originalName
        })),
        variants: [
          {
            color: "N/A",
            sizes: [
              { size: "Única", stock: 0 }
            ]
          }
        ],
        tags: [],
        status: "incomplete",
        errors: ["Precio es requerido", "Falta categoría"]
      });
    }

    return drafts;
  }

  /**
   * Actualiza los drafts de una sesión
   */
  async updateDrafts(sessionId, drafts) {
    // Aquí se podrían añadir validaciones antes de guardar
    const validatedDrafts = drafts.map(draft => this.validateDraft(draft));
    
    return await prisma.bulkUploadSession.update({
      where: { id: sessionId },
      data: { 
        drafts: validatedDrafts,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Valida un draft individualmente
   */
  validateDraft(draft) {
    const errors = [];
    if (!draft.name || draft.name.trim().length < 3) errors.push("Nombre inválido");
    if (!draft.price || draft.price <= 0) errors.push("Precio debe ser mayor a 0");
    if (!draft.categoryId) errors.push("Categoría requerida");
    if (!draft.images || draft.images.length === 0) errors.push("Al menos una imagen requerida");

    return {
      ...draft,
      errors,
      status: errors.length === 0 ? "valid" : "invalid"
    };
  }

  /**
   * Publica los productos de una sesión
   */
  async publishSession(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session || session.status === "completed") {
      throw new Error("Sesión no válida o ya completada");
    }

    const validDrafts = session.drafts.filter(d => d.status === "valid");
    const results = {
      created: 0,
      failed: 0,
      errors: []
    };

    for (const draft of validDrafts) {
      try {
        await prisma.product.create({
          data: {
            name: draft.name,
            description: draft.description || "",
            price: parseFloat(draft.price),
            originalPrice: draft.originalPrice ? parseFloat(draft.originalPrice) : null,
            categoryId: draft.categoryId,
            subcategoryId: draft.subcategoryId,
            isActive: draft.isActive,
            isNew: draft.isNew,
            markedAsNewAt: draft.isNew ? new Date() : null,
            brand: draft.brand || "KAOZ",
            tags: draft.tags || [],
            images: {
              create: draft.images.map(img => ({
                url: img.url,
                alt: draft.name,
                isMain: img.isMain
              }))
            },
            variants: {
              create: (draft.variants || []).map(v => ({
                color: v.color || "N/A",
                sizes: {
                  create: (v.sizes || []).map(s => ({
                    size: s.size,
                    stock: parseInt(s.stock) || 0
                  }))
                }
              }))
            }
          }
        });
        results.created++;
      } catch (error) {
        console.error(`Error publishing product ${draft.name}:`, error);
        results.failed++;
        results.errors.push({ name: draft.name, error: error.message });
      }
    }

    await prisma.bulkUploadSession.update({
      where: { id: sessionId },
      data: { status: "completed" }
    });

    return results;
  }

  generateSlug(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
}

module.exports = new BulkProductService();
