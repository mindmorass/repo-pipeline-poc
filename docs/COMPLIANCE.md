# Custom Properties Compliance & Drift Detection

This document explains how to maintain compliance and detect drift in GitHub Custom Properties across your organization.

## Overview

**Problem**: Custom properties can drift from their source of truth:
- Teams get renamed
- Customer tiers change (billing updates)
- Repositories transfer between teams
- Manual property changes
- New compliance requirements

**Solution**: Automated compliance scanning + external sync tools

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Sources of Truth                               │
│  ├─ GitHub Teams (actual team membership)       │
│  ├─ Billing System (customer tiers)             │
│  ├─ CMDB (contacts, accounts)                   │
│  └─ LDAP/AD (team ownership)                    │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Sync Tools (manager_repo/tools/)               │
│  ├─ sync-properties.js (external sync)          │
│  └─ Runs on schedule or webhook                 │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  GitHub Custom Properties (Actual State)        │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Compliance Scanner (.github/workflows/)        │
│  ├─ Runs every 6 hours                          │
│  ├─ Detects drift                               │
│  ├─ Auto-remediates (optional)                  │
│  └─ Creates compliance issues                   │
└─────────────────────────────────────────────────┘
```

---

## Components

### 1. Compliance Scanner (GitHub Actions)

**File**: `manager_repo/.github/workflows/property-compliance.yml`

**What it does**:
- Scans all repositories in organization
- Validates custom properties against rules
- Detects drift and violations
- Auto-remediates low-risk issues (optional)
- Creates/updates compliance issues
- Fails on critical violations

**Schedule**: Every 6 hours (configurable)

**Manual Run**:
```bash
# Standard scan
gh workflow run property-compliance.yml --repo your-org/manager-repo

# Scan with auto-remediation
gh workflow run property-compliance.yml \
  --repo your-org/manager-repo \
  -f remediate=true

# Scan only critical/high
gh workflow run property-compliance.yml \
  --repo your-org/manager-repo \
  -f severity_filter=high
```

### 2. Compliance Configuration

**File**: `manager_repo/.github/compliance/config.json`

**Defines**:
- Required properties
- Optional properties
- Valid values for each property
- Auto-remediation rules
- Severity levels
- Team rename mappings
- Repository exclusions

**Example**:
```json
{
  "required_properties": [
    "infrastructure_tools",
    "customer_tier",
    "team_owner"
  ],
  "valid_values": {
    "customer_tier": ["free", "startup", "professional", "enterprise"]
  },
  "auto_remediate": {
    "team_owner": true
  },
  "severity_rules": {
    "invalid_team": "critical",
    "missing_required": "high"
  }
}
```

### 3. External Sync Tool

**File**: `manager_repo/tools/sync-properties.js`

**What it does**:
- Syncs properties with external sources of truth
- Handles complex scenarios (billing updates, team renames)
- Can be triggered by webhooks
- Supports dry-run mode

**Usage**:
```bash
cd manager_repo/tools
npm install

# Dry-run (see what would change)
npm run sync:dry-run

# Sync customer tiers from billing system
npm run sync:billing

# Sync team ownership from GitHub Teams
npm run sync:teams

# Sync everything
npm run sync:all
```

---

## Violation Types & Severity

| Type | Description | Default Severity | Auto-Fix? |
|------|-------------|------------------|-----------|
| `missing_required` | Required property not set | High | No |
| `missing_optional` | Optional property not set | Low | No |
| `invalid_value` | Property has disallowed value | High | No |
| `invalid_team` | Team doesn't exist in org | **Critical** | Yes* |
| `team_mismatch` | Team doesn't have repo access | Medium | No |
| `stale_property` | Property unchanged for 90+ days | Low | No |
| `deprecated_value` | Using deprecated value | Medium | No |

*Auto-fix only when `remediate: true`

### Severity Definitions

- **Critical** 🔴: Immediate action required, blocks deployments
- **High** 🟠: Action required within 24 hours
- **Medium** 🟡: Should be fixed within 1 week
- **Low** 🔵: Informational, fix when convenient

---

## Common Scenarios

### Scenario 1: Team Rename

**Problem**: Team "platform-team" renamed to "infrastructure-team"

**Solution**:

1. Add mapping to config:
```json
{
  "team_mappings": {
    "platform-team": "infrastructure-team"
  }
}
```

2. Run compliance scan with remediation:
```bash
gh workflow run property-compliance.yml -f remediate=true
```

3. All repos with old team name automatically updated

---

### Scenario 2: Customer Tier Changes (Billing Update)

**Problem**: Customer upgraded from "professional" to "enterprise"

**Solution**:

1. Billing system webhook triggers sync:
```bash
# Webhook calls:
curl -X POST https://your-org.com/api/sync \
  -d '{"event": "subscription.updated", "customer": "customer-a"}'
