const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const sendTokenCookie = (user, statusCode, res) => {
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'super_secret', { expiresIn: '30d' });
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  res.status(statusCode).json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
};

router.post('/register', async (req, res) => {
  try {
    const user = await User.create(req.body);
    sendTokenCookie(user, 201, res);
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    
    const isMatch = await user.comparePassword(password);
    console.log(`Login attempt for ${email}: match=${isMatch}`);
    
    if (!isMatch) return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    sendTokenCookie(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
});

router.get('/me', protect, (req, res) => { res.status(200).json({ success: true, user: req.user }); });

module.exports = router;
