const express = require("express");
const router = express.Router();
const db = require("../database");

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  };

  try {
    // Check database
    await db.getLatestOrgScore();
    health.database = "connected";
  } catch (error) {
    health.database = "error";
    health.status = "degraded";
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
