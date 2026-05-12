const { protect } = require("../src/middleware/auth");
const jwt = require("jsonwebtoken");
const { supabase } = require("../src/config/supabase");
const { prisma } = require("../src/config/database");

jest.mock("../src/config/supabase");
jest.mock("../src/config/database", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Auth Middleware - protect", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      originalUrl: "/api/test",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should return 401 if no token is provided", async () => {
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "NO_TOKEN" }));
  });

  it("should validate via Supabase if token is valid", async () => {
    const mockUser = { id: "user-123", email: "test@test.com", app_metadata: { role: "user" } };
    req.headers.authorization = "Bearer valid-supabase-token";
    
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    prisma.user.findUnique.mockResolvedValue(null); // No está en DB local todavía

    await protect(req, res, next);

    expect(supabase.auth.getUser).toHaveBeenCalledWith("valid-supabase-token");
    expect(req.user.id).toBe("user-123");
    expect(next).toHaveBeenCalled();
  });

  it("should fallback to local JWT if Supabase fails", async () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-secret";
    
    const mockToken = jwt.sign({ id: "local-user-id" }, process.env.JWT_SECRET);
    req.headers.authorization = `Bearer ${mockToken}`;
    
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "Invalid token" } });
    prisma.user.findUnique.mockResolvedValue({ id: "local-user-id", role: "admin", email: "admin@kaoz.com" });

    await protect(req, res, next);

    expect(req.user.role).toBe("admin");
    expect(next).toHaveBeenCalled();
    
    process.env.JWT_SECRET = originalSecret;
  });

  it("should return 401 if both validations fail", async () => {
    req.headers.authorization = "Bearer invalid-token";
    
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "Invalid" } });
    // jwt.verify lanzará un error porque el token no es válido

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_TOKEN" }));
  });
});
