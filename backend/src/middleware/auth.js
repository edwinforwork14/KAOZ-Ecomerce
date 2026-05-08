const jwt = require("jsonwebtoken");
const { prisma } = require("../config/database");

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // BYPASS para desarrollo local si no hay token
    if (!token && process.env.NODE_ENV === "development") {
      console.warn("⚠️ Advertencia: Bypass de autenticación activo en desarrollo");
      // Buscamos el primer admin para asignar a req.user o creamos un mock
      req.user = await prisma.user.findFirst({ where: { role: "admin" } });
      if (req.user) return next();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No autorizado, token no proporcionado",
        code: "NO_TOKEN",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Usuario no encontrado",
          code: "USER_NOT_FOUND",
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Usuario inactivo",
          code: "USER_INACTIVE",
        });
      }

      next();
    } catch (jwtError) {
      // Diferenciar entre token expirado y token inválido
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expirado. Por favor inicia sesión nuevamente",
          code: "TOKEN_EXPIRED",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Token no válido",
        code: "INVALID_TOKEN",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error en autenticación",
      code: "AUTH_ERROR",
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para realizar esta acción",
        code: "FORBIDDEN",
      });
    }
    next();
  };
};

exports.optional = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
    }

    next();
  } catch (error) {
    next();
  }
};
