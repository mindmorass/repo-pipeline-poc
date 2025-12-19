const express = require("express");
const router = express.Router();
const db = require("../database");

/**
 * GET /api/repositories
 * Get all repositories with their latest scores
 */
router.get("/", async (req, res) => {
  try {
    const { sort = "score", order = "desc", filter } = req.query;

    let repos = await db.getLatestRepoScores();

    // Apply filters
    if (filter) {
      switch (filter) {
        case "excellent":
          repos = repos.filter((r) => r.unified_score >= 9);
          break;
        case "good":
          repos = repos.filter(
            (r) => r.unified_score >= 7 && r.unified_score < 9
          );
          break;
        case "fair":
          repos = repos.filter(
            (r) => r.unified_score >= 5 && r.unified_score < 7
          );
          break;
        case "poor":
          repos = repos.filter((r) => r.unified_score < 5);
          break;
        case "violations":
          repos = repos.filter((r) => r.violations_count > 0);
          break;
      }
    }

    // Apply sorting
    if (sort === "name") {
      repos.sort((a, b) => {
        const comparison = a.repo_name.localeCompare(b.repo_name);
        return order === "asc" ? comparison : -comparison;
      });
    } else if (sort === "violations") {
      repos.sort((a, b) => {
        const comparison = a.violations_count - b.violations_count;
        return order === "asc" ? comparison : -comparison;
      });
    }
    // Default is already sorted by score desc

    res.json({
      total: repos.length,
      repositories: repos.map((r) => ({
        name: r.repo_name,
        unified_score: r.unified_score,
        scorecard_score: r.scorecard_score,
        compliance_score: r.compliance_score,
        violations_count: r.violations_count,
        grade: getGrade(r.unified_score),
        status: getStatus(r.unified_score, r.violations_count),
        last_updated: r.scan_date,
      })),
    });
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

/**
 * GET /api/repositories/:name
 * Get detailed information for a specific repository
 */
router.get("/:name", async (req, res) => {
  try {
    const { name } = req.params;

    // Get latest score
    const repos = await db.getLatestRepoScores();
    const repo = repos.find((r) => r.repo_name === name);

    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Get trends
    const trends = await db.getRepoTrends(name, 90); // 90 days

    res.json({
      repository: {
        name: repo.repo_name,
        unified_score: repo.unified_score,
        scorecard_score: repo.scorecard_score,
        compliance_score: repo.compliance_score,
        violations_count: repo.violations_count,
        grade: getGrade(repo.unified_score),
        status: getStatus(repo.unified_score, repo.violations_count),
        last_updated: repo.scan_date,
      },
      trends: trends.map((t) => ({
        date: t.scan_date,
        unified_score: t.unified_score,
        scorecard_score: t.scorecard_score,
        compliance_score: t.compliance_score,
        violations_count: t.violations_count,
      })),
      analysis: analyzeTrends(trends),
    });
  } catch (error) {
    console.error("Error fetching repository details:", error);
    res.status(500).json({ error: "Failed to fetch repository details" });
  }
});

/**
 * GET /api/repositories/:name/history
 * Get historical scores for a repository
 */
router.get("/:name/history", async (req, res) => {
  try {
    const { name } = req.params;
    const { days = 30 } = req.query;

    const history = await db.getRepoTrends(name, parseInt(days));

    if (history.length === 0) {
      return res.status(404).json({ error: "No history found for repository" });
    }

    res.json({
      repository: name,
      period_days: parseInt(days),
      data_points: history.length,
      history: history.map((h) => ({
        date: h.scan_date,
        unified_score: h.unified_score,
        scorecard_score: h.scorecard_score,
        compliance_score: h.compliance_score,
        violations_count: h.violations_count,
      })),
    });
  } catch (error) {
    console.error("Error fetching repository history:", error);
    res.status(500).json({ error: "Failed to fetch repository history" });
  }
});

// Helper functions
function getGrade(score) {
  if (score >= 9) return "A+";
  if (score >= 7) return "B";
  if (score >= 5) return "C";
  if (score >= 3) return "D";
  return "F";
}

function getStatus(score, violations) {
  if (score >= 9 && violations === 0) return "excellent";
  if (score >= 7) return "good";
  if (score >= 5) return "needs_improvement";
  return "critical";
}

function analyzeTrends(trends) {
  if (trends.length < 2) {
    return {
      direction: "stable",
      change: 0,
      message: "Insufficient data for trend analysis",
    };
  }

  const recent = trends.slice(-5); // Last 5 data points
  const scores = recent.map((t) => t.unified_score);

  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const change = lastScore - firstScore;
  const percentChange = ((change / firstScore) * 100).toFixed(1);

  let direction, message;

  if (Math.abs(change) < 0.5) {
    direction = "stable";
    message = `Score has remained stable around ${lastScore.toFixed(1)}`;
  } else if (change > 0) {
    direction = "improving";
    message = `Score improved by ${change.toFixed(
      1
    )} points (${percentChange}%) in recent scans`;
  } else {
    direction = "declining";
    message = `Score declined by ${Math.abs(change).toFixed(
      1
    )} points (${percentChange}%) in recent scans`;
  }

  return {
    direction,
    change: parseFloat(change.toFixed(2)),
    percent_change: parseFloat(percentChange),
    message,
    data_points: trends.length,
  };
}

module.exports = router;
