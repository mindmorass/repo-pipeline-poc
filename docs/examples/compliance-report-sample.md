# Sample Compliance Report

This is an example of what the compliance scanner generates.

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Repositories Scanned | 87 |
| Total Violations | 23 |
| Critical Severity | 3 |
| High Severity | 8 |
| Medium Severity | 10 |
| Low Severity | 2 |
| Auto-Fixes Applied | 5 |

## 🚨 Violations

### 🔴 Critical (3)

- **customer-old-app**: Team 'platform-team' does not exist in organization
  - Current value: `platform-team`
  - Action: Team was renamed to 'infrastructure-team'

- **legacy-service**: Team 'devops-team' does not exist in organization
  - Current value: `devops-team`
  - Action: Team was renamed to 'sre-team'

- **test-app-prototype**: Required property 'team_owner' is not set
  - Action: Must be assigned to a team

### 🟠 High (8)

- **customer-a-repo**: Required property 'customer_tier' is not set
- **customer-b-repo**: Required property 'customer_tier' is not set
- **demo-app**: Property 'customer_tier' has invalid value: `premium`
  - Valid values: free, startup, professional, enterprise
- **experimental-service**: Required property 'infrastructure_tools' is not set
- **old-microservice**: Required property 'infrastructure_tools' is not set
- **partner-integration**: Property 'infrastructure_tools' has invalid value: `chef`
  - Valid values: terraform, ansible, pulumi, cloudformation, crossplane
- **staging-env**: Required property 'team_owner' is not set
- **temp-project**: Required property 'customer_tier' is not set

### 🟡 Medium (10)

- **api-gateway**: Property says 'infrastructure-team' but team doesn't have repo access
  - Actual teams: platform-team
- **auth-service**: Property says 'sre-team' but team doesn't have repo access
  - Actual teams: security-team
- **billing-service**: Property says 'platform-team' but team doesn't have repo access
  - Actual teams: billing-team, platform-team
- **cache-layer**: Property says 'infrastructure-team' but team doesn't have repo access
- **data-pipeline**: Property says 'data-team' but team doesn't have repo access
- **email-service**: Property says 'platform-team' but team doesn't have repo access
- **frontend-app**: Property says 'frontend-team' but team doesn't have repo access
- **logging-service**: Property says 'sre-team' but team doesn't have repo access
- **monitoring-stack**: Property says 'sre-team' but team doesn't have repo access
- **notification-service**: Property says 'platform-team' but team doesn't have repo access

## 🔧 Auto-Fixes Applied (5)

- **customer-old-app**: team_owner = `platform-team` → `infrastructure-team`
  - Reason: Team does not exist, set to actual repo team

- **legacy-service**: team_owner = `devops-team` → `sre-team`
  - Reason: Team does not exist, set to actual repo team

- **old-api**: team_owner = `platform-team` → `infrastructure-team`
  - Reason: Team does not exist, set to actual repo team

- **test-service**: team_owner = `old-team` → `new-team`
  - Reason: Team does not exist, set to actual repo team

- **worker-service**: team_owner = `devops-team` → `sre-team`
  - Reason: Team does not exist, set to actual repo team

## 🛠️ Remediation Guide

### For Critical/High Violations:

1. Review the violations above
2. Update custom properties in affected repositories:

```bash
# Fix missing customer_tier
gh api repos/your-org/customer-a-repo/properties/values -X PUT \
  -f properties[][property_name]='customer_tier' \
  -f properties[][value]='professional'

# Fix invalid value
gh api repos/your-org/demo-app/properties/values -X PUT \
  -f properties[][property_name]='customer_tier' \
  -f properties[][value]='enterprise'
```

3. Re-run compliance scan to verify

### For Medium Violations (Team Mismatches):

These indicate the `team_owner` property doesn't match the actual GitHub team with access.

**Option 1**: Update property to match actual team
```bash
gh api repos/your-org/api-gateway/properties/values -X PUT \
  -f properties[][property_name]='team_owner' \
  -f properties[][value]='platform-team'
```

**Option 2**: Give team access to repo
```bash
gh api orgs/your-org/teams/infrastructure-team/repos/your-org/api-gateway -X PUT \
  -f permission='push'
```

### Auto-Remediation:

Run compliance scan with `remediate: true` to auto-fix:
- Invalid team_owner (will set to actual repo team)
- Other safe property corrections

⚠️ **Warning**: Auto-remediation will modify repository properties!

```bash
gh workflow run property-compliance.yml -f remediate=true
```

---

[View full report](https://github.com/your-org/manager-repo/actions/runs/12345)

## Next Steps

1. Fix all **Critical** violations immediately
2. Plan remediation for **High** violations (within 24h)
3. Address **Medium** violations during next sprint
4. **Low** violations are informational

## Compliance Trend

| Date | Total Violations | Critical | High | Medium | Low |
|------|------------------|----------|------|--------|-----|
| 2024-12-19 | 23 | 3 | 8 | 10 | 2 |
| 2024-12-18 | 31 | 5 | 12 | 12 | 2 |
| 2024-12-17 | 28 | 4 | 10 | 12 | 2 |
| 2024-12-16 | 35 | 7 | 15 | 11 | 2 |

📈 **Trend**: Improving! Down from 35 to 23 violations in 3 days.

