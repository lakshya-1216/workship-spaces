const Booking = require('../models/Booking');
const Workspace = require('../models/Workspace');
const Review = require('../models/Review');

// ── POST /bookings ────────────────────────────────────────────────────────────
// Used by the mock payment flow after payment simulation succeeds.
// Also kept as legacy direct-create (no paymentId → status: pending).
const createBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      workspace,
      date,
      hours,
      // Optional payment fields sent by the mock payment flow
      paymentId,
      paymentMethod,
      paymentProvider,
      paymentStatus,
    } = req.body;

    if (!workspace || !date || !hours || hours <= 0) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const workspaceData = await Workspace.findById(workspace);
    if (!workspaceData) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Include 10% service fee in total (matches frontend calculation)
    const subtotal = workspaceData.price * hours;
    const serviceFee = Math.round(subtotal * 0.1);
    const totalPrice = subtotal + serviceFee;

    const booking = new Booking({
      user: userId,
      workspace,
      date,
      hours,
      totalPrice,
      // If a paymentId is supplied the payment already succeeded — mark confirmed
      status: paymentId ? 'confirmed' : 'pending',
      paymentId: paymentId || undefined,
      paymentMethod: paymentMethod || undefined,
      paymentProvider: paymentProvider || 'mock',
    });

    await booking.save();
    await booking.populate('workspace');

    res.status(201).json({ message: 'Booking created', booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid workspace ID' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};


// ── POST /bookings/payment/verify ─────────────────────────────────────────────
// Called after mock (or real) payment success.
// Receives payment result + booking params, creates a CONFIRMED booking.
const verifyPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      // Mock gateway fields (compatible with old Razorpay shape)
      razorpay_payment_id,
      razorpay_order_id,
      // Booking fields
      workspace,
      date,
      hours,
      // Extra payment context
      paymentMethod,
      paymentProvider,
    } = req.body;

    // Basic guard
    if (!razorpay_payment_id || !workspace || !date || !hours || hours <= 0) {
      return res.status(400).json({ message: 'Missing required payment or booking fields' });
    }

    // Fetch workspace to calculate price
    const workspaceData = await Workspace.findById(workspace);
    if (!workspaceData) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const subtotal = workspaceData.price * hours;
    const serviceFee = Math.round(subtotal * 0.1);
    const totalPrice = subtotal + serviceFee;

    // Check for duplicate payment (idempotency)
    const existing = await Booking.findOne({ paymentId: razorpay_payment_id });
    if (existing) {
      return res.status(200).json({
        message: 'Booking already exists',
        booking: existing,
        alreadyConfirmed: true,
      });
    }

    // Create confirmed booking
    const booking = new Booking({
      user: userId,
      workspace,
      date,
      hours,
      totalPrice,
      status: 'confirmed',
      paymentId: razorpay_payment_id,
      paymentMethod: paymentMethod || 'Mock Payment',
      paymentProvider: paymentProvider || 'mock',
    });

    await booking.save();

    // Populate workspace for immediate response
    await booking.populate('workspace');

    res.status(201).json({ message: 'Booking confirmed', booking });
  } catch (error) {
    console.error('Error verifying payment / creating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /bookings/user ────────────────────────────────────────────────────────
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookings = await Booking.find({ user: userId })
      .populate('workspace')
      .sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /bookings/:id ─────────────────────────────────────────────────────────
const getBookingById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const booking = await Booking.findById(req.params.id).populate('workspace');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only the booking owner may view it
    if (booking.user.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    // Attach review if one exists
    const review = await Review.findOne({ booking: booking._id }).lean();
    res.status(200).json({ ...booking.toObject(), review: review || null });
  } catch (error) {
    console.error('Error fetching booking:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── PATCH /bookings/:id/cancel ────────────────────────────────────────────────
const cancelBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.user.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorised' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({ message: 'Booking cancelled', booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── POST /bookings/:id/review ─────────────────────────────────────────────────
const addOrUpdateReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rating, comment, description } = req.body;

    const booking = await Booking.findById(req.params.id).populate('workspace');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    const workspace = booking.workspace;
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    // Upsert review
    let review = await Review.findOne({ booking: booking._id });
    if (review) {
      review.rating = rating;
      review.comment = comment || '';
      review.description = description || '';
      await review.save();
    } else {
      review = new Review({
        booking: booking._id,
        user: userId,
        workspace: workspace._id,
        rating,
        comment: comment || '',
        description: description || '',
      });
      await review.save();
    }

    // Recalculate workspace rating
    const allReviews = await Review.find({ workspace: workspace._id });
    const numReviews = allReviews.length;
    const avgRating =
      numReviews > 0
        ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / numReviews).toFixed(1))
        : 0;

    await Workspace.findByIdAndUpdate(workspace._id, {
      rating: avgRating,
      numReviews,
    });

    res.status(200).json({
      message: 'Review saved',
      booking: { ...booking.toObject(), review },
    });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createBooking,
  verifyPayment,
  getUserBookings,
  getBookingById,
  cancelBooking,
  addOrUpdateReview,
};
