const { prisma } = require("../config/database");
const Settings = require("../services/settingsService");
const ProductService = require("../services/productService");
const fs = require("fs");
const path = require("path");
const { supabase } = require("../config/supabase");

// ===== PRODUCTS =====
exports.createProduct = async (req, res) => {
  try {
    console.log("🆕 [AdminController] Petición CREATE PRODUCT recibida");
    let productData;
    if (req.body.data) {
      console.log("📦 [AdminController] Datos recibidos en req.body.data (FormData)");
      productData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      console.log("📦 [AdminController] Datos recibidos en req.body (JSON)");
      productData = req.body;
    }
    
    console.log("🔍 [AdminController] ProductData procesado:", JSON.stringify(productData, null, 2));
    console.log(`🖼️ [AdminController] Archivos adjuntos (multer): ${req.files?.length || 0}`);
    const product = await ProductService.createProduct(productData, req.files);

    res.status(201).json({
      success: true,
      message: "Producto creado exitosamente",
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear producto",
      error: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 [AdminController] Petición UPDATE PRODUCT recibida para ID: ${id}`);
    
    let productData;
    if (req.body.data) {
      console.log("📦 [AdminController] Datos recibidos en req.body.data (FormData)");
      productData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      console.log("📦 [AdminController] Datos recibidos en req.body (JSON)");
      productData = req.body;
    }

    console.log("🔍 [AdminController] ProductData procesado:", JSON.stringify(productData, null, 2));
    console.log(`🖼️ [AdminController] Archivos adjuntos (multer): ${req.files?.length || 0}`);

    const product = await ProductService.updateProduct(id, productData, req.files);

    res.json({
      success: true,
      message: "Producto actualizado exitosamente",
      product,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
      error: error.message,
    });
  }
};


exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true, variants: { include: { images: true } } }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    // Eliminar imágenes de Supabase Storage
    const allImages = [
      ...product.images,
      ...product.variants.flatMap(v => v.images || [])
    ];

    const filesToRemove = allImages
      .map(image => {
        // Extraer el nombre del archivo de la URL
        // https://.../storage/v1/object/public/products/product-123.webp
        const parts = image.url.split('/');
        return parts[parts.length - 1];
      })
      .filter(filename => filename && filename.startsWith('product-'));

    if (filesToRemove.length > 0) {
      await supabase.storage.from("products").remove(filesToRemove);
    }

    await prisma.product.delete({ where: { id } });

    res.json({ success: true, message: "Producto eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
      error: error.message,
    });
  }
};

exports.deleteProductImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const image = await prisma.productImage.findUnique({
      where: { id: imageId }
    });

    if (!image) {
      return res.status(404).json({ success: false, message: "Imagen no encontrada" });
    }

    // Eliminar archivo de Supabase Storage
    if (image.url) {
      const parts = image.url.split('/');
      const filename = parts[parts.length - 1];
      if (filename && filename.startsWith('product-')) {
        await supabase.storage.from("products").remove([filename]);
      }
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    res.json({ success: true, message: "Imagen eliminada exitosamente" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.uploadVariantImages = async (req, res) => {
  try {
    const { id, variantIndex } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true }
    });

    if (!product || !product.variants[parseInt(variantIndex)]) {
      return res.status(404).json({ success: false, message: "Variante no encontrada" });
    }

    const variantId = product.variants[parseInt(variantIndex)].id;

    if (req.files && req.files.length > 0) {
      const imagesData = req.files.map(file => ({
        url: file.url, // URL pública de Supabase
        alt: product.name,
        productId: product.id,
        variantId: variantId
      }));

      await prisma.productImage.createMany({
        data: imagesData
      });
    }

    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: { images: true, variants: { include: { images: true, sizes: true } } }
    });

    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== ORDERS =====
exports.getAllOrders = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      includeDeleted = false,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      isDeleted: includeDeleted === "true" ? undefined : false,
      orderStatus: status || undefined,
      paymentStatus: paymentStatus || undefined,
      createdAt: (startDate || endDate) ? {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      } : undefined,
    };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerInfo: { path: ['firstName'], string_contains: search } }, // Esto depende de cómo se guardó customerInfo en Prisma (JSON)
        { customerInfo: { path: ['email'], string_contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { items: true, user: { select: { firstName: true, lastName: true, email: true } } }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      orders,
      total,
      totalPages: Math.ceil(total / take),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener pedidos",
      error: error.message,
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus, note, adminNotes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Pedido no encontrado" });
    }

    const previousStatus = order.orderStatus;
    const newStatus = orderStatus || previousStatus;

    // Usar transacción para asegurar que la actualización de estado y stock sea atómica
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Si el pedido pasa a CANCELADO, devolvemos el stock
      if (previousStatus !== "cancelled" && newStatus === "cancelled") {
        for (const item of order.items) {
          const variant = await tx.productVariant.findFirst({
            where: {
              productId: item.productId,
              color: item.color || "N/A"
            },
            include: { sizes: { where: { size: item.size } } }
          });

          if (variant && variant.sizes[0]) {
            await tx.productSize.update({
              where: { id: variant.sizes[0].id },
              data: { stock: { increment: item.quantity } }
            });
          }
        }
      }
      
      // 2. Si el pedido sale de CANCELADO, descontamos el stock (verificando disponibilidad)
      if (previousStatus === "cancelled" && newStatus !== "cancelled") {
        for (const item of order.items) {
           const variant = await tx.productVariant.findFirst({
            where: {
              productId: item.productId,
              color: item.color || "N/A"
            },
            include: { sizes: { where: { size: item.size } } }
          });

          if (variant && variant.sizes[0]) {
            if (variant.sizes[0].stock < item.quantity) {
              throw new Error(`Stock insuficiente para restaurar el pedido: ${item.name} (${item.size})`);
            }
            await tx.productSize.update({
              where: { id: variant.sizes[0].id },
              data: { stock: { decrement: item.quantity } }
            });
          }
        }
      }

      // 2. Lógica de Sincronización de Estados (Senior Flow)
      if (orderStatus === "CONFIRMADO" && order.paymentStatus === "PENDIENTE") {
        paymentStatus = "PAGADO";
      }
      
      if (orderStatus === "CANCELADO") {
        paymentStatus = "REEMBOLSADO";
      }

      // 3. Actualizar el pedido
      return await tx.order.update({
        where: { id },
        data: {
          orderStatus: orderStatus || undefined,
          paymentStatus: paymentStatus || undefined,
          adminNotes: adminNotes !== undefined ? adminNotes : undefined,
          statusHistory: (orderStatus || paymentStatus) ? [
            ...(order.statusHistory || []),
            { 
              orderStatus: orderStatus || previousStatus, 
              paymentStatus: paymentStatus || order.paymentStatus,
              note: note || `Estado actualizado a ${orderStatus || previousStatus}`, 
              date: new Date(), 
              updatedBy: req.user.id 
            }
          ] : undefined
        },
        include: { 
          items: true, 
          user: { select: { firstName: true, lastName: true, email: true } } 
        }
      });
    });

    res.json({
      success: true,
      message: "Pedido actualizado exitosamente",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar pedido",
    });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.order.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        // reason: reason // Si agregaste el campo al schema
      }
    });

    res.json({ success: true, message: "Pedido eliminado (soft delete)" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.restoreOrder = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.order.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      }
    });

    res.json({ success: true, message: "Pedido restaurado exitosamente" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== CUSTOMERS =====
exports.getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      role: "user",
      OR: search ? [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ] : undefined
    };

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          orders: {
            where: { isDeleted: false },
            select: { total: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    const customersWithStats = customers.map(customer => {
      const orderCount = customer.orders.length;
      const totalSpent = customer.orders.reduce((sum, order) => sum + (order.total || 0), 0);
      return {
        ...customer,
        orderCount,
        totalSpent,
        orders: undefined // Limpiar lista de órdenes cruda
      };
    });

    res.json({
      success: true,
      customers: customersWithStats,
      total,
      totalPages: Math.ceil(total / take),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener clientes",
      error: error.message,
    });
  }
};

exports.getCustomerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          include: { items: true }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Cliente no encontrado" });
    }

    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCustomerCartHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const history = await prisma.cartHistory.findMany({
      where: { userId: customerId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== CATEGORIES =====
exports.getCategories = async (req, res) => {
  try {
    const { tree = false } = req.query;

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
            subProducts: true
          }
        },
        parent: true
      },
      orderBy: { order: 'asc' }
    });

    let result = categories.map(cat => ({
      ...cat,
      productCount: cat._count.products + cat._count.subProducts
    }));

    if (tree === "true") {
      // Build tree
      const categoryMap = {};
      const treeData = [];
      result.forEach(cat => {
        categoryMap[cat.id] = { ...cat, subcategories: [] };
      });
      result.forEach(cat => {
        if (cat.parentId && categoryMap[cat.parentId]) {
          categoryMap[cat.parentId].subcategories.push(categoryMap[cat.id]);
        } else if (!cat.parentId) {
          treeData.push(categoryMap[cat.id]);
        }
      });
      result = treeData;
    }

    res.json({ success: true, categories: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener categorías",
      error: error.message,
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    let categoryData;
    if (req.body.data) {
      categoryData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      categoryData = req.body;
    }

    const { name, description, parent, isActive, order, isFeatured } = categoryData;
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

    // Si hay un archivo subido, usar esa URL
    let imageUrl = categoryData.image;
    if (req.files && req.files.length > 0) {
      imageUrl = req.files[0].url;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        parentId: parent || null,
        image: imageUrl,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        order: order ?? 0,
      }
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let categoryData;
    if (req.body.data) {
      categoryData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      categoryData = req.body;
    }

    // Si hay un archivo subido, usar esa URL
    let imageUrl = categoryData.image;
    if (req.files && req.files.length > 0) {
      imageUrl = req.files[0].url;
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: categoryData.name,
        description: categoryData.description,
        parentId: categoryData.parent || null,
        image: imageUrl,
        isActive: categoryData.isActive,
        isFeatured: categoryData.isFeatured,
        order: categoryData.order
      }
    });

    res.json({ success: true, category });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.json({ success: true, message: "Categoría eliminada" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reorderCategories = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { order: index }
        })
      )
    );

    res.json({
      success: true,
      message: "Orden actualizado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al reordenar categorías",
      error: error.message,
    });
  }
};

exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, expenses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    const expense = await prisma.expense.create({
      data: {
        title,
        amount: parseFloat(amount),
        category,
        date: date ? new Date(date) : new Date(),
        description
      }
    });
    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id } });
    res.json({ success: true, message: "Gasto eliminado" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInventoryStats = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: {
          include: {
            sizes: true
          }
        }
      }
    });

    let totalValue = 0;
    let totalStock = 0;
    let criticalItems = 0;

    products.forEach(product => {
      let productStock = 0;
      product.variants.forEach(variant => {
        variant.sizes.forEach(size => {
          productStock += (size.stock || 0);
        });
      });

      totalStock += productStock;
      totalValue += ((product.price || 0) * productStock);
      
      if (productStock < 5) {
        criticalItems++;
      }
    });

    res.json({
      success: true,
      stats: {
        totalValue,
        totalStock,
        criticalItems,
        totalProducts: products.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
