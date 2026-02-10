const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Category = require("../models/Category");
const CartHistory = require("../models/CartHistory");
const Settings = require("../models/Settings");
const fs = require("fs");
const path = require("path");

// ===== PRODUCTS =====
exports.createProduct = async (req, res) => {
  try {
    const productData = JSON.parse(req.body.data);

    // Procesar imágenes generales
    if (req.files && req.files.length > 0) {
      // Si no hay imágenes por variante, usar imágenes generales
      if (
        !productData.variants ||
        !productData.variants.some((v) => v.images && v.images.length > 0)
      ) {
        productData.images = req.files.map((file, index) => ({
          url: `/uploads/products/${file.filename}`,
          alt: productData.name,
          isMain: index === 0,
        }));
      }
    }

    // Si isNew está activo, establecer fecha
    if (productData.isNew) {
      productData.markedAsNewAt = new Date();
    }

    const product = await Product.create(productData);

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
    const productData = req.body.data ? JSON.parse(req.body.data) : req.body;

    let product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // Procesar nuevas imágenes generales
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        url: `/uploads/products/${file.filename}`,
        alt: productData.name || product.name,
        isMain: false,
      }));

      if (productData.images) {
        productData.images = [...productData.images, ...newImages];
      } else {
        productData.images = [...(product.images || []), ...newImages];
      }
    }

    // Manejar cambio de estado "nuevo"
    if (
      productData.isNew !== undefined &&
      productData.isNew !== product.isNew
    ) {
      if (productData.isNew) {
        productData.markedAsNewAt = new Date();
      } else {
        productData.markedAsNewAt = null;
      }
    }

    product = await Product.findByIdAndUpdate(id, productData, {
      new: true,
      runValidators: true,
    });

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

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // Eliminar imágenes generales del servidor
    if (product.images) {
      product.images.forEach((image) => {
        const imagePath = path.join(__dirname, "../..", image.url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    // Eliminar imágenes de variantes
    if (product.variants) {
      product.variants.forEach((variant) => {
        if (variant.images) {
          variant.images.forEach((image) => {
            const imagePath = path.join(__dirname, "../..", image.url);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }
          });
        }
      });
    }

    await Product.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Producto eliminado exitosamente",
    });
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
    const { variantIndex } = req.query;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    let image;

    if (variantIndex !== undefined) {
      // Eliminar imagen de variante específica
      const variant = product.variants[parseInt(variantIndex)];
      if (variant && variant.images) {
        image = variant.images.id(imageId);
        if (image) {
          const imagePath = path.join(__dirname, "../..", image.url);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
          variant.images.pull(imageId);
        }
      }
    } else {
      // Eliminar imagen general
      image = product.images.id(imageId);
      if (image) {
        const imagePath = path.join(__dirname, "../..", image.url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        product.images.pull(imageId);
      }
    }

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Imagen no encontrada",
      });
    }

    await product.save();

    res.json({
      success: true,
      message: "Imagen eliminada exitosamente",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar imagen",
      error: error.message,
    });
  }
};

