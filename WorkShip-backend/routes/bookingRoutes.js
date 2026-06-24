const express = require('express');
const router = express.Router();
const {
  createBooking,
  verifyPayment,
  getUserBookings,
  getBookingById,
  cancelBooking,
  addOrUpdateReview,
} = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

// ── Payment verify / booking create (called after mock payment success) ────────
router.post('/payment/verify', authMiddleware, verifyPayment);

// ── User bookings list ────────────────────────────────────────────────────────
router.get('/user', authMiddleware, getUserBookings);

// ── Individual booking ────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, getBookingById);
router.patch('/:id/cancel', authMiddleware, cancelBooking);
router.post('/:id/review', authMiddleware, addOrUpdateReview);

// ── Legacy direct create ──────────────────────────────────────────────────────
router.post('/', authMiddleware, createBooking);

module.exports = router;
