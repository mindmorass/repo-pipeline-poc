# Compliance Configuration

This directory contains compliance configuration for GitHub Custom Properties enforcement.

## Files

### `config.json`

Main compliance configuration file that defines:

- **Required Properties**: Properties that must be set on all repositories
- **Optional Properties**: Properties that are allowed but not required
- **Valid Values**: Allowed values for each property (validation rules)
- **Auto-Remediate**: Which violations can be automatically fixed
- **Severity Rules**: Severity level for each type of violation
- **Team Mappings**: Old team name → New team name (for team renames)
- **Repository Exclusions**: Repos to skip during compliance scans

### `sources-of-truth.json` (Optional)

External sources of truth for property values:

- Billing system API for customer tiers
- LDAP/AD for team ownership
- CMDB for security contacts
- Internal databases

## Configuration Schema

```json
{
  "required_properties": ["property_name", ...],
  "optional_properties": ["property_name", ...],
  
  "valid_values": {
    "property_name": ["allowed", "values"]
  },
  
  "auto_remediate": {
    "violation_type": true/false
  },
  
  "severity_rules": {
    "violation_type": "critical|high|medium|low"
  },
  
  "team_mappings": {
    "old_team_name": "new_team_name"
  },
  
  "repository_exclusions": [
    "pattern",
    "prefix-*"
  ]
}
```

## Usage

### Running Compliance Scan

```bash
# Manual scan with default settings
gh workflow run property-compliance.yml

# Scan with auto-remediation
gh workflow run property-compliance.yml -f remediate=true

# Scan only critical/high violations
gh workflow run property-compliance.yml -f severity_filter=high
```

### Viewing Results

1. Go to Actions tab in this repository
2. Click on "Custom Property Compliance Scanner" workflow
3. View the latest run
4. Download `compliance-report.json` artifact
5. Check Issues tab for compliance issues

### Updating Configuration

1. Edit `config.json`
2. Commit and push changes
3. Next scheduled scan will use new configuration

## Violation Types

| Type | Description | Default Severity | Auto-Fix? |
|------|-------------|------------------|-----------|
| `missing_required` | Required property not set | High | No |
| `missing_optional` | Optional property not set | Low | No |
| `invalid_value` | Property has invalid value | High | No |
| `invalid_team` | Team doesn't exist in org | Critical | Yes* |
| `team_mismatch` | Team doesn't have repo access | Medium | No |
| `stale_property` | Property hasn't been updated | Low | No |
| `deprecated_value` | Using deprecated value | Medium | No |

*Auto-fix only when `remediate: true` is set

## Severity Levels

- **Critical**: Immediate action required, blocks workflows
- **High**: Action required soon, may block deployments
- **Medium**: Should be fixed, doesn't block
- **Low**: Nice to fix, informational

## Auto-Remediation

Auto-remediation is **disabled by default** for safety.

**Safe to auto-fix:**
- `team_owner` - Sets to actual GitHub team with repo access
- Team name mappings from `team_mappings`

**Unsafe to auto-fix:**
- `customer_tier` - Could affect billing
- `infrastructure_tools` - Could trigger unwanted provisioning
- Missing required properties - Needs manual review

## Team Renames

When a team is renamed:

1. Add mapping to `config.json`:
```json
{
  "team_mappings": {
    "old-team-name": "new-team-name"
  }
}
```

2. Run compliance scan with remediation:
```bash
gh workflow run property-compliance.yml -f remediate=true
```

3. All repos with `old-team-name` will be updated to `new-team-name`

## Integration with External Systems

### Billing System

To sync `customer_tier` from billing system, use the external sync tool:

```bash
node tools/sync-properties.js --source billing-api --property customer_tier
```

### LDAP/Active Directory

To sync team ownership from AD:

```bash
node tools/sync-properties.js --source ldap --property team_owner
```

See `tools/` directory for sync scripts.

## Best Practices

1. **Run scans frequently** - Every 6 hours catches drift early
2. **Review violations daily** - Check compliance issues
3. **Auto-fix carefully** - Only for low-risk properties
4. **Document exceptions** - Use repository exclusions for special cases
5. **Version configuration** - Commit all changes to config.json
6. **Test changes** - Run manual scan after config updates
7. **Monitor trends** - Track violation counts over time

## Notifications

Configure notifications in `config.json`:

```json
{
  "notification_config": {
    "slack_webhook_url": "https://hooks.slack.com/...",
    "email_recipients": ["ops@company.com"],
    "severity_threshold": "high"
  }
}
```

Violations at or above threshold will trigger notifications.

## Troubleshooting

### Scan fails with authentication error
- Check `SOURCE_REPOS_PAT` secret has `repo` permissions
- Verify PAT hasn't expired

### Properties not being fixed
- Ensure `remediate: true` is set
- Check `auto_remediate` config for that violation type
- Review workflow logs for errors

### Too many false positives
- Add exclusions to `repository_exclusions`
- Adjust `valid_values` to be more permissive
- Lower severity in `severity_rules`

## Support

For questions or issues:
- Review workflow logs in Actions tab
- Check existing compliance issues
- Contact platform team

