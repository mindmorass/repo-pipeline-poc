# OpenSSF Scorecard Integration

This document explains how the manager repo integrates OpenSSF Scorecard with custom properties compliance to produce a unified security and governance score.

## Overview

**Problem**: Security posture and governance compliance are often tracked separately, making it hard to get a holistic view of repository health.

**Solution**: Feed custom properties compliance data into OpenSSF Scorecard as a custom check, producing a single unified score that includes both security best practices and governance compliance.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Unified Compliance System                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────┐             │
│  │ 1. Custom Properties Scanner          │             │
│  ├───────────────────────────────────────┤             │
│  │ • Scans all repos for properties      │             │
│  │ • Validates against config.json       │             │
│  │ • Detects violations                  │             │
│  │ • Calculates compliance score (0-10)  │             │
│  └───────────────┬───────────────────────┘             │
│                  │                                      │
│                  ↓                                      │
│        Compliance Score: 7.5/10                        │
│        (142 repos, 23 violations)                      │
│                                                         │
│  ┌───────────────────────────────────────┐             │
│  │ 2. OpenSSF Scorecard                  │             │
│  ├───────────────────────────────────────┤             │
│  │ • Branch Protection: 8/10             │             │
│  │ • Code Review: 9/10                   │             │
│  │ • Signed Releases: 7/10               │             │
│  │ • Vulnerabilities: 10/10              │             │
│  │ • ... (standard checks)               │             │
│  └───────────────┬───────────────────────┘             │
│                  │                                      │
│                  ↓                                      │
│        Scorecard Score: 8.2/10                         │
│                                                         │
│  ┌───────────────────────────────────────┐             │
│  │ 3. Merge Results (SARIF)              │             │
│  ├───────────────────────────────────────┤             │
│  │ • Adds compliance as custom check     │             │
│  │ • Risk level: Critical (weight: 10x)  │             │
│  │ • Recalculates aggregate score        │             │
│  │ • Uploads to Security tab             │             │
│  └───────────────┬───────────────────────┘             │
│                  │                                      │
│                  ↓                                      │
│  ┌───────────────────────────────────────┐             │
│  │ Unified Score: 7.9/10                 │             │
│  │                                        │             │
│  │ ✅ Security (Scorecard): 8.2/10       │             │
│  │ ⚠️  Governance (Properties): 7.5/10   │             │
│  └───────────────────────────────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Unified Compliance Workflow

**File**: `manager_repo/.github/workflows/unified-compliance.yml`

**What it does**:

- Runs custom properties compliance scan across all repos
- Calculates compliance score (0-10) based on violations
- Runs OpenSSF Scorecard on the organization
- Merges compliance results into Scorecard SARIF output
- Recalculates aggregate score with compliance included
- Uploads to GitHub Security tab
- Creates/updates compliance issue

**Schedule**: Weekly on Sunday at midnight (configurable)

**Manual Run**:

```bash
# Run full scan
gh workflow run unified-compliance.yml --repo your-org/manager-repo

# Run with filters
gh workflow run unified-compliance.yml \
  --repo your-org/manager-repo \
  -f repo_filter="customer-.*" \
  -f severity_filter=high \
  -f remediate=true
```

### 2. Compliance Scoring Algorithm

The compliance scanner converts violations into a 0-10 score:

```javascript
Starting Score: 10.0

For each violation:
  - Critical severity: -3.0 points
  - High severity:     -1.5 points
  - Medium severity:   -0.5 points
  - Low severity:      -0.2 points

Minimum Score: 0.0

Bonus (if score >= 8):
  +0.5 points for having 3+ optional properties
  (indicates mature governance)

Examples:
  0 violations                    = 10.0/10 ✅
  1 critical                      = 7.0/10  ⚠️
  2 critical                      = 4.0/10  ❌
  1 critical + 2 high             = 4.0/10  ❌
  3 medium + 2 low                = 8.6/10  ✅
  5 high                          = 2.5/10  ❌
```

**Per-Repository Scores**:
Each repository gets its own score based on its violations. The aggregate score is the average across all repositories.

### 3. Risk Weighting

Custom Properties Compliance is weighted as **Critical** (10x) in the aggregate score calculation, because:

