const { prisma } = require("../src/config/database");
const OrderService = require("../src/services/orderService");

async function testOrderFlow() {
  console.log("🚀 Starting Order Flow Test...");

  try {
    // 1. Setup data
    // Find a product with stock
    const productSize = await prisma.productSize.findFirst({
      where: { stock: { gt: 0 } },
      include: {
        variant: {
          include: {
            product: true
          }
        }
      }
    });

    if (!productSize) {
      console.log("❌ No products with stock found. Please seed the DB.");
      return;
    }

    const { variant, size } = productSize;
    const { product } = variant;

    console.log(`📦 Testing with Product: ${product.name}, Color: ${variant.color}, Size: ${size}`);
    console.log(`📉 Initial Stock: ${productSize.stock}`);

    // 2. Create a cart
    const sessionId = "test-session-" + Date.now();
    const cartId = "test-cart-" + Date.now();
    const cart = await prisma.cart.create({
      data: {
        id: cartId,
        sessionId,
        items: {
          create: {
            id: "test-item-" + Date.now(),
            productId: product.id,
            name: product.name,
            color: variant.color,
            size: size,
            quantity: 1,
            price: product.price,
            subtotal: product.price
          }
        }
      }
    });

    console.log("🛒 Test Cart Created");

    // 3. Create Order
    const orderData = {
      sessionId,
      customerInfo: {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phone: "123456789"
      },
      paymentMethod: "transferencia",
      shippingMethod: "retiro",
      notes: "Test order"
    };

    const result = await OrderService.createOrder(orderData);
    console.log("✅ Order Created Successfully:", result.order.orderNumber);

    // 4. Verify Stock Decrement
    const updatedStock = await prisma.productSize.findUnique({
      where: { id: productSize.id }
    });

    console.log(`📉 Updated Stock: ${updatedStock.stock}`);
    if (updatedStock.stock === productSize.stock - 1) {
      console.log("✅ Stock correctly decremented!");
    } else {
      console.log("❌ Stock decrement failed!");
    }

    // 5. Verify Cart Empty
    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id }
    });

    if (cartItems.length === 0) {
      console.log("✅ Cart correctly emptied!");
    } else {
      console.log("❌ Cart not emptied!");
    }

    // 6. Test Atomic Rollback (Simulate over-selling)
    console.log("\n🧪 Testing Atomic Rollback (Insufficient Stock)...");
    
    // Create another cart for the same product
    const sessionId2 = "test-session-2-" + Date.now();
    const cartId2 = "test-cart-2-" + Date.now();
    await prisma.cart.create({
      data: {
        id: cartId2,
        sessionId: sessionId2,
        items: {
          create: {
            id: "test-item-2-" + Date.now(),
            productId: product.id,
            name: product.name,
            color: variant.color,
            size: size,
            quantity: updatedStock.stock + 10, // More than available
            price: product.price,
            subtotal: product.price * (updatedStock.stock + 10)
          }
        }
      }
    });

    try {
      await OrderService.createOrder({
        sessionId: sessionId2,
        customerInfo: orderData.customerInfo,
        paymentMethod: "transferencia",
        shippingMethod: "retiro"
      });
      console.log("❌ Error: Order should have failed due to stock!");
    } catch (e) {
      console.log("✅ Order failed as expected:", e.message);
      
      // Verify order was NOT created
      const failedOrder = await prisma.order.findFirst({
        where: { notes: "This should not exist" } // We didn't set this but just checking count
      });
      // Better: check that stock didn't change
      const finalStock = await prisma.productSize.findUnique({
        where: { id: productSize.id }
      });
      if (finalStock.stock === updatedStock.stock) {
        console.log("✅ Stock remained unchanged (Transaction Rolled Back)!");
      } else {
        console.log("❌ Stock changed despite failure!");
      }
    }

  } catch (error) {
    console.error("❌ Test failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testOrderFlow();
