const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/mailer');

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      isHost: user.isHost,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }   // 24-hour session
  );
}

function toUserResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    profilePicture: user.profilePicture || '',
    isHost: user.isHost,
    role: user.role
  };
}

// @route   POST /auth/signup
// @desc    Register a new user
exports.signup = async (req, res) => {
  try {
    // Defensive check: Ensure req.body exists
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing. Ensure you are sending JSON.' });
    }

    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: 'user'
    });

    await newUser.save();

    const token = createToken(newUser);

    res.status(201).json({ message: 'User registered successfully', token, user: toUserResponse(newUser) });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /auth/login
// @desc    Authenticate user & get token
exports.login = async (req, res) => {
  try {
    // Defensive check: Ensure req.body exists
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing. Ensure you are sending JSON.' });
    }

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user);

    res.status(200).json({ token, user: toUserResponse(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /auth/me
// @desc    Get logged-in user's profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(toUserResponse(user));
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PUT /auth/me
// @desc    Update logged-in user's profile
exports.updateMe = async (req, res) => {
  try {
    const { name, email, phone, profilePicture } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const emailOwner = await User.findOne({ email, _id: { $ne: req.user.userId } });
    if (emailOwner) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, email, phone, profilePicture },
      { returnDocument: 'after', runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(toUserResponse(user));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PUT /auth/password
// @desc    Change logged-in user's password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Current password and a 6+ character new password are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PUT /auth/become-host
// @desc    Upgrade logged-in user to host
exports.becomeHost = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { isHost: true, role: 'host' },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = createToken(user);
    res.status(200).json({
      message: 'You are now a host',
      token,
      user: toUserResponse(user)
    });
  } catch (error) {
    console.error('Become host error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /auth/wishlist
// @desc    Get logged-in user's saved workspaces
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('wishlist');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.wishlist || []);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PUT /auth/wishlist/:workspaceId
// @desc    Save or unsave a workspace
exports.toggleWishlist = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.wishlist = user.wishlist || [];

    const exists = user.wishlist.some((id) => id.toString() === workspaceId);
    user.wishlist = exists
      ? user.wishlist.filter((id) => id.toString() !== workspaceId)
      : [...user.wishlist, workspaceId];

    await user.save();
    await user.populate('wishlist');

    res.status(200).json({ saved: !exists, wishlist: user.wishlist });
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Forgot password — OTP flow
// ─────────────────────────────────────────────────────────────────────────────

// @route   POST /auth/forgot-password
// @desc    Generate 6-digit OTP, store hashed copy, send via email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond 200 to prevent email enumeration attacks
    if (!user) {
      return res.status(200).json({ message: 'If that email exists, an OTP has been sent.' });
    }

    // Generate random 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Store OTP and expiry on the user document
    user.resetOtp = otp;
    user.resetOtpExpiry = expiry;
    await user.save();

    // Send email — do this AFTER saving so the OTP is always persisted first
    await sendOtpEmail(user.email, otp);

    return res.status(200).json({ message: 'OTP sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /auth/verify-otp
// @desc    Validate OTP without consuming it (lets frontend gate the reset step)
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (new Date() > user.resetOtpExpiry) {
      // Clear expired OTP
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    return res.status(200).json({ message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /auth/reset-password
// @desc    Verify OTP one final time, hash and save new password, clear OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (new Date() > user.resetOtpExpiry) {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP so it cannot be reused
    user.resetOtp = null;
    user.resetOtpExpiry = null;

    await user.save();

    return res.status(200).json({ message: 'Password reset successfully. Please log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
