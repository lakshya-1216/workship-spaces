const express = require('express');
const router = express.Router();
const { passport } = require('../config/passport');
const { createToken, toUserResponse } = require('../utils/authTokens');
const {
  signup,
  login,
  getMe,
  updateMe,
  changePassword,
  becomeHost,
  getWishlist,
  toggleWishlist,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

function getFrontendOrigin() {
  return (process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function redirectToOAuthResult(res, params) {
  const url = new URL('/auth/oauth/callback', getFrontendOrigin());
  const hash = new URLSearchParams(params);
  return res.redirect(`${url.toString()}#${hash.toString()}`);
}

router.post('/signup', signup);
router.post('/login', login);
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    return redirectToOAuthResult(res, {
      error: 'google_unavailable',
      message: 'Google sign-in is not configured yet.'
    });
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: true
  })(req, res, next);
});
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false, state: true }, (error, user) => {
    if (error || !user) {
      return redirectToOAuthResult(res, {
        error: 'google_failed',
        message: 'Google sign-in failed. Please try again.'
      });
    }

    const token = createToken(user);
    return redirectToOAuthResult(res, {
      token,
      user: JSON.stringify(toUserResponse(user))
    });
  })(req, res, next);
});
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMe);
router.put('/password', authMiddleware, changePassword);
router.put('/become-host', authMiddleware, becomeHost);
router.get('/wishlist', authMiddleware, getWishlist);
router.put('/wishlist/:workspaceId', authMiddleware, toggleWishlist);

// Forgot password — OTP flow (no auth required)
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
