const request = require("supertest");
const express = require("express");
const orderRoutes = require("../src/routes/orders");
const { prisma } = require("../config/database");

// Mock middlewares
jest.mock("../src/middleware/auth", () => ({
  protect: (req, res, next) => {
    req.user = { id: "test-user-uuid", role: "user" };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use("/api/orders", orderRoutes);

describe("Checkout Flow - Order Creation", () => {
  beforeAll(async () => {
    // Limpiar o preparar DB si fuera necesario (usualmente se usan mocks o DB de test)
  });

  it("should create an order successfully from a valid cart", async () => {
    // Mock prisma responses
    const mockCart = {
      id: "cart-123",
      items: [
        { productId: "prod-1", quantity: 2, price: 50, subtotal: 100 }
      ]
    };

    const mockProduct = {
      id: "prod-1",
      name: "Test Product",
      price: 50,
      isActive: true,
      variants: [
        { sizes: [{ size: "M", stock: 10 }] }
      ]
    };

    // Mocks de Prisma
    jest.spyOn(prisma.cart, "findFirst").mockResolvedValue(mockCart);
    jest.spyOn(prisma.product, "findUnique").mockResolvedValue(mockProduct);
    jest.spyOn(prisma.order, "create").mockResolvedValue({
      id: "order-uuid",
      orderNumber: "ORD-12345",
      total: 100
    });
    jest.spyOn(prisma.cartItem, "deleteMany").mockResolvedValue({ count: 1 });

    const response = await request(app)
      .post("/api/orders")
      .send({
        customerInfo: { email: "customer@test.com", phone: "123" },
        paymentMethod: { type: "whatsapp" }
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.order.orderNumber).toBe("ORD-12345");
  });

  it("should fail if cart is empty", async () => {
    jest.spyOn(prisma.cart, "findFirst").mockResolvedValue(null);

    const response = await request(app)
      .post("/api/orders")
      .send({ customerInfo: {} });

    expect(response.status).toBe(404);
    expect(response.body.message).toContain("Carrito no encontrado");
  });

  it("should fail if stock is insufficient", async () => {
    const mockCart = {
      items: [{ productId: "prod-1", quantity: 100 }]
    };
    const mockProduct = {
      variants: [{ sizes: [{ size: "M", stock: 5 }] }]
    };

    jest.spyOn(prisma.cart, "findFirst").mockResolvedValue(mockCart);
    jest.spyOn(prisma.product, "findUnique").mockResolvedValue(mockProduct);

    const response = await request(app)
      .post("/api/orders")
      .send({ customerInfo: {} });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Stock insuficiente");
  });
});
