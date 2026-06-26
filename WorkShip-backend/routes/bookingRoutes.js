const express = require('express');
const router = express.Router();
const { createBooking, getUserBookings } = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createBooking);
router.get('/user', authMiddleware, getUserBookings);

module.exports = router;
