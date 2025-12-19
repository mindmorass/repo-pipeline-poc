# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added - Phase 3 Auto-Remediation (Dec 19, 2024)

#### 🤖 Automatic Content Type Drift Detection & Remediation

Implemented Phase 3 auto-remediation to handle repository restructuring scenarios (merges, splits, content changes).

**Problem Solved:**
- Repository merges (app + infra → monorepo) leave stale properties
- Repository splits leave incorrect content types
- Infrastructure addition/removal not reflected in properties
- Manual updates required, leading to drift

**Solution:**

1. **Structure Detection in Compliance Scanner**
   - Automatically detects actual repository content
   - Compares with declared `repo_content_type`
   - Identifies mismatches (missing or stale types)

2. **Safe Auto-Remediation**
   - ✅ Automatically **adds** missing content types when detected
   - ⚠️ **Suggests** (doesn't auto-remove) stale types for manual review
   - Full audit trail of all fixes

3. **Source Repo Validation Workflow**
   - Runs on every push to main/develop
   - Detects structure changes
   - Creates GitHub Issues with exact fix commands
   - Adds PR comments when structure changes

**Configuration:**

```json
{
  "auto_remediate": {
    "content_type_add_detected": true,      // Auto-add detected types
    "content_type_remove_missing": false    // Manual review for removal
  },
  "content_detection_rules": {
    "infra_indicators": ["infra", "terraform", "ansible", ...],
    "app_indicators": ["app", "src", "frontend", ...]
  }
}
```

**Files Created:**
- `source_monorepo/.github/workflows/validate-content-type.yml` - Source validation
- `docs/AUTO-REMEDIATION.md` - Complete remediation guide

**Files Updated:**
- `manager_repo/.github/compliance/config.json` - Added detection rules
- `manager_repo/.github/workflows/property-compliance.yml` - Added structure detection

**Benefits:**
- ✅ Automatic drift correction for safe cases
- ✅ Immediate detection of structure changes
- ✅ Clear guidance for manual review cases
- ✅ Prevents compliance violations from repo restructuring
- ✅ Full audit trail and reporting

**Example Auto-Fix:**
```
Repo: customer-monorepo
Before: repo_content_type: ["app"]
Detected: Has infra/ directory
After: repo_content_type: ["app", "infra"]  ← Auto-fixed!
```

---

### Added - Repository Content Type Classification (Dec 19, 2024)

#### 🏷️ New Property: `repo_content_type`

Added `repo_content_type` custom property to classify repositories by their content.

**Property Definition:**
- **Type**: Multi-select
- **Values**: `app`, `infra`
- **Purpose**: Identify what content the repository manages

**Use Cases:**

1. **Monorepo** (`["app", "infra"]`)
   - Contains both application and infrastructure code
   - Example: `source_monorepo/` with `app/` and `infra/` directories

2. **Infrastructure-Only** (`["infra"]`)
   - Contains only infrastructure code (Terraform, Ansible, K8s)
   - Example: `terraform-modules/`, `ansible-playbooks/`

3. **Application-Only** (`["app"]`)
   - Contains only application code, no infrastructure
   - Example: `frontend-webapp/`, `backend-api/`

**Benefits:**

✅ **Targeted Compliance**: Compliance scanner only requires `infrastructure_tools` and `customer_tier` for repos with `infra` content  
✅ **Skip Non-Infra Repos**: App-only repos don't need infrastructure properties  
✅ **Better Filtering**: Query repos by content type  
✅ **Accurate Reporting**: Know exactly which repos manage infrastructure  
✅ **Faster Scans**: Skip infrastructure checks for app-only repos

**Changes:**

- Updated `docs/CUSTOM-PROPERTIES.md` with `repo_content_type` definition
- Updated compliance config:
  - `repo_content_type` required for ALL repos
  - `infrastructure_tools` and `customer_tier` only required for repos with `infra` content
- Updated compliance scanner workflow to:
  - Check for `repo_content_type` property
  - Skip infrastructure checks for app-only repos
  - Log content types during scan
- Added examples:
  - `docs/examples/set-repo-content-types.sh` - Bulk setting script
  - `docs/examples/repo-content-type-examples.md` - Comprehensive guide with 5 repository patterns

**Migration:**

```bash
# Monorepo (both app and infra)
gh api repos/org/monorepo/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app' \
  -f properties[][value][]='infra'

# Infrastructure-only
gh api repos/org/terraform-modules/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='infra'

# App-only (no infra properties needed!)
gh api repos/org/frontend-app/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app'
```

---

### Added - Compliance & Drift Detection System (Dec 19, 2024)

#### 🔍 Major Feature: Automated Property Compliance Scanning

Built a complete compliance scanning and drift detection system for GitHub Custom Properties with automated remediation and external synchronization.

**New Components:**

1. **Compliance Scanner Workflow** (`property-compliance.yml`)
   - 513 lines - Scans all org repositories every 6 hours
   - Validates properties against configurable rules
   - Detects 7 types of violations (missing, invalid, stale, team mismatches)
   - Auto-remediates low-risk issues (optional)
   - Creates/updates GitHub Issues with violation details
   - Generates detailed JSON reports as artifacts
   - Supports dry-run mode and severity filtering
   - Fails on critical violations to block deployments

2. **External Sync Tool** (`tools/sync-properties.js`)
   - 350 lines - Syncs GitHub properties with external sources of truth
   - Pluggable adapters: Billing System, LDAP/AD, CMDB, GitHub Teams
   - NPM scripts for common operations (`sync:all`, `sync:billing`, `sync:teams`)
   - Dry-run mode to preview changes
   - Detailed JSON result reports

3. **Compliance Configuration** (`.github/compliance/`)
   - `config.json` - Defines rules, valid values, severity levels
   - Configurable auto-remediation per violation type
   - Team rename mappings for smooth transitions
   - Repository exclusions for special cases

**Documentation:**

- `docs/COMPLIANCE.md` - 666 lines comprehensive guide with scenarios
- `manager_repo/.github/compliance/README.md` - Configuration reference
- `docs/examples/compliance-report-sample.md` - Example compliance report
- `docs/examples/compliance-webhook-integration.md` - Webhook integration patterns
- `COMPLIANCE-IMPLEMENTATION.md` - Complete implementation summary

**Violation Types Detected:**

| Type | Description | Severity | Auto-Fix? |
|------|-------------|----------|-----------|
| `missing_required` | Required property not set | High | No |
| `invalid_value` | Property has disallowed value | High | No |
| `invalid_team` | Team doesn't exist in org | Critical | Yes* |
| `team_mismatch` | Team doesn't have repo access | Medium | No |
| `stale_property` | Property unchanged for 90+ days | Low | No |

*Auto-fix only when `remediate: true` flag set

**Common Scenarios Solved:**

✅ **Team Renames**: Add mapping to config, run with `remediate=true`, all repos auto-fixed  
✅ **Customer Tier Changes**: Billing webhook triggers sync, properties auto-updated  
✅ **Repository Transfers**: GitHub webhook detected, team ownership auto-synced  
✅ **New Compliance Requirements**: Add to config, scanner creates issue with all violations  
✅ **Drift Detection**: Automatic every 6 hours with GitHub Issue tracking  

**Usage:**

```bash
# Run compliance scan
gh workflow run property-compliance.yml

# Auto-remediate low-risk issues
gh workflow run property-compliance.yml -f remediate=true

# External sync
cd manager_repo/tools && npm run sync:all
```

**Benefits:**

- ✅ Detect drift automatically every 6 hours
- ✅ Auto-fix team renames and safe violations
- ✅ Sync with external systems (billing, LDAP, CMDB)
- ✅ Real-time compliance status in GitHub Issues
- ✅ Webhook-ready for instant updates
- ✅ Comprehensive audit trail
- ✅ Production-ready with 2,300+ lines of code/docs

---

### Added - Custom Properties & Tool Orchestration (2024)

#### 🎯 Major Feature: GitHub Custom Properties Integration

Added support for GitHub Custom Properties to enable customer self-service infrastructure tool selection and configuration.

**What Changed:**

1. **Customer Repos (source_monorepo)**
   - Workflows now fetch repository custom properties
   - Properties passed as metadata to manager repo
   - Workflow blocks until infrastructure setup complete
   - Supports opt-in tool selection

2. **Manager Repo**
   - New `parse-capabilities` job to read customer properties
   - New `setup-spacelift-terraform` job for Terraform stack provisioning
   - New `setup-spacelift-ansible` job for Ansible stack provisioning
   - Infrastructure setup status posted back to customer repos
   - Conditional execution based on enabled tools

3. **Documentation**
   - New `CUSTOM-PROPERTIES.md` - Complete guide to custom properties
   - Example configurations for common patterns
   - Service provider onboarding script

**New Custom Properties:**

| Property | Type | Purpose |
|----------|------|---------|
| `infrastructure_tools` | Multi-select | Which tools to enable (terraform, ansible, etc.) |
| `terraform_version` | Single-select | Terraform version for Spacelift |
| `spacelift_auto_deploy` | Boolean | Auto-deploy on main branch |
| `infrastructure_approval_required` | Boolean | Require manual approval |
| `spacelift_stack_name` | String | Custom Spacelift stack name |
| `ansible_inventory_path` | String | Path to Ansible inventory |

**Benefits:**

- ✅ Customers control which tools are enabled via repository settings
- ✅ Service provider automatically provisions Spacelift stacks
- ✅ Customer workflows block until infrastructure is ready
- ✅ Transparent Spacelift setup - no manual configuration needed
- ✅ Easily add new tools (Pulumi, Crossplane) in the future

**Use Cases:**

```yaml
# Terraform only (most common)
infrastructure_tools: ["terraform"]
terraform_version: "1.6"

# Multi-tool advanced
infrastructure_tools: ["terraform", "ansible"]
terraform_version: "1.6"
ansible_inventory_path: "ansible/inventory/"

# Enterprise fast-track
infrastructure_tools: ["terraform"]
spacelift_auto_deploy: true
infrastructure_approval_required: false
customer_tier: "enterprise"
```

**Breaking Changes:** None - backward compatible

**Migration Guide:**

Existing customers:
1. No immediate action required
2. To opt-in: Set `infrastructure_tools` custom property
3. On next `infra/` change, Spacelift stack will be auto-created

**Files Changed:**

- `source_monorepo/.github/workflows/trigger-infra.yml` - Enhanced with property fetching
- `manager_repo/.github/workflows/infra-deploy.yml` - Added Spacelift provisioning jobs
- `docs/CUSTOM-PROPERTIES.md` - New comprehensive guide
- `docs/examples/*.md` - Configuration examples
- `docs/examples/onboarding-script.sh` - Automated customer onboarding
- `README.md` - Updated feature list and documentation links

---

## [1.0.0] - Documentation Reorganization (Initial Release)

### Added

#### Documentation Structure
- Created `docs/` folder for all documentation
- Moved all `.md` files (except root `README.md`) to `docs/`
- Root `README.md` serves as entry point with links to docs

#### Context Updates
- Reframed entire system as **customer/service provider relationship**
- Updated terminology throughout:
  - "Source repos" → "Customer repositories"
  - "Manager repo" → "Service Provider manager repo"

#### New Documentation

1. **ARCHITECTURE.md**
   - Service provider and customer roles clearly defined
   - Benefits matrix for both parties
   - Multi-tenant architecture documented
   - Security model explained

2. **SETUP.md**
   - Split into Part 1 (Service Provider) and Part 2 (Customer)
   - Service provider prerequisites and setup
   - Customer onboarding process
   - Multi-tenant state management
   - Production readiness checklist

3. **QUICK-REFERENCE.md**
   - Separate sections for customers vs service providers
   - Customer-focused troubleshooting
   - Service provider monitoring and management
   - Customer onboarding quick checks
   - Emergency procedures for both roles

4. **PATTERNS.md**
   - Customer repository patterns (monorepo, separate repos, etc.)
   - Service provider view of multi-customer pattern
   - Customer onboarding patterns
   - SLA and tier-based patterns
   - Choosing guides for both audiences

5. **README.md** (Root)
   - Complete rewrite as entry point
   - Clearly defines roles (service provider vs customer)
   - Links to all documentation in `docs/`
   - Separate quick-starts for each role
   - Benefits matrix showing value for both parties

#### Features

- Basic monorepo customer pattern
- Terraform integration with service provider control
- GitHub Actions workflows for trigger and deploy
- Commit status feedback to customer repos
- PR comment integration with Terraform plans
- Drift detection workflow for service provider
- Variable-driven infrastructure (customers provide YAML)
- Per-customer state isolation
- Environment-based approvals

### Changed

- All documentation updated with customer/service provider context
- Workflows clarified to show customer triggers → service provider deploys
- State management organized per customer repository
- Security model emphasizes credential isolation

### File Structure

```
Before:
├── ARCHITECTURE.md          # Root level
├── SETUP.md                 # Root level
├── QUICK-REFERENCE.md       # Root level
├── PATTERNS.md              # Root level
└── README.md                # Root level

After:
├── docs/
│   ├── ARCHITECTURE.md      # Moved & updated
│   ├── SETUP.md             # Moved & updated
│   ├── QUICK-REFERENCE.md   # Moved & updated
│   ├── PATTERNS.md          # Moved & updated
│   └── CHANGELOG.md         # New
└── README.md                # Rewritten with links
```

---

## Future Roadmap

### v2.0 - Multi-Cloud Support
- Azure and GCP provider support
- Cloud-specific custom properties
- Cross-cloud state management

### v2.1 - Policy & Governance
- OPA policy-as-code validation
- Sentinel policy enforcement
- Custom approval workflows per customer tier

### v2.2 - Enhanced Observability
- Customer usage dashboards
- Cost allocation and reporting
- SLA monitoring and alerting
- Infrastructure change analytics

### v2.3 - Additional Tools
- Pulumi integration
- CloudFormation support
- Crossplane for Kubernetes
- CDK support

### v3.0 - Customer Portal
- Web-based customer portal
- Self-service infrastructure requests
- Cost transparency dashboard
- Deployment history and rollbacks

---

## Contributing

This is a template repository. Contributions welcome for:
- Additional tool integrations
- Improved documentation
- Bug fixes
- Feature requests

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| Unreleased | 2024 | Custom Properties & Tool Orchestration |
| 1.0.0 | 2024 | Initial release with customer/SP model |
