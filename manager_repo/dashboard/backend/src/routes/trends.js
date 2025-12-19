const express = require("express");
const router = express.Router();
const db = require("../database");

/**
 * GET /api/trends/organization
 * Get organization-wide score trends
 */
router.get("/organization", async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const trends = await db.getOrgTrends(parseInt(days));

    if (trends.length === 0) {
      return res.status(404).json({
        error: "No trend data found",
        message:
          "Run unified-compliance workflow multiple times to build trend data",
      });
    }

    res.json({
      period_days: parseInt(days),
      data_points: trends.length,
      trends: trends.map((t) => ({
        date: t.scan_date,
        unified_score: t.unified_score,
        scorecard_score: t.scorecard_score,
        compliance_score: t.compliance_score,
        total_repos: t.total_repos,
        compliant_repos: t.compliant_repos,
        compliance_percentage: Math.round(
          (t.compliant_repos / t.total_repos) * 100
        ),
        distribution: {
          excellent: t.distribution_excellent,
          good: t.distribution_good,
          fair: t.distribution_fair,
          poor: t.distribution_poor,
        },
      })),
      analysis: analyzeOrgTrends(trends),
    });
  } catch (error) {
    console.error("Error fetching organization trends:", error);
    res.status(500).json({ error: "Failed to fetch organization trends" });
  }
});

/**
 * GET /api/trends/distribution
 * Get distribution trends over time
 */
router.get("/distribution", async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const trends = await db.getOrgTrends(parseInt(days));

    if (trends.length === 0) {
      return res.status(404).json({ error: "No distribution data found" });
    }

    res.json({
      period_days: parseInt(days),
      data_points: trends.length,
      distribution_trends: trends.map((t) => ({
        date: t.scan_date,
        excellent: t.distribution_excellent,
        good: t.distribution_good,
        fair: t.distribution_fair,
        poor: t.distribution_poor,
        total_repos: t.total_repos,
      })),
    });
  } catch (error) {
    console.error("Error fetching distribution trends:", error);
    res.status(500).json({ error: "Failed to fetch distribution trends" });
  }
});

/**
 * GET /api/trends/comparison
 * Compare current scores with historical baseline
 */
router.get("/comparison", async (req, res) => {
  try {
    const trends = await db.getOrgTrends(90); // 90 days

    if (trends.length < 2) {
      return res.status(404).json({
        error: "Insufficient data for comparison",
        message: "Need at least 2 scans to compare",
      });
    }

    const latest = trends[trends.length - 1];
    const baseline = trends[0];
    const midpoint = trends[Math.floor(trends.length / 2)];

    const comparison = {
      latest: {
        date: latest.scan_date,
        unified_score: latest.unified_score,
        compliance_score: latest.compliance_score,
        scorecard_score: latest.scorecard_score,
      },
      baseline: {
        date: baseline.scan_date,
        unified_score: baseline.unified_score,
        compliance_score: baseline.compliance_score,
        scorecard_score: baseline.scorecard_score,
      },
      changes: {
        unified_score_change: parseFloat(
          (latest.unified_score - baseline.unified_score).toFixed(2)
        ),
        compliance_score_change: parseFloat(
          (latest.compliance_score - baseline.compliance_score).toFixed(2)
        ),
        scorecard_score_change: parseFloat(
          (latest.scorecard_score - baseline.scorecard_score).toFixed(2)
        ),
        repos_change: latest.total_repos - baseline.total_repos,
        compliant_repos_change:
          latest.compliant_repos - baseline.compliant_repos,
      },
      midpoint: {
        date: midpoint.scan_date,
        unified_score: midpoint.unified_score,
      },
      summary: {
        overall_trend: getOverallTrend(
          baseline.unified_score,
          latest.unified_score
        ),
        days_analyzed: parseInt(req.query.days) || 90,
        total_scans: trends.length,
      },
    };

    res.json(comparison);
  } catch (error) {
    console.error("Error generating comparison:", error);
    res.status(500).json({ error: "Failed to generate comparison" });
  }
});

// Helper function to analyze organization trends
function analyzeOrgTrends(trends) {
  if (trends.length < 2) {
    return {
      direction: "insufficient_data",
      message: "Need more scans to analyze trends",
    };
  }

  const recent = trends.slice(-5);
  const scores = recent.map((t) => t.unified_score);

  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const change = lastScore - firstScore;
  const percentChange = ((change / firstScore) * 100).toFixed(1);

  // Calculate velocity (rate of change)
  const daysBetween = Math.max(1, recent.length - 1);
  const velocity = (change / daysBetween).toFixed(3);

  // Analyze distribution shift
  const firstDist = recent[0];
  const lastDist = recent[recent.length - 1];
  const excellentChange =
    lastDist.distribution_excellent - firstDist.distribution_excellent;
  const poorChange = lastDist.distribution_poor - firstDist.distribution_poor;

  let direction, message, recommendation;

  if (Math.abs(change) < 0.3) {
    direction = "stable";
    message = `Organization score is stable around ${lastScore.toFixed(1)}`;
    recommendation = "Continue current practices and monitor for changes";
  } else if (change > 0) {
    direction = "improving";
    message = `Organization score improved by ${change.toFixed(
      1
    )} points (${percentChange}%)`;
    recommendation =
      excellentChange > 0
        ? "Excellent progress! More repos reaching excellent scores"
        : "Good improvement, focus on getting more repos to excellent (9+)";
  } else {
    direction = "declining";
    message = `Organization score declined by ${Math.abs(change).toFixed(
      1
    )} points (${percentChange}%)`;
    recommendation =
      poorChange > 0
        ? "URGENT: More repos falling into poor category. Review and remediate"
        : "Address declining scores with targeted compliance improvements";
  }

  return {
    direction,
    change: parseFloat(change.toFixed(2)),
    percent_change: parseFloat(percentChange),
    velocity: parseFloat(velocity),
    message,
    recommendation,
    distribution_shift: {
      excellent_change: excellentChange,
      poor_change: poorChange,
      improving_repos: excellentChange - poorChange,
    },
    data_points: trends.length,
  };
}

function getOverallTrend(baselineScore, latestScore) {
  const change = latestScore - baselineScore;

  if (Math.abs(change) < 0.5) return "stable";
  if (change > 1.0) return "significantly_improving";
  if (change > 0) return "improving";
  if (change < -1.0) return "significantly_declining";
  return "declining";
}

module.exports = router;
