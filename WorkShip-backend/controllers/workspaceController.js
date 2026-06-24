const Workspace = require("../models/Workspace");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

const CATEGORY_ALIASES = {
  private: "private",
  "private office": "private",
  "private offices": "private",
  coworking: "coworking",
  meeting: "meeting",
  "meeting room": "meeting",
  "meeting rooms": "meeting",
  rooftop: "rooftop",
  rooftops: "rooftop",
  cafe: "cafe",
  "cafe-style": "cafe",
  "café-style": "cafe",
  loft: "loft",
  lofts: "loft",
  studio: "studio",
  studios: "studio",
};

function parseBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function normalizeCategory(category) {
  if (!category) return undefined;
  return CATEGORY_ALIASES[String(category).trim().toLowerCase()];
}

// @route   POST /workspaces
// @desc    Add a new workspace
exports.addWorkspace = async (req, res) => {
  console.log("REQ BODY:", req.body);
  console.log("REQ FILES:", req.files);

  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is missing." });
    }

    if (!req.user?.isHost) {
      return res.status(403).json({ message: "Only hosts can create listings" });
    }

    const {
      title,
      description,
      city,
      address,
      price,
      capacity,
      category,
      amenities,
      available,
      latitude,
      longitude,
    } = req.body;

    if (!title || !description || !price || !city || !address || !category) {
      return res
        .status(400)
        .json({ message: "Title, description, city, address, price, and category are required" });
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }

    const parsedCapacity = capacity ? Number(capacity) : undefined;
    if (parsedCapacity !== undefined && (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0)) {
      return res.status(400).json({ message: "Capacity must be a positive number" });
    }

    // Handle amenities from form-data
    const amenitiesArray = amenities
      ? amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    // Extract image URLs
    const imageUrls =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.path)
        : [];

    if (imageUrls.length === 0) {
      return res.status(400).json({ message: "At least one workspace image is required" });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      return res.status(400).json({ message: "Valid location coordinates are required" });
    }

    const location = { type: "Point", coordinates: [parsedLongitude, parsedLatitude] };

    const normalizedCategory = normalizeCategory(category);

    if (category && !normalizedCategory) {
      return res.status(400).json({ message: "Invalid workspace category" });
    }

    const newWorkspace = new Workspace({
      title,
      description,
      city,
      location,
      address,
      price: parsedPrice,
      capacity: parsedCapacity,
      category: normalizedCategory,
      amenities: amenitiesArray,
      images: imageUrls,
      available: parseBoolean(available),
      host: req.user ? req.user.userId : undefined,
    });

    const savedWorkspace = await newWorkspace.save();
    res.status(201).json(savedWorkspace);
  } catch (error) {
    console.error("CONTROLLER ERROR:", error);
    res.status(500).json({
      message: error.message,
      error: error,
    });
  }
};

// @route   GET /workspaces
// @desc    Get all workspaces (with filtering support)
exports.getAllWorkspaces = async (req, res) => {
  try {
    const { location, minPrice, maxPrice, amenities, category } = req.query;

    const filter = {};

    // LOCATION FILTER: match against city
    if (location) {
      filter.city = { $regex: location, $options: "i" };
    }

    // PRICE FILTER
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        if (isNaN(Number(minPrice))) {
          return res
            .status(400)
            .json({ message: "minPrice must be a valid number" });
        }
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        if (isNaN(Number(maxPrice))) {
          return res
            .status(400)
            .json({ message: "maxPrice must be a valid number" });
        }
        filter.price.$lte = Number(maxPrice);
      }
    }

    // AMENITIES FILTER
    if (amenities) {
      const amenitiesArray = amenities.split(",").map((item) => item.trim());
      filter.amenities = { $all: amenitiesArray };
    }

    // CATEGORY FILTER
    if (category) {
      const normalizedCategory = normalizeCategory(category);
      if (!normalizedCategory) {
        return res.status(400).json({ message: "Invalid workspace category" });
      }
      filter.category = normalizedCategory;
    }

    // We can use populate to optionally fetch the host details (name, email)
    const workspaces = await Workspace.find(filter).populate(
      "host",
      "name email",
    );
    res.status(200).json(workspaces);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   GET /workspaces/cities
