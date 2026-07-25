const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.token) token = req.cookies.token;
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) token = req.headers.authorization.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, error: 'No autorizado.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret');
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ success: false, error: 'Usuario no encontrado.' });
    req.user = user;
    next();
  } catch (error) { return res.status(401).json({ success: false, error: 'Token inválido.' }); }
};

module.exports = { protect };
