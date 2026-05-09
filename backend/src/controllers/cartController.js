const { prisma } = require("../config/database");

exports.getCart = async (req, res) => {
  try {
    const where = req.user
      ? { userId: req.user.id }
      : { sessionId: req.headers["x-session-id"] };

    if (!where.userId && !where.sessionId) {
      return res.status(400).json({ success: false, message: "Sesión no identificada" });
    }

    let cart = await prisma.cart.findFirst({
      where: req.user ? { userId: req.user.id } : { sessionId: req.headers["x-session-id"] },
      include: {
        items: true
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: req.user?.id || null,
          sessionId: req.user ? null : req.headers["x-session-id"],
        },
        include: { items: true }
      });
    }

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Error en getCart:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener carrito",
      error: error.message,
    });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const {
      productId,
      color,
      size,
      quantity = 1,
      price: frontendPrice,
      originalPrice: frontendOriginalPrice,
      name: frontendName,
      image: frontendImage,
    } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          where: { color: color || "N/A" },
          include: { sizes: { where: { size } } }
        },
        images: { where: { isMain: true }, take: 1 }
      }
    });

    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: "Producto no disponible" });
    }

    const variant = product.variants[0];
    const sizeStock = variant?.sizes[0];

    if (!sizeStock || sizeStock.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo hay ${sizeStock?.stock || 0} unidades disponibles`,
      });
    }

    let cart = await prisma.cart.findFirst({
      where: req.user ? { userId: req.user.id } : { sessionId: req.headers["x-session-id"] },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: req.user?.id || null,
          sessionId: req.user ? null : req.headers["x-session-id"],
        }
      });
    }

    const itemPrice = frontendPrice !== undefined ? frontendPrice : product.price;
    const itemOriginalPrice = frontendOriginalPrice !== undefined ? frontendOriginalPrice : product.originalPrice;
    const itemName = frontendName || product.name;
    const itemImage = frontendImage || product.images[0]?.url;

    // Buscar si ya existe el item
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        color,
        size
      }
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (sizeStock.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente. Tienes ${existingItem.quantity} y quieres agregar ${quantity}`,
        });
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          price: itemPrice,
          name: itemName,
          image: itemImage,
          subtotal: newQuantity * itemPrice
        }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          name: itemName,
          price: itemPrice,
          image: itemImage,
          color,
          size,
          quantity,
          subtotal: quantity * itemPrice
        }
      });
    }

    // Incrementar contador en producto
    await prisma.product.update({
      where: { id: productId },
      data: { addToCartCount: { increment: 1 } }
    });

    // Registrar en historial (no-crítico)
    try {
      await prisma.cartHistory.create({
        data: {
          userId: req.user?.id,
          sessionId: req.headers["x-session-id"],
          productId,
          productName: itemName,
          color,
          size,
          quantity,
          price: itemPrice,
          originalPrice: itemOriginalPrice,
          action: "added",
        }
      });
    } catch (histErr) {
      console.warn("CartHistory no disponible, omitiendo registro:", histErr.message);
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true }
    });

    res.json({
      success: true,
      message: "Producto agregado al carrito",
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Error en addToCart:", error);
    res.status(500).json({
      success: false,
      message: "Error al agregar al carrito",
      error: error.message,
    });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: "La cantidad debe ser al menos 1" });
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true
      }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: "Item no encontrado" });
    }

    // Verificar stock
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: {
        variants: {
          where: { color: item.color || "N/A" },
          include: { sizes: { where: { size: item.size } } }
        }
      }
    });

    const variant = product.variants[0];
    const sizeStock = variant?.sizes[0];

    if (!sizeStock || sizeStock.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo hay ${sizeStock?.stock || 0} disponibles`,
      });
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity,
        price: product.price,
        name: product.name,
        subtotal: quantity * product.price
      }
    });

    // Registrar en historial (no-crítico)
    try {
      await prisma.cartHistory.create({
        data: {
          userId: req.user?.id,
          sessionId: req.headers["x-session-id"],
          productId: item.productId,
          productName: product.name,
          color: item.color,
          size: item.size,
          quantity,
          price: product.price,
          originalPrice: product.originalPrice,
          action: "updated",
        }
      });
    } catch (histErr) {
      console.warn("CartHistory no disponible, omitiendo registro:", histErr.message);
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: item.cartId },
      include: { items: true }
    });

    res.json({
      success: true,
      message: "Carrito actualizado",
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Error en updateCartItem:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar carrito",
      error: error.message,
    });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId }
    });

    if (item) {
      // Registrar en historial (no-crítico)
      try {
        await prisma.cartHistory.create({
          data: {
            userId: req.user?.id,
            sessionId: req.headers["x-session-id"],
            productId: item.productId,
            productName: item.name,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            originalPrice: item.originalPrice,
            action: "removed",
          }
        });
      } catch (histErr) {
        console.warn("CartHistory no disponible, omitiendo registro:", histErr.message);
      }

      await prisma.cartItem.delete({ where: { id: itemId } });
    }

    const cart = await prisma.cart.findUnique({
      where: req.user ? { userId: req.user.id } : { sessionId: req.headers["x-session-id"] },
      include: { items: true }
    });

    res.json({
      success: true,
      message: "Item eliminado del carrito",
      cart,
    });
  } catch (error) {
    console.error("Error en removeFromCart:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar del carrito",
      error: error.message,
    });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const where = req.user
      ? { userId: req.user.id }
      : { sessionId: req.headers["x-session-id"] };

    const cart = await prisma.cart.findUnique({ where, include: { items: true } });

    if (cart) {
      // Historial (no-crítico)
      try {
        for (const item of cart.items) {
          await prisma.cartHistory.create({
            data: {
              userId: req.user?.id,
              sessionId: req.headers["x-session-id"],
              productId: item.productId,
              productName: item.name,
              color: item.color,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
              originalPrice: item.originalPrice,
              action: "removed",
            }
          });
        }
      } catch (histErr) {
        console.warn("CartHistory no disponible, omitiendo registro:", histErr.message);
      }

      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    res.json({
      success: true,
      message: "Carrito vaciado",
      cart: { ...cart, items: [] },
    });
  } catch (error) {
    console.error("Error en clearCart:", error);
    res.status(500).json({
      success: false,
      message: "Error al vaciar carrito",
      error: error.message,
    });
  }
};

exports.getCartHistory = async (req, res) => {
  try {
    const { limit = 50, action } = req.query;

    const where = req.user
      ? { userId: req.user.id }
      : { sessionId: req.headers["x-session-id"] };

    if (action) where.action = action;

    const history = await prisma.cartHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("Error en getCartHistory:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener historial",
      error: error.message,
    });
  }
};

exports.syncCart = async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"];
    const userId = req.user.id;

    // Buscar carrito de sesión
    const sessionCart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true }
    });

    // Buscar o crear carrito de usuario
    let userCart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: { userId },
        include: { items: true }
      });
    }

    if (sessionCart && sessionCart.items.length > 0) {
      for (const sessionItem of sessionCart.items) {
        const existingItem = userCart.items.find(
          (item) =>
            item.productId === sessionItem.productId &&
            item.color === sessionItem.color &&
            item.size === sessionItem.size
        );

        if (existingItem) {
          const newQuantity = existingItem.quantity + sessionItem.quantity;
          await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: newQuantity, subtotal: newQuantity * existingItem.price }
          });
        } else {
          await prisma.cartItem.create({
            data: {
              ...sessionItem,
              id: undefined, // Dejar que Prisma genere uno nuevo o se copie
              cartId: userCart.id
            }
          });
        }
      }

      // Eliminar carrito de sesión
      await prisma.cart.delete({ where: { id: sessionCart.id } });
    }

    const finalCart = await prisma.cart.findUnique({
      where: { id: userCart.id },
      include: { items: true }
    });

    res.json({
      success: true,
      message: "Carrito sincronizado",
      cart: finalCart,
    });
  } catch (error) {
    console.error("Error en syncCart:", error);
    res.status(500).json({
      success: false,
      message: "Error al sincronizar carrito",
      error: error.message,
    });
  }
};
