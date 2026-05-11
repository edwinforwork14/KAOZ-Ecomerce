const jwt = require("jsonwebtoken");
const { prisma } = require("../config/database");

exports.protect = async (req, res, next) => {
  console.log(`🔐 [AUTH] Intentando proteger ruta: ${req.originalUrl}`);
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
      // Validar el token directamente de forma LOCAL usando la firma de JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      console.log(`✅ [AUTH] Token decodificado localmente para ID: ${decoded.id}`);

      // Buscar el usuario en nuestra base de datos local de Prisma
      const dbUser = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!dbUser) {
        return res.status(401).json({
          success: false,
          message: "El usuario perteneciente a este token ya no existe.",
          code: "USER_NOT_FOUND",
        });
      }

      if (!dbUser.isActive) {
        return res.status(401).json({
          success: false,
          message: "Usuario inactivo",
          code: "USER_INACTIVE",
        });
      }

      // Adjuntar usuario a la request
      req.user = dbUser;
      next();
    } catch (error) {
      console.error("❌ [AUTH] Error interno en validación de token local:", error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: "Token expirado",
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
    console.error("❌ [AUTH] Error fatal en middleware protect:", error);
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
  console.log(`🔓 [AUTH] Ruta opcional: ${req.originalUrl}`);
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      
      const { supabase } = require("../config/supabase");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        req.user = dbUser || {
          id: user.id,
          email: user.email,
          role: user.app_metadata?.role || "user",
          isActive: true
        };
      }
    }

    next();
  } catch (error) {
    next();
  }
};
