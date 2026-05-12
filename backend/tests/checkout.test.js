const request = require("supertest");
const express = require("express");
const orderRoutes = require("../src/routes/orders");
const { prisma } = require("../src/config/database");

// Mock middlewares
jest.mock("../src/middleware/auth", () => ({
  protect: (req, res, next) => {
    req.user = { id: "test-user-uuid", role: "user" };
    next();
  },
  optional: (req, res, next) => {
    next();
  }
}));

const app = express();
app.use(express.json());
app.use("/api/orders", orderRoutes);

describe("Checkout Flow - Order Creation (Service-Based)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create an order successfully from a valid cart", async () => {
    const mockCart = {
      id: "cart-123",
      items: [
        { productId: "prod-1", name: "Hoodie", image: "img.jpg", color: "Black", size: "L", quantity: 2, price: 50, subtotal: 100 }
      ]
    };

    const mockProduct = {
      id: "prod-1",
      name: "Hoodie",
      variants: [
        { 
          color: "Black",
          sizes: [{ id: "size-1", size: "L", stock: 10 }] 
        }
      ]
    };

    // Mocks de Prisma
    jest.spyOn(prisma.cart, "findFirst").mockResolvedValue(mockCart);
    jest.spyOn(prisma.product, "findUnique").mockResolvedValue(mockProduct);
    jest.spyOn(prisma.productSize, "update").mockResolvedValue({ id: "size-1", stock: 8 });
    jest.spyOn(prisma.order, "create").mockResolvedValue({
      id: "order-uuid",
      orderNumber: "YF-12345",
      total: 100,
      items: []
    });
    jest.spyOn(prisma.cartItem, "deleteMany").mockResolvedValue({ count: 1 });
    // Mock for transaction
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => {
      return await callback(prisma);
    });

    const response = await request(app)
      .post("/api/orders")
      .send({
        customerInfo: { email: "customer@test.com", firstName: "John", phone: "123" },
        paymentMethod: "whatsapp",
        shippingMethod: "standard"
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.order.orderNumber).toContain("YF-");
  });

  it("should fail if cart is empty", async () => {
    jest.spyOn(prisma.cart, "findFirst").mockResolvedValue(null);

    const response = await request(app)
      .post("/api/orders")
      .send({
        customerInfo: { email: "test@test.com", firstName: "John" },
        paymentMethod: "whatsapp"
      });

    expect(response.status).toBe(400); // Changed to 400 in our implementation
    expect(response.body.message).toContain("vacío");
  });

  it("should fail if stock is insufficient", async () => {
    const mockCart = {
      id: "cart-123",
      items: [{ productId: "prod-1", name: "Hoodie", color: "Black", size: "L", quantity: 100, price: 50 }]
    };
    const mockProduct = {
      id: "prod-1",
      name: "Hoodie",
      variants: [
        { 
          color: "Black",
          sizes: [{ id: "size-1", size: "L", stock: 5 }] 
        }
      ]
    };

    jest.spyOn(prisma.cart, "findFirst").mockResolvedValue(mockCart);
    jest.spyOn(prisma.product, "findUnique").mockResolvedValue(mockProduct);
    
    // Mock for transaction
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => {
      return await callback(prisma);
    });

    const response = await request(app)
      .post("/api/orders")
      .send({
        customerInfo: { email: "test@test.com", firstName: "John" },
        paymentMethod: "whatsapp"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Stock insuficiente");
  });
});
