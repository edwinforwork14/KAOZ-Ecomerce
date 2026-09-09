const jwt = require("jsonwebtoken");
const { prisma } = require("../config/database");

// Algoritmos permitidos para validación local
const ALLOWED_ALGORITHMS = ["HS256"];

exports.protect = async (req, res, next) => {
  const path = req.originalUrl;
  console.log(`🔐 [AUTH] Protegiendo ruta: ${path}`);

  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No autorizado, token no proporcionado",
        code: "NO_TOKEN",
      });
    }

    try {
      // Validación LOCAL (bcrypt + JWT, sin Supabase Auth)
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ALLOWED_ALGORITHMS
      });

      console.log(`✅ [AUTH] Local OK para ID: ${decoded.id}`);
      const dbUser = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!dbUser) {
        return res.status(401).json({
          success: false,
          message: "El usuario ya no existe.",
          code: "USER_NOT_FOUND",
        });
      }

      if (!dbUser.isActive) {
        return res.status(401).json({
          success: false,
          message: "Usuario desactivado.",
          code: "USER_INACTIVE",
        });
      }

      req.user = dbUser;
      return next();
    } catch (localError) {
      console.error("❌ [AUTH] Fallo en validación:", localError.message);

      const message = localError.name === 'TokenExpiredError' ? "Token expirado" : "Token no válido";
      const code = localError.name === 'TokenExpiredError' ? "TOKEN_EXPIRED" : "INVALID_TOKEN";

      return res.status(401).json({
        success: false,
        message,
        code,
        debug: {
          localError: localError.message
        }
      });
    }
  } catch (error) {
    console.error("❌ [AUTH] Error externo:", error);
    return res.status(500).json({
      success: false,
      message: "Error en el servidor",
      code: "SERVER_ERROR",
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
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
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];

      // Validación Local
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ALLOWED_ALGORITHMS });
        req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
      } catch (e) { /* Silencioso en optional */ }
    }
    next();
  } catch (error) {
    next();
  }
};