- ✅ Affects all downstream automation (infrastructure provisioning)
- ✅ Can cause billing misalignment
- ✅ Can lead to security misconfiguration
- ✅ Impacts compliance with external regulations
- ✅ Represents organizational governance posture

### 4. SARIF Integration

Results are merged into SARIF format for GitHub Security tab:

```json
{
  "runs": [
    {
      "tool": {
        "driver": {
          "rules": [
            {
              "id": "Branch-Protection",
              "properties": { "score": 8, "risk": "High" }
            },
            {
              "id": "Custom-Properties-Compliance",
              "properties": {
                "score": 7.5,
                "risk": "Critical",
                "tags": ["governance", "compliance"]
              }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "Custom-Properties-Compliance",
          "level": "error",
          "message": {
            "text": "[customer-a-repo] Missing required property: customer_tier"
          }
        }
      ]
    }
  ]
}
```

---

## Usage

### Running the Unified Scan

#### Scheduled (Automatic)

The workflow runs automatically every Sunday at midnight:

```yaml
on:
  schedule:
    - cron: "0 0 * * 0" # Weekly
```

#### Manual (On-Demand)

```bash
# Full scan of all repositories
gh workflow run unified-compliance.yml \
  --repo your-org/manager-repo

# Scan only customer repositories
gh workflow run unified-compliance.yml \
  --repo your-org/manager-repo \
  -f repo_filter="^customer-.*"

# Scan with auto-remediation
gh workflow run unified-compliance.yml \
  --repo your-org/manager-repo \
  -f remediate=true \
  -f severity_filter=high
```

### Viewing Results

#### GitHub Security Tab

1. Go to **Security** → **Code scanning**
2. Look for **unified-compliance** category
3. View all violations with severity levels

#### Compliance Issue

An automated issue is created/updated with:

- Unified score
- Component scores breakdown
- Distribution statistics
- Top violations

Example: `#123 - 📊 Unified Compliance Report`

#### Artifacts

Download detailed results:

```bash
# List recent runs
gh run list --workflow=unified-compliance.yml --limit 5

# Download artifacts from latest run
gh run download <run-id>

# Files:
# - compliance-results.json (detailed violations)
# - compliance-scores.json (per-repo scores)
# - scorecard-results-merged.sarif (full SARIF)
# - compliance-summary.md (readable summary)
```

---

## Score Interpretation

### Aggregate Score Ranges

| Score      | Grade | Meaning   | Action                            |
| ---------- | ----- | --------- | --------------------------------- |
| 9.0 - 10.0 | A+    | Excellent | Maintain current practices        |
| 7.0 - 8.9  | B     | Good      | Minor improvements needed         |
| 5.0 - 6.9  | C     | Fair      | Significant improvements required |
| 3.0 - 4.9  | D     | Poor      | Urgent attention needed           |
| 0.0 - 2.9  | F     | Critical  | Immediate remediation required    |

### Component Score Requirements

For **Enterprise** customers (or repos):

- Scorecard Score: ≥ 8.0
- Compliance Score: ≥ 8.0
- Unified Score: ≥ 8.0

For **Professional** customers:

- Scorecard Score: ≥ 7.0
- Compliance Score: ≥ 7.0
- Unified Score: ≥ 7.0

For **Startup/Free** customers:

- Scorecard Score: ≥ 5.0
- Compliance Score: ≥ 6.0
- Unified Score: ≥ 6.0

### Distribution Targets

Ideal distribution across organization:

- **Excellent (9-10)**: > 50% of repos
- **Good (7-9)**: > 30% of repos
- **Fair (5-7)**: < 15% of repos
- **Poor (0-5)**: < 5% of repos

---

## Common Scenarios

### Scenario 1: Low Compliance Score Dragging Down Overall Score

**Problem**: Scorecard shows 9/10, but compliance is 5/10, resulting in unified score of 7.2/10.

**Diagnosis**:

```bash
# Download and review violations
gh run download --name compliance-results
jq '.violations | group_by(.type) | map({type: .[0].type, count: length})' \
   compliance-results/compliance-results.json
```

**Solution**:

1. Review top violation types
2. Run compliance scan with remediation:
   ```bash
   gh workflow run unified-compliance.yml -f remediate=true
   ```
3. Manually fix remaining violations
4. Re-run scan to verify

