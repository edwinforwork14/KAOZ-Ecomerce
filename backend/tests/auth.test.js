const { protect } = require("../src/middleware/auth");
const jwt = require("jsonwebtoken");
const { prisma } = require("../src/config/database");

jest.mock("../src/config/database", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Auth Middleware - protect (solo JWT local)", () => {
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

  it("should validate a valid local JWT", async () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-secret";

    const mockToken = jwt.sign({ id: "local-user-id" }, process.env.JWT_SECRET);
    req.headers.authorization = `Bearer ${mockToken}`;

    prisma.user.findUnique.mockResolvedValue({
      id: "local-user-id",
      role: "admin",
      email: "admin@kaoz.com",
      isActive: true,
    });

    await protect(req, res, next);

    expect(req.user.role).toBe("admin");
    expect(next).toHaveBeenCalled();

    process.env.JWT_SECRET = originalSecret;
  });

  it("should return 401 if the user no longer exists", async () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-secret";

    const mockToken = jwt.sign({ id: "deleted-user-id" }, process.env.JWT_SECRET);
    req.headers.authorization = `Bearer ${mockToken}`;
    prisma.user.findUnique.mockResolvedValue(null);

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "USER_NOT_FOUND" }));

    process.env.JWT_SECRET = originalSecret;
  });

  it("should return 401 if the token is invalid", async () => {
    req.headers.authorization = "Bearer invalid-token";
    // jwt.verify lanzará un error porque el token no es válido

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_TOKEN" }));
  });
});
