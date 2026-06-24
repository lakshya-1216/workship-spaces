const express = require("express");
const { getHostStats } = require("../controllers/hostController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/stats", authMiddleware, getHostStats);

module.exports = router;