### Scenario 2: Need to Improve Specific Check

**Problem**: Want to improve "Custom-Properties-Compliance" score specifically.

**Solution**:

```bash
# Run standalone compliance scan with details
gh workflow run property-compliance.yml \
  --repo your-org/manager-repo \
  -f severity_filter=all

# Review detailed report
gh run view --log | grep "⚠️"

# Focus on high/critical violations first
jq '.violations | map(select(.severity == "critical" or .severity == "high"))' \
   compliance-results.json
```

### Scenario 3: Exclude Certain Repos from Scoring

**Problem**: Archived or experimental repos are lowering the aggregate score.

**Solution**:

Update exclusions in `.github/compliance/config.json`:

```json
{
  "repository_exclusions": [
    ".github",
    "archived-*",
    "template-*",
    "experimental-*",
    "sandbox-*"
  ]
}
```

### Scenario 4: Set Minimum Score for Deployments

**Problem**: Want to block deployments if unified score is too low.

**Solution**:

Add to customer repo workflow:

```yaml
# source_monorepo/.github/workflows/deploy.yml
jobs:
  check-compliance:
    runs-on: ubuntu-latest
    steps:
      - name: Get Latest Unified Score
        uses: actions/github-script@v7
        with:
          script: |
            // Fetch latest unified compliance run
            const { data: runs } = await github.rest.actions.listWorkflowRuns({
              owner: '${{ vars.MANAGER_REPO_OWNER }}',
              repo: '${{ vars.MANAGER_REPO_NAME }}',
              workflow_id: 'unified-compliance.yml',
              status: 'completed',
              per_page: 1
            });

            // Download and check score
            const artifacts = await github.rest.actions.listWorkflowRunArtifacts({
              owner: '${{ vars.MANAGER_REPO_OWNER }}',
              repo: '${{ vars.MANAGER_REPO_NAME }}',
              run_id: runs.workflow_runs[0].id
            });

            // Parse score from summary
            // If score < 7.0, fail this job
            // Blocks deployment
```

---

## Configuration

### Adjusting Score Weights

Edit the scoring function in `unified-compliance.yml`:

```javascript
// Change deduction amounts
const deduction =
  {
    critical: 3.0, // Default: -3.0
    high: 1.5, // Default: -1.5
    medium: 0.5, // Default: -0.5
    low: 0.2, // Default: -0.2
  }[violation.severity] || 0.5;
```

### Changing Check Risk Level

To adjust the weight of Custom Properties Compliance:

```javascript
// In merged SARIF
"properties": {
  "score": complianceScore,
  "risk": "Critical",  // Options: Critical, High, Medium, Low
  // Critical = 10x weight (recommended)
  // High     = 7.5x weight
  // Medium   = 5x weight
  // Low      = 2.5x weight
}
```

### Schedule Changes

```yaml
# Run more frequently
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

# Run daily
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
```

---

## Monitoring & Alerts

### Track Score Trends Over Time

Store scores in custom properties:

```bash
# After each scan, update manager repo property
gh api repos/$ORG/manager-repo/properties/values -X PUT \
  -f properties[][property_name]='last_unified_score' \
  -f properties[][value]='7.9'

# Track history
git log -p manager_repo/scores.json
```

### Set Up Alerts

Add to `.github/compliance/config.json`:

```json
{
  "notification_config": {
    "slack_webhook_url": "https://hooks.slack.com/...",
    "alert_thresholds": {
      "unified_score": 7.0,
      "compliance_score": 6.0
    },
    "alert_on_decline": true
  }
}
```

### Dashboard Integration

Create a dashboard using GitHub API:

```bash
# Fetch latest scores
curl -H "Authorization: token $TOKEN" \
  https://api.github.com/repos/$ORG/manager-repo/actions/runs?workflow_id=unified-compliance.yml&per_page=10

# Parse scores from artifacts
# Display in Grafana, Datadog, etc.
```

---

## Best Practices

### 1. Run Regularly

```yaml
# Weekly is minimum
# Daily recommended for active orgs
schedule:
  - cron: "0 0 * * *"
```

### 2. Fix Critical First

```bash
# Filter to critical violations
jq '.violations | map(select(.severity == "critical"))' \
   compliance-results.json | less
```

### 3. Set Score Targets by Tier

