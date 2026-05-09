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
      // Validar el token directamente con Supabase
      const { supabase } = require("../config/supabase");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error("❌ [AUTH] Error de validación Supabase:", authError?.message);
        return res.status(401).json({
          success: false,
          message: "Token no válido o expirado",
          code: "INVALID_TOKEN",
        });
      }

      // Buscar el usuario en nuestra base de datos local de Prisma para obtener el rol
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

      if (!dbUser) {
        // Si no existe en la DB local pero sí en Supabase, es un usuario nuevo o huérfano
        // Podríamos crearlo aquí o simplemente usar los datos de Supabase
        req.user = {
          id: user.id,
          email: user.email,
          role: user.app_metadata?.role || "user", // Supabase suele guardar el rol aquí
          isActive: true
        };
      } else {
        req.user = dbUser;
      }

      if (req.user && !req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Usuario inactivo",
          code: "USER_INACTIVE",
        });
      }

      next();
    } catch (error) {
      console.error("❌ [AUTH] Error interno en validación:", error.message);
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
