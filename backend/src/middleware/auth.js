const jwt = require("jsonwebtoken");
const { prisma } = require("../config/database");
const { supabase } = require("../config/supabase");

// Algoritmos permitidos para validación local
const ALLOWED_ALGORITHMS = ["HS256"];

/**
 * Normaliza el objeto de usuario para que sea consistente sin importar la fuente
 */
const normalizeUser = async (user) => {
  if (!user) return null;
  
  // Si el usuario ya viene de nuestra DB, devolverlo
  if (user.role && user.id) {
    return user;
  }

  // Si viene de Supabase, buscarlo en nuestra DB o crear un perfil temporal
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  
  if (dbUser) return dbUser;

  // Fallback: Usuario de Supabase no sincronizado aún
  return {
    id: user.id,
    email: user.email,
    role: user.app_metadata?.role || "user",
    isActive: true,
    firstName: user.user_metadata?.firstName || "",
    lastName: user.user_metadata?.lastName || "",
    phone: user.phone || ""
  };
};

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
      // 1. Intentar validar con Supabase (Prioridad)
      console.log(`📡 [AUTH] Validando con Supabase...`);
      const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser(token);

      if (!supabaseError && supabaseUser) {
        console.log(`✅ [AUTH] Supabase OK: ${supabaseUser.email}`);
        req.user = await normalizeUser(supabaseUser);
        return next();
      }

      // 2. Fallback: Validación LOCAL
      console.log(`🔍 [AUTH] Supabase falló (${supabaseError?.message || "N/A"}). Intentando local...`);
      
      try {
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

        req.user = dbUser;
        return next();
      } catch (localError) {
        console.error("❌ [AUTH] Fallo total en validación.");
        
        const message = localError.name === 'TokenExpiredError' ? "Token expirado" : "Token no válido";
        const code = localError.name === 'TokenExpiredError' ? "TOKEN_EXPIRED" : "INVALID_TOKEN";

        return res.status(401).json({
          success: false,
          message,
          code,
          debug: {
            supabaseError: supabaseError?.message,
            localError: localError.message
          }
        });
      }
    } catch (error) {
      console.error("❌ [AUTH] Error fatal en lógica de validación:", error.message);
      return res.status(500).json({
        success: false,
        message: "Error interno en autenticación",
        code: "AUTH_FATAL_ERROR",
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
      
      // Intentar Supabase primero
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        req.user = await normalizeUser(user);
      } else {
        // Intentar Local
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ALLOWED_ALGORITHMS });
          req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
        } catch (e) { /* Silencioso en optional */ }
      }
    }
    next();
  } catch (error) {
    next();
  }
};