```json
{
  "score_targets": {
    "enterprise": { "min_score": 8.0 },
    "professional": { "min_score": 7.0 },
    "startup": { "min_score": 6.0 }
  }
}
```

### 4. Track Improvement Over Time

```bash
# Compare scores week over week
echo "Week,Unified,Scorecard,Compliance" > scores.csv
# Append each week's results
# Plot trends
```

### 5. Celebrate Improvements

When repos improve their scores:

- Post in Slack/Teams
- Recognize teams in meetings
- Share best practices

---

## Troubleshooting

### Issue: Workflow Fails with Auth Error

**Cause**: Missing or expired `SOURCE_REPOS_PAT`

**Fix**:

```bash
# Verify PAT has correct permissions
# - repo (full)
# - read:org
# - workflow

# Update secret
gh secret set SOURCE_REPOS_PAT --repo your-org/manager-repo
```

### Issue: Scorecard Score is 0

**Cause**: Scorecard couldn't analyze the repo

**Fix**:

1. Check if repo is public (Scorecard works best with public repos)
2. For private repos, ensure PAT has correct permissions
3. Check Scorecard logs for specific errors

### Issue: Scores Don't Match Expectations

**Cause**: Cached or stale data

**Fix**:

```bash
# Re-run with fresh scan
gh workflow run unified-compliance.yml \
  --repo your-org/manager-repo

# Clear any caches
gh cache delete --all
```

### Issue: SARIF Upload Fails

**Cause**: SARIF file too large (> 10MB) or malformed

**Fix**:

```bash
# Validate SARIF
npm install -g @microsoft/sarif-multitool
sarif-multitool validate scorecard-results-merged.sarif

# Reduce size by limiting violations in SARIF
# (see workflow line: compliance.violations.slice(0, 50))
```

---

## Integration with Existing Workflows

### Blocking Deployments on Low Score

```yaml
# source_monorepo/.github/workflows/deploy.yml
jobs:
  compliance-gate:
    runs-on: ubuntu-latest
    steps:
      - name: Check Unified Score
        run: |
          SCORE=$(gh api repos/$ORG/manager-repo/actions/artifacts \
            | jq '... extract latest score ...')

          if (( $(echo "$SCORE < 7.0" | bc -l) )); then
            echo "❌ Unified score $SCORE below 7.0"
            exit 1
          fi

  deploy:
    needs: compliance-gate
    # ... deployment steps
```

### Badge in README

Add to customer repo README:

```markdown
[![Compliance Score](https://img.shields.io/badge/compliance-7.9%2F10-green)](https://github.com/your-org/manager-repo/security/code-scanning)
```

(Requires setting up badge endpoint or using GitHub API)

---

## Related Documentation

- [CUSTOM-PROPERTIES.md](CUSTOM-PROPERTIES.md) - Custom properties schema
- [COMPLIANCE.md](COMPLIANCE.md) - Compliance scanner details
- [OpenSSF Scorecard](https://github.com/ossf/scorecard) - Official docs
- [SARIF Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)

---

## FAQ

### Q: Does this replace the standalone compliance scanner?

**A**: No, both workflows can run. Unified compliance is recommended for holistic scoring, but the standalone scanner is useful for compliance-only checks.

### Q: Can I customize which Scorecard checks to include?

**A**: Yes, configure Scorecard via `.github/.osv-scanner.toml` or pass options to the action. See [Scorecard configuration](https://github.com/ossf/scorecard#configuration).

### Q: How often should this run?

**A**: Weekly minimum, daily recommended for active organizations.

### Q: Does this work for private repositories?

**A**: Yes, but ensure `SOURCE_REPOS_PAT` has correct permissions. Some Scorecard checks have limitations on private repos.

### Q: Can I weight compliance higher than other checks?

**A**: Yes, set `"risk": "Critical"` (10x weight). This is already the default.

---

## Support

For issues with:

- **Scorecard integration**: Review this doc and workflow logs
- **Compliance logic**: See [COMPLIANCE.md](COMPLIANCE.md)
- **Custom properties**: See [CUSTOM-PROPERTIES.md](CUSTOM-PROPERTIES.md)
- **Scoring algorithm**: Check workflow artifacts

Contact: `#infrastructure-compliance` on Slack