// @desc    Get all distinct cities for autocomplete suggestions
exports.getCities = async (req, res) => {
  try {
    const cities = await Workspace.distinct("city");
    // Filter out empty/null cities and sort alphabetically
    const filteredCities = cities
      .filter((city) => city && String(city).trim().length > 0)
      .map((city) => String(city).trim())
      .sort();
    res.status(200).json(filteredCities);
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   GET /workspaces/city-counts
// @desc    Get top cities ranked by number of active workspaces
//          Query params:
//            limit - max cities to return (default 6, max 20)
exports.getCityCounts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);

    const results = await Workspace.aggregate([
      // Only count active/available workspaces
      { $match: { available: true, city: { $exists: true, $ne: null, $ne: "" } } },
      // Normalise city name (trim whitespace) before grouping
      {
        $group: {
          _id: { $trim: { input: "$city" } },
          count: { $sum: 1 },
        },
      },
      // Remove any blank city values that slipped through
      { $match: { _id: { $ne: "" } } },
      // Sort by workspace count descending
      { $sort: { count: -1 } },
      { $limit: limit },
      // Rename _id → city for a cleaner API shape
      { $project: { _id: 0, city: "$_id", count: 1 } },
    ]);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching city counts:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// @route   GET /workspaces/:id
// @desc    Get single workspace by ID
exports.getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id).populate(
      "host",
      "name email profilePicture",
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const reviews = await Review.find({ workspace: workspace._id })
      .populate("user", "name profilePicture")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      ...workspace.toObject(),
      reviews,
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   DELETE /workspaces/:id
// @desc    Delete a workspace (host only, ownership verified)
exports.deleteWorkspace = async (req, res) => {
  try {
    if (!req.user?.isHost) {
      return res.status(403).json({ message: "Only hosts can delete listings" });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Ownership check — workspace.host is an ObjectId, req.user.userId is a string
    if (workspace.host?.toString() !== req.user.userId?.toString()) {
      return res.status(403).json({ message: "Forbidden: you do not own this listing" });
    }

    // Delete Cloudinary images in parallel (best-effort; don't fail the delete if cleanup errors)
    if (Array.isArray(workspace.images) && workspace.images.length > 0) {
      const deletions = workspace.images.map((url) => {
        try {
          // Cloudinary URL structure: .../upload/v<version>/<folder>/<public_id>.<ext>
          const parts = url.split("/");
          const fileWithExt = parts[parts.length - 1];
          const folder = parts[parts.length - 2];
          const publicId = `${folder}/${fileWithExt.replace(/\.[^.]+$/, "")}`;
          return cloudinary.uploader.destroy(publicId);
        } catch (_) {
          return Promise.resolve();
        }
      });
      await Promise.allSettled(deletions);
    }

    await Workspace.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Content-based recommendation engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a frequency map from an array of strings.
 * e.g. ['wifi', 'wifi', 'parking'] → { wifi: 2, parking: 1 }
 */
function buildFrequencyMap(items) {
  return items.reduce((acc, item) => {
    if (item) acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Computes a preference score for a candidate workspace against
 * the user preference profile.
 *
 * Scoring weights:
 *   - Category match   : 3 points per match (strongest signal)
 *   - Amenity match    : 1 point per overlap amenity
 *   - Rating bonus     : up to 2 points (rating / 5 * 2)
 */
function scoreWorkspace(workspace, profile) {
  let score = 0;

  // Category overlap (weighted by how often category was seen in history)
  if (workspace.category && profile.categories[workspace.category]) {
    score += 3 * profile.categories[workspace.category];
  }

  // Amenity overlap
  if (Array.isArray(workspace.amenities)) {
    for (const amenity of workspace.amenities) {
      const normalised = amenity.trim().toLowerCase();
      if (profile.amenities[normalised]) {
        score += 1 * profile.amenities[normalised];
      }
    }
  }

  // Rating bonus (0–2 points)
  if (workspace.rating) {
    score += (workspace.rating / 5) * 2;
  }

  return score;
}

// @route   GET /workspaces/recommendations
// @desc    Return personalised workspace recommendations
//          Query params:
//            recentIds  - comma-separated workspace IDs from client localStorage
//            limit      - max results (default 4)
exports.getRecommendations = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 4, 12);
    const recentIds = req.query.recentIds
      ? req.query.recentIds.split(",").filter(Boolean)
      : [];

    // ── 1. Gather user history ─────────────────────────────────────────────
    const userId = req.user?.userId;

    let wishlistWorkspaces = [];
    let bookedWorkspaceIds = new Set();
    let bookedWorkspaces = [];

    if (userId) {
      // Wishlist (full workspace documents)
      const user = await User.findById(userId).populate("wishlist");
      wishlistWorkspaces = (user?.wishlist || []).filter(Boolean);

      // Bookings (non-cancelled, workspace populated)
      const bookings = await Booking.find({ user: userId, status: { $ne: "cancelled" } })
        .populate("workspace")
        .sort({ createdAt: -1 })
        .limit(20);

      for (const b of bookings) {
        if (b.workspace?._id) {
          bookedWorkspaceIds.add(b.workspace._id.toString());
          bookedWorkspaces.push(b.workspace);
        }
      }
    }

    // Recently viewed (from client localStorage, IDs only — fetch docs)
    let recentWorkspaces = [];
    if (recentIds.length > 0) {
      recentWorkspaces = await Workspace.find({ _id: { $in: recentIds } });
    }

    // ── 2. Build preference profile ────────────────────────────────────────
    // Weight: wishlist × 2, booked × 3, recently viewed × 1
    const allCategories = [
      ...wishlistWorkspaces.flatMap((w) => (w.category ? Array(2).fill(w.category) : [])),
      ...bookedWorkspaces.flatMap((w) => (w.category ? Array(3).fill(w.category) : [])),
      ...recentWorkspaces.map((w) => w.category).filter(Boolean),
    ];

    const allAmenities = [
      ...wishlistWorkspaces.flatMap((w) =>
        (w.amenities || []).flatMap((a) => Array(2).fill(a.trim().toLowerCase()))
      ),
      ...bookedWorkspaces.flatMap((w) =>
        (w.amenities || []).flatMap((a) => Array(3).fill(a.trim().toLowerCase()))
      ),
      ...recentWorkspaces.flatMap((w) =>
        (w.amenities || []).map((a) => a.trim().toLowerCase())
      ),
    ];

    const hasHistory = allCategories.length > 0 || allAmenities.length > 0;

    const profile = {
      categories: buildFrequencyMap(allCategories),
      amenities: buildFrequencyMap(allAmenities),
    };

    // ── 3. Fetch all available workspaces ──────────────────────────────────
    const allWorkspaces = await Workspace.find({ available: true });

    // ── 4. Exclude already-booked workspaces ───────────────────────────────
    const candidates = allWorkspaces.filter(
      (ws) => !bookedWorkspaceIds.has(ws._id.toString())
    );

    // ── 5. Score & sort ────────────────────────────────────────────────────
    let recommendations;

    if (hasHistory) {
      // Personalised path: sort by computed score descending
      recommendations = candidates
        .map((ws) => ({ ws, score: scoreWorkspace(ws, profile) }))
        .sort((a, b) => b.score - a.score)
        .map(({ ws }) => ws);
    } else {
      // Cold-start fallback: sort by rating then numReviews descending
      recommendations = candidates
        .slice()
        .sort((a, b) => {
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          return (b.numReviews || 0) - (a.numReviews || 0);
        });
    }

    res.status(200).json({
      personalised: hasHistory,
      recommendations: recommendations.slice(0, limit),
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ message: "Server error" });
  }
};