```

2. Sync tool runs:
```bash
node tools/sync-properties.js --source billing-api --property customer_tier
```

3. Property updated automatically

---

### Scenario 3: Repository Transfer

**Problem**: Repo transferred from "team-a" to "team-b"

**Solution**:

1. GitHub webhook detects transfer
2. Sync tool runs:
```bash
node tools/sync-properties.js --source github-teams --property team_owner
```

3. `team_owner` property updated to match actual GitHub team

---

### Scenario 4: New Compliance Requirement

**Problem**: Org now requires `security_contact` on all repos

**Solution**:

1. Add to config:
```json
{
  "required_properties": [
    "infrastructure_tools",
    "customer_tier",
    "team_owner",
    "security_contact"  // NEW
  ]
}
```

2. Compliance scan runs:
```bash
gh workflow run property-compliance.yml
```

3. Issue created listing all repos missing new property

4. Ops team bulk-updates properties:
```bash
# Using GitHub API
for repo in $(cat repos-missing-security-contact.txt); do
  gh api repos/your-org/$repo/properties/values -X PUT \
    -f properties[][property_name]='security_contact' \
    -f properties[][value]='security@company.com'
done
```

---

## Setup Instructions

### For Service Providers

#### 1. Enable Compliance Scanner

```bash
cd manager_repo

# Workflow is already in place
# Just needs secrets/variables configured
```

#### 2. Configure Secrets & Variables

Go to manager repo `Settings → Secrets and variables`:

**Secrets** (if not already set):
- `SOURCE_REPOS_PAT` - PAT with `repo` scope to read/write properties

**Variables**:
- None additional required (uses existing PAT)

#### 3. Customize Compliance Config

Edit `.github/compliance/config.json`:

```bash
cd manager_repo/.github/compliance
vi config.json

# Set your organization's rules:
# - Required properties
# - Valid values
# - Severity levels
# - Auto-remediation rules
```

#### 4. Test Compliance Scan

```bash
# Run manual scan first
gh workflow run property-compliance.yml -f severity_filter=all

# Check results
gh run list --workflow=property-compliance.yml --limit 1
gh run view --log

# Review compliance issue created
```

#### 5. Enable Auto-Remediation (Optional)

Test first with dry-run:
```bash
# See what would be fixed
gh workflow run property-compliance.yml -f remediate=false

# If safe, enable auto-fix for low-risk items
gh workflow run property-compliance.yml -f remediate=true
```

#### 6. Set Up External Sync (Optional)

```bash
cd manager_repo/tools
npm install

# Configure your sources of truth in sync-properties.js
# Edit the adapter functions:
# - fetchFromBillingSystem()
# - fetchFromLDAP()
# - fetchFromCMDB()

# Test sync
npm run sync:dry-run
```

#### 7. Schedule External Sync

Add to cron or use GitHub Actions:

```yaml
# .github/workflows/external-sync.yml
name: External Property Sync

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: cd tools && npm install
      - run: npm run sync:all
        env:
          GITHUB_TOKEN: ${{ secrets.SOURCE_REPOS_PAT }}
          GITHUB_ORG: ${{ github.repository_owner }}
```

---

## Monitoring & Alerts

### Dashboard Metrics

Track these over time:

- Total violations (trending down = good)
- Critical violations (should be zero)
- Time to remediation
- Auto-fix success rate
- Properties drift rate

### Alerts

Configure notifications in `config.json`:

```json
{
  "notification_config": {
    "slack_webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK",
    "email_recipients": ["ops@company.com"],
    "severity_threshold": "high"
  }
}
```

### GitHub Issues

Compliance scanner automatically:
- ✅ Creates issue when violations found
- ✅ Updates issue on subsequent scans
- ✅ Closes issue when all violations resolved
- ✅ Labels by severity (`critical`, `high-priority`)

---

## Best Practices

### 1. Scan Frequently

```yaml
# Every 6 hours catches drift early
schedule:
  - cron: '0 */6 * * *'
```

### 2. Auto-Fix Conservatively

Only auto-fix properties that are:
- ✅ Low risk (`team_owner` from GitHub Teams)
- ✅ Have clear source of truth
- ✅ Won't affect billing or SLAs

Never auto-fix:
- ❌ `customer_tier` (affects billing)
- ❌ `infrastructure_tools` (triggers provisioning)
- ❌ Missing required properties (needs review)

### 3. Version Control Everything

```bash
# Commit all config changes
git add .github/compliance/
git commit -m "compliance: update required properties"
git push
```

### 4. Test Before Enforcing

```bash
# 1. Dry-run scan
gh workflow run property-compliance.yml -f severity_filter=high

