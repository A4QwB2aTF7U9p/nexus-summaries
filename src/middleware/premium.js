/**
 * Middleware para controlar qué usuarios tienen acceso a las funciones premium del SaaS
 */
const checkPremiumOrCredits = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Usuario no autenticado.' });
  }

  // Caso 1: El usuario tiene una suscripción de Stripe activa o trialing
  if (user.hasPremiumAccess()) {
    req.accessType = 'premium';
    return next();
  }

  // Caso 2: El usuario no tiene suscripción activa, pero aún tiene créditos gratuitos de prueba
  if (user.freeCreditsRemaining > 0) {
    req.accessType = 'free_credits';
    
    // Decrementar crédito de prueba y guardar
    user.freeCreditsRemaining -= 1;
    user.totalSummariesDone += 1;
    await user.save();
    
    return next();
  }

  // Caso 3: El usuario no tiene suscripción activa ni créditos. Bloqueado.
  return res.status(402).json({
    success: false,
    requireSubscription: true,
    error: 'Has agotado tus créditos de prueba gratuitos. Suscríbete para obtener acceso ilimitado sin publicidad.',
  });
};

module.exports = { checkPremiumOrCredits };
