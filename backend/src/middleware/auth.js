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
      // 1. Intentar validar con Supabase (Prioridad: es lo que usa el Frontend)
      const { supabase } = require("../config/supabase");
      console.log(`📡 [AUTH] Validando token con Supabase...`);
      
      const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser(token);

      if (!supabaseError && supabaseUser) {
        console.log(`✅ [AUTH] Usuario validado vía Supabase: ${supabaseUser.email}`);
        
        // Buscar el usuario en nuestra DB local para obtener el rol y otros campos
        const dbUser = await prisma.user.findUnique({ where: { id: supabaseUser.id } });
        
        if (!dbUser) {
          req.user = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            role: supabaseUser.app_metadata?.role || "user",
            isActive: true
          };
        } else {
          req.user = dbUser;
        }
        
        return next();
      }

      // Si llegamos aquí, Supabase falló. Vamos a loguear POR QUÉ.
      console.warn(`⚠️ [AUTH] Supabase no pudo validar el token. Error: ${supabaseError?.message || 'Usuario no encontrado'}`);

      // 2. Si falla Supabase, intentar validación LOCAL
      console.log(`🔍 [AUTH] Intentando validación local como fallback...`);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(`✅ [AUTH] Token decodificado localmente para ID: ${decoded.id}`);

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
        console.error("❌ [AUTH] Error en ambas validaciones (Supabase y Local).");
        
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
      console.error("❌ [AUTH] Error fatal en middleware protect:", error.message);
      return res.status(500).json({
        success: false,
        message: "Error en autenticación",
        code: "AUTH_ERROR",
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
