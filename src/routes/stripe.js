const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.post('/create-checkout-session', protect, async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    customer: req.user.stripeCustomerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.APP_URL}/dashboard.html`,
    cancel_url: `${process.env.APP_URL}/dashboard.html`,
  });
  res.json({ url: session.url });
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  if (event.type === 'checkout.session.completed') {
    await User.update({ stripeSubscriptionStatus: 'active' }, { where: { stripeCustomerId: event.data.object.customer } });
  }
  res.json({ received: true });
});
module.exports = router;
