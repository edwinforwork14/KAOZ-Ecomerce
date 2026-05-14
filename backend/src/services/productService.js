const { prisma } = require("../config/database");

const updateNewStatus = async (globalDurationDays = 30) => {
  try {
    const now = new Date();
    
    const newProducts = await prisma.product.findMany({
      where: {
        isNew: true,
        markedAsNewAt: { not: null }
      }
    });

    let updatedCount = 0;

    for (const product of newProducts) {
      const durationDays = product.newDurationDays || globalDurationDays;
      const expirationDate = new Date(product.markedAsNewAt);
      expirationDate.setDate(expirationDate.getDate() + durationDays);

      if (now >= expirationDate) {
        await prisma.product.update({
          where: { id: product.id },
          data: { isNew: false }
        });
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  } catch (error) {
    console.error("❌ Error al actualizar estado 'isNew' en Prisma:", error.message);
    return { updated: 0 };
  }
};

/**
 * Crea un producto con sus variantes, tallas e imágenes
 */
const createProduct = async (productData, files = []) => {
  try {
    console.log("🛠️ [ProductService] Iniciando PERSISTENCIA de producto");
    console.log("📊 [ProductService] Cantidad de variantes a crear:", productData.variants?.length || 0);
    // 1. Preparar imágenes generales
    let imagesData = [];
    
    // Imágenes subidas en el request
    if (files && files.length > 0) {
      imagesData = files.map((file, index) => ({
        url: file.url,
        alt: productData.name,
        isMain: index === 0,
      }));
    }
    
    // Imágenes pre-cargadas (URLs)
    if (productData.images && Array.isArray(productData.images)) {
      const preloadedImages = productData.images.map(img => ({
        url: img.url,
        alt: img.alt || productData.name,
        isMain: img.isMain || false
      }));
      imagesData = [...imagesData, ...preloadedImages];
    }

    // Asegurar que solo haya una imagen principal
    if (imagesData.length > 0) {
      const hasMain = imagesData.some(img => img.isMain);
      if (!hasMain) imagesData[0].isMain = true;
    }

    // 2. Crear el producto en la base de datos
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        description: productData.description || "",
        price: parseFloat(productData.price) || 0,
        originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
        categoryId: productData.categoryId || null,
        subcategoryId: productData.subcategoryId || null,
        brand: productData.brand || "KAOZ",
        isActive: productData.isActive ?? true,
        isNew: productData.isNew ?? false,
        markedAsNewAt: productData.isNew ? new Date() : null,
        tags: productData.tags || [],
        features: productData.features || {},
        images: {
          create: imagesData
        },
        variants: {
          create: (productData.variants || []).map(v => ({
            color: v.color || "N/A",
            colorHex: v.colorHex || "#000000",
            images: {
              create: (v.images || []).map(img => ({
                url: img.url,
                alt: productData.name,
                isMain: img.isMain || false
              }))
            },
            sizes: {
              create: (v.sizes || []).map(s => ({
                size: s.size,
                stock: parseInt(s.stock) || 0,
                sku: s.sku || null
              }))
            }
          }))
        }
      },
      include: {
        images: true,
        variants: {
          include: {
            sizes: true,
            images: true
          }
        }
      }
    });

    return product;
  } catch (error) {
    console.error("Error in ProductService.createProduct:", error);
    throw error;
  }
};

/**
 * Actualiza un producto existente
 */
const updateProduct = async (id, productData, files = []) => {
  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { images: true, variants: true }
    });

    if (!existingProduct) {
      throw new Error("Producto no encontrado");
    }

    // 1. Manejar estado 'isNew'
    let markedAsNewAt = existingProduct.markedAsNewAt;
    if (productData.isNew !== undefined && productData.isNew !== existingProduct.isNew) {
      markedAsNewAt = productData.isNew ? new Date() : null;
    }

    // 2. Preparar nuevas imágenes
    let newImagesData = [];
    if (files && files.length > 0) {
      newImagesData = files.map(file => ({
        url: file.url,
        alt: productData.name || existingProduct.name,
        isMain: false,
      }));
    }

    // Si se envían imágenes, reemplazamos la lista de imágenes generales
    if (productData.images && Array.isArray(productData.images)) {
      await prisma.productImage.deleteMany({
        where: { productId: id, variantId: null }
      });

      const preloadedImages = productData.images.map(img => ({
        url: img.url,
        alt: img.alt || productData.name || existingProduct.name,
        isMain: img.isMain || false
      }));
      newImagesData = [...newImagesData, ...preloadedImages];
    }

    const updateData = {
      name: productData.name,
      description: productData.description,
      price: productData.price !== undefined ? parseFloat(productData.price) : undefined,
      originalPrice: productData.originalPrice !== undefined ? parseFloat(productData.originalPrice) : undefined,
      categoryId: productData.categoryId,
      subcategoryId: productData.subcategoryId,
      brand: productData.brand,
      isActive: productData.isActive,
      isNew: productData.isNew,
      markedAsNewAt,
      tags: productData.tags,
      features: productData.features
    };

    if (newImagesData.length > 0) {
      updateData.images = {
        create: newImagesData
      };
    }

    // 3. Manejar variantes (Delete & Recreate para consistencia)
    if (productData.variants) {
      // Eliminar variantes actuales (cascada eliminará tallas e imágenes vinculadas)
      await prisma.productVariant.deleteMany({
        where: { productId: id }
      });

      updateData.variants = {
        create: productData.variants.map(v => ({
          color: v.color || "N/A",
          colorHex: v.colorHex || "#000000",
          images: {
            create: (v.images || []).map(img => ({
              url: img.url,
              alt: productData.name || existingProduct.name,
              isMain: img.isMain || false,
              productId: id
            }))
          },
          sizes: {
            create: (v.sizes || []).map(s => ({
              size: s.size,
              stock: parseInt(s.stock) || 0,
              sku: s.sku || null
            }))
          }
        }))
      };
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
        variants: {
          include: {
            sizes: true,
            images: true
          }
        }
      }
    });

    return product;
  } catch (error) {
    console.error("Error in ProductService.updateProduct:", error);
    throw error;
  }
};

module.exports = { updateNewStatus, createProduct, updateProduct };
