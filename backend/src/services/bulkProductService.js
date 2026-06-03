const { prisma } = require("../config/database");
const { supabase } = require("../config/supabase");
const sharp = require("sharp");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const ProductService = require("./productService");

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
        assets: {},
        progress: 0,
        totalItems: 0
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

      const isHeic = file.originalname.toLowerCase().endsWith('.heic') || file.originalname.toLowerCase().endsWith('.heif');
      if (isHeic) {
        inputBuffer = await heicConvert({
          buffer: file.buffer,
          format: 'JPEG',
          quality: 1
        });
      }

      const metadata = await sharp(inputBuffer).metadata();

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
        path: filePath,
        size: file.size,
        width: metadata.width,
        height: metadata.height,
        format: "webp"
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

    Object.values(assets).forEach(asset => {
      const baseName = asset.originalName
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]\d+$/, "")
        .replace(/\s+\d+$/, "")
        .trim();

      if (!groupedAssets[baseName]) {
        groupedAssets[baseName] = { images: [], colorVariants: [] };
      }
      groupedAssets[baseName].images.push(asset);

      // Detectar patrón de color en nombre de archivo
      const colorMatch = asset.originalName.match(/[-_](negro|blanco|rojo|azul|verde|amarillo|naranja|morado|rosa|gris|marron|beige|black|white|red|blue|green|yellow|orange|purple|pink|gray|navy)/i);
      if (colorMatch) {
        groupedAssets[baseName].colorVariants.push({
          asset,
          colorName: colorMatch[1]
        });
      }
    });

    for (const [name, data] of Object.entries(groupedAssets)) {
      const cleanName = name
        .split(/[-_\s]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      const detectedColors = [...new Set(data.colorVariants.map(c => c.colorName))];
      const hasColorVariants = detectedColors.length > 0;

      const draft = {
        id: uuidv4(),
        name: cleanName,
        description: "",
        price: 0,
        originalPrice: null,
        categoryId: null,
        subcategoryId: null,
        brand: "KAOZ",
        isNew: true,
        isFeatured: false,
        isActive: true,
        tags: [],
        features: {},
        images: data.images.map((img, idx) => ({
          url: img.url,
          isMain: idx === 0,
          originalName: img.originalName,
          width: img.width,
          height: img.height,
          size: img.size
        })),
        variants: [],
        _suggestedColors: detectedColors,
        _hasColorVariants: hasColorVariants,
        status: "incomplete",
        errors: [],
        warnings: []
      };

      // Si se detectaron colores, crear variantes por color
      if (hasColorVariants) {
        const colorMap = {
          negro: { hex: "#000000" }, blanco: { hex: "#FFFFFF" }, rojo: { hex: "#FF0000" },
          azul: { hex: "#0000FF" }, verde: { hex: "#008000" }, amarillo: { hex: "#FFFF00" },
          naranja: { hex: "#FFA500" }, morado: { hex: "#800080" }, rosa: { hex: "#FFC0CB" },
          gris: { hex: "#808080" }, marron: { hex: "#A52A2A" }, beige: { hex: "#F5F5DC" },
          black: { hex: "#000000" }, white: { hex: "#FFFFFF" }, red: { hex: "#FF0000" },
          blue: { hex: "#0000FF" }, green: { hex: "#008000" }, yellow: { hex: "#FFFF00" },
          orange: { hex: "#FFA500" }, purple: { hex: "#800080" }, pink: { hex: "#FFC0CB" },
          gray: { hex: "#808080" }, navy: { hex: "#000080" }
        };

        for (const colorName of detectedColors) {
          const colorInfo = colorMap[colorName.toLowerCase()] || { hex: "#000000" };
          const colorImages = data.colorVariants
            .filter(cv => cv.colorName.toLowerCase() === colorName.toLowerCase())
            .map(cv => ({ url: cv.asset.url, isMain: false, originalName: cv.asset.originalName }));

          draft.variants.push({
            color: colorName.charAt(0).toUpperCase() + colorName.slice(1),
            colorHex: colorInfo.hex,
            images: colorImages,
            sizes: [
              { size: "S", stock: 0 },
              { size: "M", stock: 0 },
              { size: "L", stock: 0 },
              { size: "XL", stock: 0 }
            ]
          });
        }
      } else {
        // Variante única por defecto
        draft.variants.push({
          color: "N/A",
          colorHex: "#000000",
          images: [],
          sizes: [
            { size: "S", stock: 0 },
            { size: "M", stock: 0 },
            { size: "L", stock: 0 },
            { size: "XL", stock: 0 }
          ]
        });
      }

      draft.errors = this.validateDraft(draft).errors;
      draft.status = draft.errors.length === 0 ? "valid" : "invalid";

      drafts.push(draft);
    }

    return drafts;
  }

  /**
   * Actualiza los drafts de una sesión
   */
  async updateDrafts(sessionId, drafts) {
    const validatedDrafts = drafts.map(draft => this.validateDraft(draft));
    
    return await prisma.bulkUploadSession.update({
      where: { id: sessionId },
      data: { 
        drafts: validatedDrafts,
        totalItems: validatedDrafts.length,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Valida un draft exhaustivamente contra el modelo de datos real
   */
  validateDraft(draft) {
    const errors = [];
    const warnings = [];

    // Validaciones obligatorias (coinciden con el modelo Prisma)
    if (!draft.name || draft.name.trim().length < 3) {
      errors.push({ field: "name", message: "Nombre debe tener al menos 3 caracteres" });
    }

    if (draft.price === undefined || draft.price === null || Number(draft.price) <= 0) {
      errors.push({ field: "price", message: "Precio debe ser mayor a 0" });
    }

    if (!draft.categoryId) {
      warnings.push({ field: "categoryId", message: "Categoría no asignada (recomendado)" });
    }

    if (!draft.images || draft.images.length === 0) {
      errors.push({ field: "images", message: "Al menos una imagen requerida" });
    }

    if (!draft.variants || draft.variants.length === 0) {
      errors.push({ field: "variants", message: "Al menos una variante requerida" });
    } else {
      let hasStock = false;
      draft.variants.forEach((v, vi) => {
        if (!v.color || v.color.trim().length === 0) {
          warnings.push({ field: `variants[${vi}].color`, message: `Variante #${vi + 1} sin nombre de color` });
        }
        if (!v.sizes || v.sizes.length === 0) {
          warnings.push({ field: `variants[${vi}].sizes`, message: `Variante "${v.color}" sin tallas definidas` });
        } else {
          v.sizes.forEach((s, si) => {
            if (!s.size || s.size.trim().length === 0) {
              errors.push({ field: `variants[${vi}].sizes[${si}].size`, message: `Talla vacía en variante "${v.color}"` });
            }
            if (s.stock > 0) hasStock = true;
          });
        }
      });
      if (!hasStock) {
        warnings.push({ field: "stock", message: "Ninguna variante tiene stock > 0" });
      }
    }

    if (!draft.brand || draft.brand.trim().length === 0) {
      warnings.push({ field: "brand", message: "Marca no especificada" });
    }

    if (!draft.description || draft.description.trim().length < 10) {
      warnings.push({ field: "description", message: "Descripción muy corta (mín. 10 caracteres recomendado)" });
    }

    return {
      ...draft,
      errors,
      warnings,
      status: errors.length === 0 ? "valid" : "invalid"
    };
  }

  /**
   * Validación completa de toda la sesión
   */
  async validateSession(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error("Sesión no encontrada");

    const validatedDrafts = (session.drafts || []).map(draft => this.validateDraft(draft));
    
    const summary = {
      total: validatedDrafts.length,
      valid: validatedDrafts.filter(d => d.status === "valid").length,
      invalid: validatedDrafts.filter(d => d.status === "invalid").length,
      totalErrors: validatedDrafts.reduce((sum, d) => sum + d.errors.length, 0),
      totalWarnings: validatedDrafts.reduce((sum, d) => sum + (d.warnings || []).length, 0),
      totalImages: validatedDrafts.reduce((sum, d) => sum + (d.images || []).length, 0),
      totalVariants: validatedDrafts.reduce((sum, d) => sum + (d.variants || []).length, 0)
    };

    // Obtener el consolidated issues table para revisión
    const allIssues = [];
    validatedDrafts.forEach((draft, di) => {
      draft.errors.forEach(err => {
        allIssues.push({
          productIndex: di,
          productName: draft.name,
          field: err.field,
          type: "error",
          description: err.message,
          severity: "critical"
        });
      });
      (draft.warnings || []).forEach(warn => {
        allIssues.push({
          productIndex: di,
          productName: draft.name,
          field: warn.field,
          type: "warning",
          description: warn.message,
          severity: "minor"
        });
      });
    });

    return { summary, allIssues, drafts: validatedDrafts };
  }

  /**
   * Publica los productos de una sesión con transaccionalidad
   */
  async publishSession(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error("Sesión no encontrada");
    if (session.status === "completed") throw new Error("Sesión ya completada");

    // Validar todo antes de publicar
    const { summary, drafts } = await this.validateSession(sessionId);

    const validDrafts = drafts.filter(d => d.status === "valid");
    const results = {
      total: summary.total,
      created: 0,
      failed: 0,
      skipped: summary.invalid,
      errors: [],
      createdProducts: []
    };

    // Actualizar progreso
    await prisma.bulkUploadSession.update({
      where: { id: sessionId },
      data: { status: "processing", progress: 0 }
    });

    for (let i = 0; i < validDrafts.length; i++) {
      const draft = validDrafts[i];
      try {
        const product = await ProductService.createProduct(draft);
        results.created++;
        results.createdProducts.push({
          id: product.id,
          name: product.name,
          price: product.price
        });

        // Actualizar progreso
        const progress = Math.round(((i + 1) / validDrafts.length) * 100);
        await prisma.bulkUploadSession.update({
          where: { id: sessionId },
          data: { progress }
        });

      } catch (error) {
        console.error(`❌ Error al publicar producto "${draft.name}":`, error);
        results.failed++;
        results.errors.push({ 
          name: draft.name, 
          index: i,
          error: error.message 
        });
      }
    }

    await prisma.bulkUploadSession.update({
      where: { id: sessionId },
      data: { 
        status: results.failed > 0 && results.created > 0 ? "completed_with_errors" : "completed",
        progress: 100
      }
    });

    return results;
  }

  /**
   * Elimina las imágenes de una sesión (para limpiar assets)
   */
  async deleteSessionAsset(sessionId, assetKey) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error("Sesión no encontrada");

    const assets = { ...(session.assets || {}) };
    if (!assets[assetKey]) throw new Error("Asset no encontrado");

    // Eliminar de Supabase
    try {
      await supabase.storage
        .from("products")
        .remove([assets[assetKey].path]);
    } catch (e) {
      console.warn("No se pudo eliminar de Supabase:", e.message);
    }

    delete assets[assetKey];

    // Regenerar drafts sin ese asset
    const newDrafts = await this.generateDraftsFromAssets(sessionId, assets);

    return await prisma.bulkUploadSession.update({
      where: { id: sessionId },
      data: { 
        assets,
        drafts: newDrafts,
        totalItems: newDrafts.length
      }
    });
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
