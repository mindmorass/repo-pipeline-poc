const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const NodeCache = require("node-cache");
require("dotenv").config();

const scoresRouter = require("./routes/scores");
const reposRouter = require("./routes/repositories");
const trendsRouter = require("./routes/trends");
const healthRouter = require("./routes/health");

const app = express();
const PORT = process.env.PORT || 3000;

// Cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 });

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json());

// Make cache available to routes
app.set("cache", cache);

// Routes
app.use("/api/health", healthRouter);
app.use("/api/scores", scoresRouter);
app.use("/api/repositories", reposRouter);
app.use("/api/trends", trendsRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Compliance Dashboard API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   GitHub Org: ${process.env.GITHUB_ORG || "not set"}`);
});

module.exports = app;
