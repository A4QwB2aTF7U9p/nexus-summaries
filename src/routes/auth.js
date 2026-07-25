const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper para generar y establecer la cookie JWT
const sendTokenCookie = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'super_secret_session_token_key_12345',
    { expiresIn: '30d' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    httpOnly: true, // Protege contra XSS
    secure: process.env.NODE_ENV === 'production', // Solo https en producción
    sameSite: 'strict',
  };

  res.cookie('token', token, cookieOptions);

  // Excluimos la contraseña de la respuesta JSON
  const responseUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    stripeSubscriptionStatus: user.stripeSubscriptionStatus,
    freeCreditsRemaining: user.freeCreditsRemaining,
    totalSummariesDone: user.totalSummariesDone,
  };

  res.status(statusCode).json({
    success: true,
    user: responseUser,
  });
};

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Verificar si el usuario ya existe
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, error: 'El correo electrónico ya está registrado' });
    }

    // Crear usuario
    user = await User.create({
      name,
      email,
      password,
    });

    sendTokenCookie(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Iniciar sesión
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validar campos vacíos
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Por favor, introduce correo y contraseña' });
  }

  try {
    // Buscar usuario por correo
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    // Verificar si la contraseña coincide
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    sendTokenCookie(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Cerrar sesión / Limpiar cookie
// @route   GET /api/auth/logout
// @access  Private
router.get('/logout', protect, (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // expira en 10s
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Sesión cerrada correctamente',
  });
});

// @desc    Obtener datos del usuario actual
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      stripeSubscriptionStatus: req.user.stripeSubscriptionStatus,
      freeCreditsRemaining: req.user.freeCreditsRemaining,
      totalSummariesDone: req.user.totalSummariesDone,
    },
  });
});

module.exports = router;
