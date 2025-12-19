const express = require("express");
const router = express.Router();
const db = require("../database");

// Initialize database
db.init().catch((err) => console.error("Database initialization failed:", err));

/**
 * GET /api/scores/organization
 * Get the latest organization-wide score
 */
router.get("/organization", async (req, res) => {
  try {
    const cache = req.app.get("cache");
    const cacheKey = "org_score";

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const orgScore = await db.getLatestOrgScore();

    if (!orgScore) {
      return res.status(404).json({
        error: "No organization score found",
        message: "Run unified-compliance workflow first",
      });
    }

    const response = {
      unified_score: orgScore.unified_score,
      scorecard_score: orgScore.scorecard_score,
      compliance_score: orgScore.compliance_score,
      total_repos: orgScore.total_repos,
      compliant_repos: orgScore.compliant_repos,
      compliance_percentage: Math.round(
        (orgScore.compliant_repos / orgScore.total_repos) * 100
      ),
      distribution: {
        excellent: orgScore.distribution_excellent,
        good: orgScore.distribution_good,
        fair: orgScore.distribution_fair,
        poor: orgScore.distribution_poor,
      },
      grade: getGrade(orgScore.unified_score),
      last_updated: orgScore.scan_date,
    };

    // Cache for 5 minutes
    cache.set(cacheKey, response);

    res.json(response);
  } catch (error) {
    console.error("Error fetching organization score:", error);
    res.status(500).json({ error: "Failed to fetch organization score" });
  }
});

/**
 * GET /api/scores/summary
 * Get summary statistics
 */
router.get("/summary", async (req, res) => {
  try {
    const cache = req.app.get("cache");
    const cacheKey = "scores_summary";

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const repos = await db.getLatestRepoScores();
    const orgScore = await db.getLatestOrgScore();

    if (repos.length === 0) {
      return res.status(404).json({
        error: "No scores found",
        message: "Run unified-compliance workflow first",
      });
    }

    // Calculate statistics
    const scores = repos.map((r) => r.unified_score);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore =
      sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] +
            sortedScores[sortedScores.length / 2]) /
          2
        : sortedScores[Math.floor(sortedScores.length / 2)];

    // Top and bottom performers
    const topPerformers = repos.slice(0, 5);
    const bottomPerformers = repos.slice(-5).reverse();

    // Distribution
    const excellent = repos.filter((r) => r.unified_score >= 9).length;
    const good = repos.filter(
      (r) => r.unified_score >= 7 && r.unified_score < 9
    ).length;
    const fair = repos.filter(
      (r) => r.unified_score >= 5 && r.unified_score < 7
    ).length;
    const poor = repos.filter((r) => r.unified_score < 5).length;

    const summary = {
      overview: {
        total_repositories: repos.length,
        average_score: parseFloat(avgScore.toFixed(2)),
        median_score: parseFloat(medianScore.toFixed(2)),
        highest_score: parseFloat(maxScore.toFixed(2)),
        lowest_score: parseFloat(minScore.toFixed(2)),
        organization_score: orgScore ? orgScore.unified_score : avgScore,
      },
      distribution: {
        excellent: {
          count: excellent,
          percentage: Math.round((excellent / repos.length) * 100),
        },
        good: {
          count: good,
          percentage: Math.round((good / repos.length) * 100),
        },
        fair: {
          count: fair,
          percentage: Math.round((fair / repos.length) * 100),
        },
        poor: {
          count: poor,
          percentage: Math.round((poor / repos.length) * 100),
        },
      },
      top_performers: topPerformers.map((r) => ({
        name: r.repo_name,
        score: r.unified_score,
        grade: getGrade(r.unified_score),
      })),
      bottom_performers: bottomPerformers.map((r) => ({
        name: r.repo_name,
        score: r.unified_score,
        grade: getGrade(r.unified_score),
      })),
      compliance: {
        total_violations: repos.reduce((sum, r) => sum + r.violations_count, 0),
        repos_with_violations: repos.filter((r) => r.violations_count > 0)
          .length,
        fully_compliant: repos.filter((r) => r.violations_count === 0).length,
      },
      last_updated: repos[0]?.scan_date,
    };

    cache.set(cacheKey, summary);

    res.json(summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

/**
 * GET /api/scores/below-threshold
 * Get repositories with scores below a threshold
 */
router.get("/below-threshold", async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 7.0;

    const repos = await db.getBelowThreshold(threshold);

    res.json({
      threshold,
      count: repos.length,
      repositories: repos.map((r) => ({
        name: r.repo_name,
        unified_score: r.unified_score,
        compliance_score: r.compliance_score,
        scorecard_score: r.scorecard_score,
        violations_count: r.violations_count,
        grade: getGrade(r.unified_score),
        last_updated: r.scan_date,
      })),
    });
  } catch (error) {
    console.error("Error fetching repos below threshold:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

// Helper function to determine grade
function getGrade(score) {
  if (score >= 9) return "A+";
  if (score >= 7) return "B";
  if (score >= 5) return "C";
  if (score >= 3) return "D";
  return "F";
}

module.exports = router;
