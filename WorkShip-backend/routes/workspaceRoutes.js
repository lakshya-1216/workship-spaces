const express = require('express');
const router = express.Router();
const {
  addWorkspace,
  getAllWorkspaces,
  getCities,
  getCityCounts,
  getWorkspaceById,
  deleteWorkspace,
  getRecommendations,
} = require('../controllers/workspaceController');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/authMiddleware');

// Optional auth middleware — attaches req.user if a valid token is present,
// but does NOT reject unauthenticated requests (allows cold-start recommendations).
const optionalAuth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  if (!token || token === 'undefined' || token === 'null') return next();
  try {
    const jwt = require('jsonwebtoken');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_) {
    // invalid token — treat as unauthenticated
  }
  next();
};

// Add a new workspace
router.post('/', authMiddleware, upload.array("images", 8), addWorkspace);

// Get all workspaces
router.get('/', getAllWorkspaces);

// Get distinct cities for autocomplete (must come before /:id route)
router.get('/cities', getCities);

// Top cities ranked by active workspace count (must come before /:id route)
router.get('/city-counts', getCityCounts);

// Personalised recommendations (must come before /:id route)
router.get('/recommendations', optionalAuth, getRecommendations);

// Get single workspace by ID
router.get('/:id', getWorkspaceById);

// Delete a workspace (host only, ownership verified)
router.delete('/:id', authMiddleware, deleteWorkspace);

module.exports = router;
