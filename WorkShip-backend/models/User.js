const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  profilePicture: { type: String },
  role: { type: String, enum: ["user", "host"], default: "user" },
  isHost: { type: Boolean, default: false },
  wishlist: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }],
    default: []
  },
  // Forgot-password OTP fields
  resetOtp: { type: String, default: null },
  resetOtpExpiry: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
