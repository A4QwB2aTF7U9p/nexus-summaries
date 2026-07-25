const checkPremiumOrCredits = async (req, res, next) => {
  const user = req.user;
  if (user.hasPremiumAccess()) {
    req.accessType = 'premium';
    return next();
  }
  if (user.freeCreditsRemaining > 0) {
    req.accessType = 'free_credits';
    user.freeCreditsRemaining -= 1;
    user.totalSummariesDone += 1;
    await user.save();
    return next();
  }
  return res.status(402).json({ success: false, error: 'Créditos agotados.' });
};
module.exports = { checkPremiumOrCredits };