// Subir imágenes para una variante específica
exports.uploadVariantImages = async (req, res) => {
  try {
    const { id, variantIndex } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    const variant = product.variants[parseInt(variantIndex)];
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada",
      });
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/products/${file.filename}`,
        alt: `${product.name} - ${variant.color}`,
        isMain:
          !variant.images || variant.images.length === 0 ? index === 0 : false,
      }));

      if (!variant.images) {
        variant.images = [];
      }
      variant.images.push(...newImages);
    }

    await product.save();

    res.json({
      success: true,
      message: "Imágenes subidas exitosamente",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al subir imágenes",
      error: error.message,
    });
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

    const result = await Order.search({
      status,
      paymentStatus,
      startDate,
      endDate,
      search,
      page,
      limit,
      includeDeleted: includeDeleted === "true",
    });

    res.json({
      success: true,
      ...result,
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

    const order = await Order.findById(id).populate("items.product");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    const previousStatus = order.orderStatus;

    if (orderStatus) {
      // Manejo de stock al cancelar/reactivar
      if (orderStatus === "cancelled" && previousStatus !== "cancelled") {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product) {
            const variant = product.variants.find(
              (v) => v.color === item.color,
            );
            if (variant) {
              const sizeStock = variant.sizes.find((s) => s.size === item.size);
              if (sizeStock) {
                sizeStock.stock += item.quantity;
                await product.save();
              }
            }
          }
        }
      }

      if (previousStatus === "cancelled" && orderStatus !== "cancelled") {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product) {
            const variant = product.variants.find(
              (v) => v.color === item.color,
            );
            if (variant) {
              const sizeStock = variant.sizes.find((s) => s.size === item.size);
              if (!sizeStock || sizeStock.stock < item.quantity) {
                return res.status(400).json({
                  success: false,
                  message: `Stock insuficiente para reactivar. Producto: ${product.name} - ${item.color} - ${item.size}`,
                });
              }
            }
          }
        }

        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product) {
            const variant = product.variants.find(
              (v) => v.color === item.color,
            );
            if (variant) {
              const sizeStock = variant.sizes.find((s) => s.size === item.size);
              if (sizeStock) {
                sizeStock.stock -= item.quantity;
                await product.save();
              }
            }
          }
        }
      }

      order.orderStatus = orderStatus;
      order.statusHistory.push({
        status: orderStatus,
        note,
        date: new Date(),
        updatedBy: req.user._id,
      });
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    if (adminNotes !== undefined) {
      order.adminNotes = adminNotes;
    }

    await order.save();

    res.json({
      success: true,
      message: "Pedido actualizado exitosamente",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar pedido",
      error: error.message,
    });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, permanent = false } = req.body;

    // Verificar configuración
    const settings = await Settings.getSettings();
    if (!settings.orders.allowDelete) {
      return res.status(403).json({
        success: false,
        message: "La eliminación de pedidos está deshabilitada",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    if (permanent) {
      // Eliminación permanente
      await Order.findByIdAndDelete(id);
      res.json({
        success: true,
        message: "Pedido eliminado permanentemente",
      });
    } else {
      // Soft delete
      await order.softDelete(req.user._id, reason);
      res.json({
        success: true,
        message: "Pedido eliminado exitosamente",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar pedido",
      error: error.message,
    });
  }
};

exports.restoreOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    await order.restore();

    res.json({
      success: true,
      message: "Pedido restaurado exitosamente",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al restaurar pedido",
      error: error.message,
    });
  }
};

// ===== CUSTOMERS =====
exports.getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const query = { role: "user" };

    if (search) {
      query.$or = [
        { firstName: new RegExp(search, "i") },
        { lastName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const customers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await Order.find({
          $or: [
            { user: customer._id },
            { "customerInfo.email": customer.email },
          ],
          isDeleted: { $ne: true },
        });

        const orderCount = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

        return {
          ...customer.toObject(),
          orderCount,
          totalSpent,
        };
      }),
    );

    res.json({
      success: true,
      count: customersWithStats.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      customers: customersWithStats,
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

    const customer = await User.findById(id).select("-password");
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    const orders = await Order.find({
      $or: [{ user: id }, { "customerInfo.email": customer.email }],
      isDeleted: { $ne: true },
    })
      .populate("items.product")
      .sort({ createdAt: -1 });

    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

    res.json({
      success: true,
      customer: {
        ...customer.toObject(),
        orderCount: orders.length,
        totalSpent,
        orders,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener detalles del cliente",
      error: error.message,
    });
  }
};

exports.getCustomerCartHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 100, action } = req.query;

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    const query = { user: customerId };

    if (action) {
      query.action = action;
    }

    const history = await CartHistory.find(query)
      .populate("product")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener historial de carrito",
      error: error.message,
    });
  }
};

// ===== CATEGORIES =====
exports.getCategories = async (req, res) => {
  try {
    const { tree = false } = req.query;

    let categories;

    if (tree === "true") {
      categories = await Category.getTree();
    } else {
      categories = await Category.getAllWithHierarchy();

      // Contar productos por categoría
      categories = await Promise.all(
        categories.map(async (category) => {
          const productCount = await Product.countDocuments({
            $or: [{ category: category._id }, { subcategory: category._id }],
            isActive: true,
          });
          return {
            ...category,
            productCount,
          };
        }),
      );
    }

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
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
    const {
      name,
      description,
      parent,
      image,
      isActive = true,
      order,
    } = req.body;

    const category = await Category.create({
      name,
      description,
      parent: parent || null,
      image,
      isActive,
      order,
    });

    res.status(201).json({
      success: true,
      message: "Categoría creada exitosamente",
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear categoría",
      error: error.message,
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent, image, isActive, order } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parent !== undefined) updateData.parent = parent || null;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = order;

    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Categoría actualizada exitosamente",
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar categoría",
      error: error.message,
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;

    // Verificar si hay productos con esta categoría
    const productsCount = await Product.countDocuments({
      $or: [{ category: id }, { subcategory: id }],
    });

    if (productsCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. Hay ${productsCount} productos con esta categoría`,
        productsCount,
      });
    }

    // Verificar si tiene subcategorías
    const subcategoriesCount = await Category.countDocuments({ parent: id });
    if (subcategoriesCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. Hay ${subcategoriesCount} subcategorías`,
        subcategoriesCount,
      });
    }

    if (force) {
      // Eliminar subcategorías
      await Category.deleteMany({ parent: id });
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Categoría eliminada exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar categoría",
      error: error.message,
    });
  }
};

exports.reorderCategories = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    const updates = orderedIds.map((id, index) =>
      Category.findByIdAndUpdate(id, { order: index }),
    );

    await Promise.all(updates);

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
