const mongoose = require("mongoose");

// Schema para imágenes individuales
const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  alt: String,
  isMain: {
    type: Boolean,
    default: false,
  },
});

// Schema para cada variante de color
const variantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: true,
  },
  colorHex: {
    type: String,
  },
  // Imágenes específicas para este color
  images: [imageSchema],
  sizes: [
    {
      size: {
        type: String,
        required: true,
      },
      stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      sku: {
        type: String,
        unique: true,
        sparse: true,
      },
    },
  ],
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del producto es requerido"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, "La descripción es requerida"],
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: [true, "El precio es requerido"],
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    // Configuración de precio por porcentaje
    priceConfig: {
      mode: {
        type: String,
        enum: ["fixed", "markup", "discount"],
        default: "fixed",
      },
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      basePrice: {
        type: Number,
        min: 0,
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    // Subcategoría (opcional)
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    // Imágenes generales del producto (se usan si no hay imágenes por color)
    images: [imageSchema],
    variants: [variantSchema],
    isNew: {
      type: Boolean,
      default: false,
    },
    // Fecha de marcado como nuevo (para cálculo automático)
    markedAsNewAt: {
      type: Date,
    },
    // Duración personalizada de "nuevo" en días (sobreescribe la global)
    newDurationDays: {
      type: Number,
      min: 1,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    addToCartCount: {
      type: Number,
      default: 0,
    },
    tags: [String],
    features: [String],
    // SEO
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices para búsqueda optimizada
productSchema.index({
  name: "text",
  description: "text",
  brand: "text",
  tags: "text",
});
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isNew: 1, markedAsNewAt: 1 });

// Virtual para calcular stock total
productSchema.virtual("totalStock").get(function () {
  let total = 0;
  this.variants.forEach((variant) => {
    variant.sizes.forEach((size) => {
      total += size.stock;
    });
  });
  return total;
});

// Virtual para verificar si sigue siendo "nuevo"
productSchema.virtual("isStillNew").get(function () {
  if (!this.isNew || !this.markedAsNewAt) return this.isNew;

  // Usar duración personalizada o la global (se debe pasar desde el controlador)
  const durationDays = this.newDurationDays || 30;
  const expirationDate = new Date(this.markedAsNewAt);
  expirationDate.setDate(expirationDate.getDate() + durationDays);

  return new Date() < expirationDate;
});

// Virtual para obtener todas las imágenes (generales + por color)
productSchema.virtual("allImages").get(function () {
  const allImages = [...(this.images || [])];

  this.variants.forEach((variant) => {
    if (variant.images && variant.images.length > 0) {
      variant.images.forEach((img) => {
        allImages.push({
          ...img.toObject(),
          color: variant.color,
        });
      });
    }
  });

  return allImages;
});

// Pre-save hook
productSchema.pre("save", function (next) {
  // Si se marca como nuevo, guardar la fecha
  if (this.isModified("isNew") && this.isNew && !this.markedAsNewAt) {
    this.markedAsNewAt = new Date();
  }

  // Si se desmarca como nuevo, limpiar la fecha
  if (this.isModified("isNew") && !this.isNew) {
    this.markedAsNewAt = undefined;
  }

  // Calcular precio si está en modo porcentaje
  if (
    this.priceConfig &&
    this.priceConfig.mode !== "fixed" &&
    this.priceConfig.basePrice
  ) {
    const basePrice = this.priceConfig.basePrice;
    const percentage = this.priceConfig.percentage || 0;

    if (this.priceConfig.mode === "markup") {
      // Precio = base + porcentaje de aumento
      this.price = basePrice * (1 + percentage / 100);
    } else if (this.priceConfig.mode === "discount") {
      // Precio original = base, precio = base - porcentaje
      this.originalPrice = basePrice;
      this.price = basePrice * (1 - percentage / 100);
    }
  }

  next();
});

// Método estático para actualizar estado "nuevo" de todos los productos
productSchema.statics.updateNewStatus = async function (
  globalDurationDays = 30
) {
  const now = new Date();

  const productsToUpdate = await this.find({
    isNew: true,
    markedAsNewAt: { $exists: true },
  });

  const updates = [];

  for (const product of productsToUpdate) {
    const durationDays = product.newDurationDays || globalDurationDays;
    const expirationDate = new Date(product.markedAsNewAt);
    expirationDate.setDate(expirationDate.getDate() + durationDays);

    if (now >= expirationDate) {
      updates.push(this.findByIdAndUpdate(product._id, { isNew: false }));
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return { updated: updates.length };
};

// Método para obtener imágenes de un color específico
productSchema.methods.getImagesForColor = function (color) {
  const variant = this.variants.find(
    (v) => v.color.toLowerCase() === color.toLowerCase()
  );

  if (variant && variant.images && variant.images.length > 0) {
    return variant.images;
  }

  // Si no hay imágenes para ese color, devolver las generales
  return this.images;
};

module.exports = mongoose.model("Product", productSchema);