# 2. Review violations
# 3. Fix a few manually
# 4. Run again to verify
# 5. Then enable auto-remediation
```

### 5. Document Exceptions

```json
{
  "repository_exclusions": [
    ".github",           // Meta repos
    "archived-*",        // Archived projects
    "template-*",        // Templates
    "customer-legacy-*"  // Legacy, can't fix
  ]
}
```

### 6. Handle Team Renames Proactively

```json
{
  "team_mappings": {
    "old-platform-team": "infrastructure-team",
    "old-devops-team": "sre-team"
  }
}
```

### 7. Sync Before Scan

```bash
# Daily schedule:
# 1. 00:00 - External sync runs
# 2. 00:30 - Compliance scan runs
# 3. Properties are fresh and violations detected immediately
```

---

## Troubleshooting

### Issue: Scan Fails with Auth Error

**Cause**: PAT expired or insufficient permissions

**Fix**:
```bash
# Verify PAT
gh auth status

# Check PAT has 'repo' scope
# Settings → Developer settings → Personal access tokens
# Regenerate if needed and update secret
```

### Issue: Too Many False Positives

**Cause**: Config too strict

**Fix**:
```json
{
  // Add exclusions
  "repository_exclusions": ["pattern-to-exclude"],
  
  // Relax valid values
  "valid_values": {
    "customer_tier": ["free", "startup", "professional", "enterprise", "legacy"]
  },
  
  // Lower severity
  "severity_rules": {
    "team_mismatch": "low"  // was medium
  }
}
```

### Issue: Properties Not Auto-Fixing

**Cause**: Auto-remediation disabled or conditions not met

**Fix**:
1. Check `auto_remediate` config:
```json
{
  "auto_remediate": {
    "team_owner": true  // Must be true
  }
}
```

2. Run with remediate flag:
```bash
gh workflow run property-compliance.yml -f remediate=true
```

3. Check workflow logs for errors

### Issue: External Sync Failing

**Cause**: Source system unavailable or credentials expired

**Fix**:
```bash
# Test source connection
node tools/sync-properties.js --source billing-api --dry-run --verbose

# Check credentials
echo $BILLING_API_KEY  # Should be set
echo $LDAP_PASSWORD    # Should be set

# Review sync logs
cat sync-results-*.json
```

---

## API Reference

### Compliance Scanner Outputs

Workflow produces these artifacts:

- `compliance-report.json` - Full detailed report
- `compliance-summary.md` - Human-readable summary

**Report Schema**:
```json
{
  "scan_date": "2024-01-01T00:00:00Z",
  "statistics": {
    "total_repos": 100,
    "violations_count": 15,
    "violations_by_severity": {
      "critical": 2,
      "high": 5,
      "medium": 6,
      "low": 2
    }
  },
  "violations": [
    {
      "repo": "customer-a-repo",
      "type": "invalid_team",
      "property": "team_owner",
      "severity": "critical",
      "message": "..."
    }
  ],
  "fixes": [...]
}
```

### External Sync Tool

**Command Line**:
```bash
node sync-properties.js [options]

Options:
  --source=<source>      Source of truth (billing-api, github-teams, ldap, cmdb, all)
  --property=<prop>      Property to sync (customer_tier, team_owner, all)
  --dry-run              Show changes without applying
  --verbose              Detailed output
```

**Programmatic**:
```javascript
const { syncProperty } = require('./sync-properties.js');

await syncProperty('customer_tier', {
  'customer-a-repo': 'enterprise',
  'customer-b-repo': 'professional'
});
```

---

## Examples

See `docs/examples/compliance/` for:
- Sample compliance reports
- Auto-remediation examples
- External sync configurations
- Webhook integration examples

---

## Support

**For Compliance Issues**:
1. Check compliance issue in manager repo
2. Review workflow logs
3. Consult this documentation
4. Contact platform team

**For Sync Tool Issues**:
1. Run with `--dry-run --verbose`
2. Check source system connectivity
3. Verify credentials
4. Review sync results JSON

---

## Related Documentation

- [CUSTOM-PROPERTIES.md](CUSTOM-PROPERTIES.md) - Custom properties guide
- [SETUP.md](SETUP.md) - Initial setup
- [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - Quick commands
- [manager_repo/.github/compliance/README.md](../manager_repo/.github/compliance/README.md) - Config details

