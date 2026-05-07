const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../config/database");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "El usuario ya existe",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al registrar usuario",
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Por favor proporciona email y contraseña",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Usuario inactivo",
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al iniciar sesión",
      error: error.message,
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    // No queremos devolver el password
    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener usuario",
      error: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName, phone, address },
    });

    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Perfil actualizado exitosamente",
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar perfil",
      error: error.message,
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Contraseña actual incorrecta",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword },
    });

    res.json({
      success: true,
      message: "Contraseña actualizada exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar contraseña",
      error: error.message,
    });
  }
};
