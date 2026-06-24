const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  city: { type: String, required: true, trim: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] } // [longitude, latitude]
  },
  address: { type: String },
  price: { type: Number, required: true },
  amenities: [{ type: String }],
  images: [{ type: String }],
  capacity: { type: Number },
  category: {
    type: String,
    enum: ['private', 'coworking', 'meeting', 'rooftop', 'cafe', 'loft', 'studio']
  },
  rating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Create a geospatial index
workspaceSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('Workspace', workspaceSchema);
