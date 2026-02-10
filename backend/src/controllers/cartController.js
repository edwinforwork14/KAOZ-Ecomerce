const Cart = require("../models/Cart");
const Product = require("../models/Product");
const CartHistory = require("../models/CartHistory");
console.log("==================================================\n");

exports.getCart = async (req, res) => {
  try {
    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.headers["x-session-id"] };

    let cart = await Cart.findOne(query).populate({
      path: "items.product",
      match: { isActive: true }, // Solo productos activos
    });

    if (!cart) {
      cart = await Cart.create(query);
    }

    // Limpiar items con productos null o inactivos
    if (cart.items && cart.items.length > 0) {
      const validItems = cart.items.filter((item) => item.product != null);

      // Si se eliminaron items, actualizar el carrito
      if (validItems.length !== cart.items.length) {
        cart.items = validItems;
        await cart.save();
      }
    }

    console.log("==================== GET CART ====================");
    console.log("Total items en carrito:", cart.items.length);
    cart.items.forEach((item, index) => {
      console.log(`\nItem ${index + 1}:`);
      console.log("  - Nombre:", item.name);
      console.log("  - Price guardado en item:", item.price);
      console.log("  - OriginalPrice guardado en item:", item.originalPrice);
      console.log("  - Cantidad:", item.quantity);
      if (item.product) {
        console.log("  - Price del producto en DB:", item.product.price);
        console.log(
          "  - OriginalPrice del producto en DB:",
          item.product.originalPrice
        );
      }
    });
    console.log("==================================================\n");

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
    console.log("\n==================== ADD TO CART ====================");
    console.log("Datos recibidos del frontend:");
    console.log("Body completo:", JSON.stringify(req.body, null, 2));

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

    console.log("\nExtracción de datos:");
    console.log("  - productId:", productId);
    console.log("  - frontendPrice (del body):", frontendPrice);
    console.log("  - frontendOriginalPrice (del body):", frontendOriginalPrice);
    console.log("  - frontendName:", frontendName);
    console.log("  - quantity:", quantity);

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    console.log("\nProducto encontrado en DB:");
    console.log("  - Nombre:", product.name);
    console.log("  - Price en DB:", product.price);
    console.log("  - OriginalPrice en DB:", product.originalPrice);

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: "Este producto ya no está disponible",
      });
    }

    // Verificar stock disponible
    const variant = product.variants.find((v) => v.color === color);
    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Color no disponible",
      });
    }

    const sizeStock = variant.sizes.find((s) => s.size === size);
    if (!sizeStock) {
      return res.status(400).json({
        success: false,
        message: "Talla no disponible",
      });
    }

    if (sizeStock.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo hay ${sizeStock.stock} unidades disponibles`,
        availableStock: sizeStock.stock,
      });
    }

    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.headers["x-session-id"] };
    let cart = await Cart.findOne(query);

    if (!cart) {
      cart = new Cart(query);
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.color === color &&
        item.size === size
    );

    // Usar precios del frontend si están disponibles, sino del producto
    const itemPrice =
      frontendPrice !== undefined ? frontendPrice : product.price;
    const itemOriginalPrice =
      frontendOriginalPrice !== undefined
        ? frontendOriginalPrice
        : product.originalPrice;
    const itemName = frontendName || product.name;
    const itemImage = frontendImage || product.images[0]?.url;

    console.log("\n🔍 DECISIÓN DE PRECIOS:");
    console.log(
      "  - frontendPrice viene definido?",
      frontendPrice !== undefined
    );
    console.log(
      "  - frontendOriginalPrice viene definido?",
      frontendOriginalPrice !== undefined
    );
    console.log("\n  ✅ PRECIO FINAL QUE SE GUARDARÁ:");
    console.log("     itemPrice =", itemPrice);
    console.log("     itemOriginalPrice =", itemOriginalPrice);
    console.log("     itemName =", itemName);

    if (itemIndex > -1) {
      console.log("\n⚠️ Item YA EXISTE en carrito - Actualizando cantidad");
      console.log("  - Cantidad anterior:", cart.items[itemIndex].quantity);
      console.log("  - Price anterior:", cart.items[itemIndex].price);
      console.log(
        "  - OriginalPrice anterior:",
        cart.items[itemIndex].originalPrice
      );

      // Verificar stock total incluyendo cantidad existente
      const newQuantity = cart.items[itemIndex].quantity + quantity;
      if (sizeStock.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente. Solo hay ${sizeStock.stock} unidades disponibles y ya tienes ${cart.items[itemIndex].quantity} en el carrito`,
          availableStock: sizeStock.stock,
          currentInCart: cart.items[itemIndex].quantity,
        });
      }
      cart.items[itemIndex].quantity = newQuantity;

      // Actualizar precios en caso de que hayan cambiado
      cart.items[itemIndex].price = itemPrice;
      cart.items[itemIndex].originalPrice = itemOriginalPrice;
      cart.items[itemIndex].name = itemName;
      cart.items[itemIndex].image = itemImage;

      console.log("\n  ✅ DESPUÉS DE ACTUALIZAR:");
      console.log("     Nueva cantidad:", cart.items[itemIndex].quantity);
      console.log("     Nuevo price:", cart.items[itemIndex].price);
      console.log(
        "     Nuevo originalPrice:",
        cart.items[itemIndex].originalPrice
      );
    } else {
      console.log("\n✨ NUEVO ITEM - Agregando al carrito");

      const newItem = {
        product: productId,
        name: itemName,
        price: itemPrice,
        originalPrice: itemOriginalPrice,
        image: itemImage,
        color,
        size,
        quantity,
      };

      console.log(
        "  Objeto que se agregará:",
        JSON.stringify(newItem, null, 2)
      );

      cart.items.push(newItem);
    }

    console.log("\n💾 Guardando carrito...");
    await cart.save();
    console.log("✅ Carrito guardado exitosamente");

    // Incrementar contador en producto
    product.addToCartCount += 1;
    await product.save();

    // Registrar en historial
    await CartHistory.create({
      user: req.user?._id,
      sessionId: req.headers["x-session-id"],
      product: productId,
      productName: itemName,
      color,
      size,
      quantity,
      price: itemPrice,
      originalPrice: itemOriginalPrice,
      action: "added",
    });

    cart = await cart.populate({
      path: "items.product",
      match: { isActive: true },
    });

    // Limpiar items null después de populate
    if (cart.items && cart.items.length > 0) {
      cart.items = cart.items.filter((item) => item.product != null);
    }

    console.log("\n📦 CARRITO FINAL que se enviará al frontend:");
    cart.items.forEach((item, index) => {
      console.log(`\n  Item ${index + 1}:`);
      console.log("    - Nombre:", item.name);
      console.log("    - Price en item:", item.price);
      console.log("    - OriginalPrice en item:", item.originalPrice);
      console.log("    - Cantidad:", item.quantity);
    });
    console.log("====================================================\n");

    res.json({
      success: true,
      message: "Producto agregado al carrito",
      cart,
    });
  } catch (error) {
    console.error("❌ Error en addToCart:", error);
    res.status(500).json({
      success: false,
      message: "Error al agregar al carrito",
      error: error.message,
    });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    console.log("\n==================== UPDATE CART ITEM ====================");
    const { itemId } = req.params;
    const { quantity } = req.body;

    console.log("ItemId:", itemId);
    console.log("Nueva cantidad:", quantity);

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser al menos 1",
      });
    }

    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.headers["x-session-id"] };
    const cart = await Cart.findOne(query);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Carrito no encontrado",
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item no encontrado",
      });
    }

    console.log("\nItem encontrado:");
    console.log("  - Nombre:", item.name);
    console.log("  - Price actual:", item.price);
    console.log("  - OriginalPrice actual:", item.originalPrice);
    console.log("  - Cantidad actual:", item.quantity);

    // Verificar stock disponible
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Producto no disponible",
      });
    }

    console.log("\nProducto en DB:");
    console.log("  - Price en DB:", product.price);
    console.log("  - OriginalPrice en DB:", product.originalPrice);

    const variant = product.variants.find((v) => v.color === item.color);
    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Variante no encontrada",
      });
    }

    const sizeStock = variant.sizes.find((s) => s.size === item.size);
    if (!sizeStock) {
      return res.status(400).json({
        success: false,
        message: "Talla no encontrada",
      });
    }

    if (sizeStock.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo hay ${sizeStock.stock} unidades disponibles`,
        availableStock: sizeStock.stock,
      });
    }

    item.quantity = quantity;

    // Actualizar precios del producto por si cambiaron
    console.log("\n🔄 Actualizando precios del producto...");
    console.log("  Precio ANTES:", item.price);
    item.price = product.price;
    console.log("  Precio DESPUÉS:", item.price);

    console.log("  OriginalPrice ANTES:", item.originalPrice);
    item.originalPrice = product.originalPrice;
    console.log("  OriginalPrice DESPUÉS:", item.originalPrice);

    item.name = product.name;

    await cart.save();
    console.log("✅ Item actualizado y guardado");

    // Registrar en historial
    await CartHistory.create({
      user: req.user?._id,
      sessionId: req.headers["x-session-id"],
      product: item.product,
      productName: item.name,
      color: item.color,
      size: item.size,
      quantity,
      price: item.price,
      originalPrice: item.originalPrice,
      action: "updated",
    });

    await cart.populate({
      path: "items.product",
      match: { isActive: true },
    });

    // Limpiar items null
    if (cart.items && cart.items.length > 0) {
      cart.items = cart.items.filter((item) => item.product != null);
    }

    console.log("==========================================================\n");

    res.json({
      success: true,
      message: "Carrito actualizado",
      cart,
    });
  } catch (error) {
    console.error("❌ Error en updateCartItem:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar carrito",
      error: error.message,
    });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    console.log("\n==================== REMOVE FROM CART ====================");
    const { itemId } = req.params;
    console.log("ItemId a eliminar:", itemId);

    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.headers["x-session-id"] };
    const cart = await Cart.findOne(query);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Carrito no encontrado",
      });
    }

    const item = cart.items.id(itemId);
    if (item) {
      console.log("Item encontrado:");
      console.log("  - Nombre:", item.name);
      console.log("  - Price:", item.price);
      console.log("  - OriginalPrice:", item.originalPrice);

      // Registrar en historial
      await CartHistory.create({
        user: req.user?._id,
        sessionId: req.headers["x-session-id"],
        product: item.product,
        productName: item.name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
        action: "removed",
      });

      cart.items.pull(itemId);
      await cart.save();
      console.log("✅ Item eliminado del carrito");
    } else {
      console.log("⚠️ Item no encontrado");
    }

    await cart.populate({
      path: "items.product",
      match: { isActive: true },
    });

    // Limpiar items null
    if (cart.items && cart.items.length > 0) {
      cart.items = cart.items.filter((item) => item.product != null);
    }

    console.log("==========================================================\n");

    res.json({
      success: true,
      message: "Item eliminado del carrito",
      cart,
    });
  } catch (error) {
    console.error("❌ Error en removeFromCart:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar del carrito",
      error: error.message,
    });
  }
};

exports.clearCart = async (req, res) => {
  try {
    console.log("\n==================== CLEAR CART ====================");
    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.headers["x-session-id"] };
    const cart = await Cart.findOne(query);

    if (cart) {
      console.log("Items a limpiar:", cart.items.length);

      // Registrar en historial antes de limpiar
      for (const item of cart.items) {
        await CartHistory.create({
          user: req.user?._id,
          sessionId: req.headers["x-session-id"],
          product: item.product,
          productName: item.name,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          originalPrice: item.originalPrice,
          action: "removed",
        });
      }

      cart.items = [];
      await cart.save();
      console.log("✅ Carrito vaciado");
    }

    console.log("====================================================\n");

    res.json({
      success: true,
      message: "Carrito vaciado",
      cart,
    });
  } catch (error) {
    console.error("❌ Error en clearCart:", error);
    res.status(500).json({
      success: false,
      message: "Error al vaciar carrito",
      error: error.message,
    });
  }
};

// Endpoint para obtener historial de carrito por usuario
exports.getCartHistory = async (req, res) => {
  try {
    const { limit = 50, action } = req.query;

    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.headers["x-session-id"] };

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
    console.error("Error en getCartHistory:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener historial",
      error: error.message,
    });
  }
};

// Endpoint para sincronizar carrito al iniciar sesión
exports.syncCart = async (req, res) => {
  try {
    console.log("\n==================== SYNC CART ====================");
    const sessionId = req.headers["x-session-id"];
    const userId = req.user._id;

    console.log("SessionId:", sessionId);
    console.log("UserId:", userId);

    // Buscar carrito de sesión
    const sessionCart = await Cart.findOne({ sessionId });

    // Buscar o crear carrito de usuario
    let userCart = await Cart.findOne({ user: userId });

    if (!userCart) {
      userCart = new Cart({ user: userId });
    }

    // Si hay carrito de sesión, fusionar con carrito de usuario
    if (sessionCart && sessionCart.items.length > 0) {
      console.log(
        "\nCarrito de sesión encontrado con",
        sessionCart.items.length,
        "items"
      );

      for (const sessionItem of sessionCart.items) {
        console.log("\nProcesando item:", sessionItem.name);
        console.log("  - Price:", sessionItem.price);
        console.log("  - OriginalPrice:", sessionItem.originalPrice);

        const existingItemIndex = userCart.items.findIndex(
          (item) =>
            item.product.toString() === sessionItem.product.toString() &&
            item.color === sessionItem.color &&
            item.size === sessionItem.size
        );

        if (existingItemIndex > -1) {
          console.log("  ⚠️ Item ya existe en carrito de usuario - Fusionando");

          // Verificar stock antes de sumar cantidades
          const product = await Product.findById(sessionItem.product);
          if (product && product.isActive) {
            const variant = product.variants.find(
              (v) => v.color === sessionItem.color
            );
            if (variant) {
              const sizeStock = variant.sizes.find(
                (s) => s.size === sessionItem.size
              );
              if (sizeStock) {
                const totalQuantity =
                  userCart.items[existingItemIndex].quantity +
                  sessionItem.quantity;

                userCart.items[existingItemIndex].quantity = Math.min(
                  totalQuantity,
                  sizeStock.stock
                );

                // Actualizar precios del producto
                console.log("  🔄 Actualizando precios:");
                console.log(
                  "     Price ANTES:",
                  userCart.items[existingItemIndex].price
                );
                userCart.items[existingItemIndex].price = product.price;
                console.log(
                  "     Price DESPUÉS:",
                  userCart.items[existingItemIndex].price
                );

                console.log(
                  "     OriginalPrice ANTES:",
                  userCart.items[existingItemIndex].originalPrice
                );
                userCart.items[existingItemIndex].originalPrice =
                  product.originalPrice;
                console.log(
                  "     OriginalPrice DESPUÉS:",
                  userCart.items[existingItemIndex].originalPrice
                );

                userCart.items[existingItemIndex].name = product.name;
              }
            }
          }
        } else {
          console.log("  ✨ Nuevo item - Agregando al carrito de usuario");
          userCart.items.push(sessionItem);
        }
      }

      await userCart.save();
      console.log("\n✅ Carrito de usuario guardado");

      // Eliminar carrito de sesión
      await Cart.deleteOne({ sessionId });
      console.log("✅ Carrito de sesión eliminado");
    } else {
      console.log("\n⚠️ No hay carrito de sesión para sincronizar");
    }

    await userCart.populate({
      path: "items.product",
      match: { isActive: true },
    });

    // Limpiar items null
    if (userCart.items && userCart.items.length > 0) {
      const validItems = userCart.items.filter((item) => item.product != null);
      if (validItems.length !== userCart.items.length) {
        userCart.items = validItems;
        await userCart.save();
      }
    }

    console.log("\n📦 CARRITO FINAL sincronizado:");
    userCart.items.forEach((item, index) => {
      console.log(`\n  Item ${index + 1}:`);
      console.log("    - Nombre:", item.name);
      console.log("    - Price:", item.price);
      console.log("    - OriginalPrice:", item.originalPrice);
      console.log("    - Cantidad:", item.quantity);
    });
    console.log("===================================================\n");

    res.json({
      success: true,
      message: "Carrito sincronizado",
      cart: userCart,
    });
  } catch (error) {
    console.error("❌ Error en syncCart:", error);
    res.status(500).json({
      success: false,
      message: "Error al sincronizar carrito",
      error: error.message,
    });
  }
};
