const express = require('express');
const router = express.Router();
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

router.post('/signup', signup);
router.post('/login', login);
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

