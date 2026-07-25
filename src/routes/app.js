const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPremiumOrCredits } = require('../middleware/premium');

router.post('/summarize', protect, checkPremiumOrCredits, async (req, res) => {
  if (req.accessType === 'premium') {
    req.user.totalSummariesDone += 1;
    await req.user.save();
  }
  res.json({ success: true, message: 'Resumen generado' });
});
module.exports = router;
