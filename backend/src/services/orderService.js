const crypto = require("crypto");
const { prisma } = require("../config/database");
const Settings = require("./settingsService");
const ExchangeRate = require("./exchangeRateService");

class OrderService {
  async generateOrderNumber(prefix = "YF") {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${timestamp}${random}`;
  }

  async createOrder({
    userId,
    sessionId,
    customerInfo,
    shippingAddress,
    shippingMethod,
    paymentMethod,
    notes,
  }) {
    // 1. Get configurations
    const settings = await Settings.getSettings();
    const exchangeRate = await ExchangeRate.getCurrentRate();

    // 2. Find cart
    const cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { sessionId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("El carrito está vacío");
    }

    // 3. Process items and calculate totals
    const itemsToCreate = [];
    let subtotal = 0;

    // We do a preliminary check for clarity, but the real check/decrement is in the transaction
    for (const item of cart.items) {
      itemsToCreate.push({
        id: crypto.randomUUID(),
        productId: item.productId,
        name: item.name,
        image: item.image,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      });
      subtotal += item.price * item.quantity;
    }

    // 4. Calculate shipping and total
    const selectedPaymentMethod = settings.paymentMethods?.find((m) => m.id === paymentMethod);
    const selectedShippingMethod = settings.shippingMethods?.find((m) => m.id === shippingMethod);

    let shippingCost = 0;
    if (selectedShippingMethod) {
      if (selectedShippingMethod.freeFrom > 0 && subtotal >= selectedShippingMethod.freeFrom) {
        shippingCost = 0;
      } else {
        shippingCost = selectedShippingMethod.additionalCost || 0;
      }
    }

    const total = subtotal + shippingCost;
    let totalInBs = null;
    if (exchangeRate) {
      const rate = settings.currency?.code === "EUR" ? exchangeRate.eur : exchangeRate.usd;
      totalInBs = total * rate;
    }

    const orderNumber = await this.generateOrderNumber(settings.orders?.prefix || "YF");

    // 5. Execute transaction
    return await prisma.$transaction(async (tx) => {
      // 5.1. Atomic Stock Validation & Decrement
      for (const item of itemsToCreate) {
        // Fetch product variant size directly within transaction to lock/ensure fresh state
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            variants: {
              where: { color: item.color || "N/A" },
              include: {
                sizes: { where: { size: item.size } }
              }
            }
          }
        });

        if (!product || !product.variants[0] || !product.variants[0].sizes[0]) {
          throw new Error(`Producto o variante no encontrada: ${item.name} (${item.color}, ${item.size})`);
        }

        const sizeStock = product.variants[0].sizes[0];

        if (sizeStock.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.name} (${item.color}, ${item.size}). Disponible: ${sizeStock.stock}`);
        }

        // Decrement stock
        await tx.productSize.update({
          where: { id: sizeStock.id },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // 5.2. Customer Linking (If guest, try to find by email)
      let finalUserId = userId;
      if (!finalUserId && customerInfo.email) {
        const existingUser = await tx.user.findUnique({
          where: { email: customerInfo.email }
        });
        if (existingUser) {
          finalUserId = existingUser.id;
        }
      }

      // 5.3. Create the Order
      const order = await tx.order.create({
        data: {
          id: crypto.randomUUID(),
          orderNumber,
          userId: finalUserId,
          customerInfo,
          shippingMethod: selectedShippingMethod ? {
            id: selectedShippingMethod.id,
            name: selectedShippingMethod.name,
            type: selectedShippingMethod.type,
            cost: shippingCost,
          } : null,
          shippingAddress: (selectedShippingMethod?.requiresAddress || selectedShippingMethod?.type === 'delivery') ? shippingAddress : null,
          subtotal,
          shipping: shippingCost,
          total,
          totalInBs,
          paymentMethod: selectedPaymentMethod ? {
            id: selectedPaymentMethod.id,
            name: selectedPaymentMethod.name,
            requiresProof: selectedPaymentMethod.requiresProof,
          } : { id: paymentMethod, name: paymentMethod },
          notes,
          statusHistory: [
            {
              status: "pending",
              note: "Pedido creado automáticamente",
              date: new Date(),
            },
          ],
          items: {
            create: itemsToCreate
          }
        },
        include: {
          items: true
        }
      });


      // 5.4. Clear Cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return {
        order,
        whatsappMessage: selectedPaymentMethod?.whatsappMessage || null,
        shippingMessage: selectedShippingMethod?.whatsappMessage || null,
      };
    });
  }
}

module.exports = new OrderService();
