const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    // Categoría padre (null si es categoría principal)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    // Nivel de profundidad (0 = principal, 1 = subcategoría, etc.)
    level: {
      type: Number,
      default: 0,
    },
    // Orden de visualización
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Metadatos para SEO
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

// Índice compuesto para slug único dentro del mismo nivel
categorySchema.index({ slug: 1, parent: 1 }, { unique: true });
categorySchema.index({ parent: 1 });
categorySchema.index({ order: 1 });

// Virtual para obtener subcategorías
categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

// Pre-save hook para generar slug y calcular nivel
categorySchema.pre("validate", async function (next) {
  // Generar slug si no existe o si el nombre cambió
  if (!this.slug || this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Calcular nivel basado en el padre
  if (this.parent) {
    const parentCategory = await mongoose
      .model("Category")
      .findById(this.parent);
    if (parentCategory) {
      this.level = parentCategory.level + 1;
    }
  } else {
    this.level = 0;
  }

  next();
});

// Método estático para obtener árbol de categorías
categorySchema.statics.getTree = async function () {
  const categories = await this.find({ isActive: true })
    .sort({ order: 1, name: 1 })
    .lean();

  // Construir árbol
  const categoryMap = {};
  const tree = [];

  // Primero crear mapa
  categories.forEach((cat) => {
    categoryMap[cat._id.toString()] = { ...cat, subcategories: [] };
  });

  // Luego construir árbol
  categories.forEach((cat) => {
    if (cat.parent) {
      const parentId = cat.parent.toString();
      if (categoryMap[parentId]) {
        categoryMap[parentId].subcategories.push(
          categoryMap[cat._id.toString()]
        );
      }
    } else {
      tree.push(categoryMap[cat._id.toString()]);
    }
  });

  return tree;
};

// Método estático para obtener todas las categorías con su jerarquía
categorySchema.statics.getAllWithHierarchy = async function () {
  const categories = await this.find()
    .populate("parent", "name slug")
    .sort({ level: 1, order: 1, name: 1 })
    .lean();

  return categories.map((cat) => ({
    ...cat,
    fullPath: cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name,
  }));
};

// Método para obtener todos los descendientes
categorySchema.methods.getDescendants = async function () {
  const descendants = [];
  const queue = [this._id];

  while (queue.length > 0) {
    const parentId = queue.shift();
    const children = await mongoose
      .model("Category")
      .find({ parent: parentId });

    for (const child of children) {
      descendants.push(child);
      queue.push(child._id);
    }
  }

  return descendants;
};

// Método para obtener la ruta completa (breadcrumb)
categorySchema.methods.getBreadcrumb = async function () {
  const breadcrumb = [this];
  let current = this;

  while (current.parent) {
    current = await mongoose.model("Category").findById(current.parent);
    if (current) {
      breadcrumb.unshift(current);
    } else {
      break;
    }
  }

  return breadcrumb;
};

module.exports = mongoose.model("Category", categorySchema);
