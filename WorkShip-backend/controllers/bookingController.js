const Booking = require('../models/Booking');
const Workspace = require('../models/Workspace');

const createBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { workspace, date, hours } = req.body;

    if (!workspace || !date || !hours || hours <= 0) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const workspaceData = await Workspace.findById(workspace);

    if (!workspaceData) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const totalPrice = workspaceData.price * hours;

    const booking = new Booking({
      user: userId,
      workspace,
      date,
      hours,
      totalPrice,
      status: 'pending'
    });

    await booking.save();

    res.status(201).json({
      message: 'Booking created',
      booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookings = await Booking.find({ user: userId }).populate('workspace');
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createBooking,
  getUserBookings
};
