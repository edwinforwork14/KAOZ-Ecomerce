const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err);

  // Prisma duplicate key
  if (err.code === "P2002") {
    const message = "Valor duplicado ingresado";
    error = { message, statusCode: 400 };
  }

  // Prisma record not found
  if (err.code === "P2025") {
    const message = "Recurso no encontrado";
    error = { message, statusCode: 404 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Error del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
