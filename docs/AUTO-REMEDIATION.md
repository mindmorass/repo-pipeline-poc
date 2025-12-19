# Auto-Remediation Guide

Complete guide to automatic property drift detection and remediation.

## Overview

The platform includes **Phase 3 auto-remediation** that automatically detects and fixes repository content type mismatches when repositories are merged, split, or restructured.

---

## 🎯 Problem Scenarios

### Scenario 1: Repository Merge
**Customer merges** `app-repo` + `infra-repo` → `monorepo`

**Before:**
- `app-repo`: `repo_content_type: ["app"]`
- `infra-repo`: `repo_content_type: ["infra"]`

**After merge:**
- `monorepo`: Has both app and infra, but property still says `["app"]`

**Auto-Fix**: ✅ Compliance scanner detects infra directories, automatically adds `"infra"`

### Scenario 2: Repository Split
**Customer splits** `monorepo` → `app-repo` + `infra-repo`

**Before:**
- `monorepo`: `repo_content_type: ["app", "infra"]`

**After split:**
- `app-repo`: Only app code, property still says `["app", "infra"]`

**Auto-Fix**: ⚠️ Manual review required (scanner suggests removing `"infra"`)

### Scenario 3: Infrastructure Removal
**Team removes** all `infra/` directories from monorepo

**Auto-Fix**: ⚠️ Manual review required (scanner suggests removing `"infra"`)

### Scenario 4: Infrastructure Addition
**Team adds** `infra/terraform/` to app-only repo

**Auto-Fix**: ✅ Compliance scanner detects infra directories, automatically adds `"infra"`

---

## 🔍 Detection Methods

### 1. Directory-Based Detection

The compliance scanner checks for these directories:

**Infrastructure Indicators:**
- `infra/`
- `terraform/`
- `ansible/`
- `kubernetes/` or `k8s/`
- `helm/`
- `cloudformation/`
- `pulumi/`

**Application Indicators:**
- `app/`
- `src/`
- `frontend/`
- `backend/`
- `services/`
- `packages/`
- `lib/`
- `components/`

### 2. File Pattern Detection

Also checks for infrastructure files:
- `*.tf` (Terraform)
- `*.tfvars` (Terraform variables)
- `ansible.cfg` (Ansible)
- `playbook.yml` (Ansible)

---

## ⚙️ Configuration

### Compliance Config

File: `manager_repo/.github/compliance/config.json`

```json
{
  "auto_remediate": {
    "team_owner": true,
    "content_type_add_detected": true,      // ← Auto-add if detected
    "content_type_remove_missing": false    // ← Don't auto-remove (needs review)
  },
  "content_detection_rules": {
    "infra_indicators": [
      "infra", "terraform", "ansible", "kubernetes", 
      "k8s", "helm", "cloudformation", "pulumi"
    ],
    "app_indicators": [
      "app", "src", "frontend", "backend", 
      "services", "packages", "lib", "components"
    ],
    "check_file_extensions": true,
    "infra_file_patterns": [".tf", ".tfvars", "ansible.cfg", "playbook.yml"]
  },
  "severity_rules": {
    "content_type_mismatch_add": "high",      // Missing type = high severity
    "content_type_mismatch_remove": "medium"  // Extra type = medium severity
  }
}
```

### What Gets Auto-Fixed

✅ **Safe to auto-fix** (enabled by default):
- **Adding missing content types** when directories are detected
  - Has `infra/` but property doesn't include `"infra"` → Auto-add
  - Has `app/` but property doesn't include `"app"` → Auto-add

❌ **NOT auto-fixed** (requires manual review):
- **Removing content types** when directories are missing
  - Property says `"infra"` but no infra directories → Suggest removal
  - Property says `"app"` but no app directories → Suggest removal

**Why?** Removal could be a false positive:
- Temporary directory deletion
- Refactoring in progress
- Content moved to subdirectories

---

## 🚀 How It Works

### Compliance Scanner (Manager Repo)

Runs every 6 hours (or on-demand):

```bash
# Run with auto-remediation
gh workflow run property-compliance.yml \
  --repo your-org/manager-repo \
  -f remediate=true
```

**Process:**
1. Scans all repositories in organization
2. Fetches `repo_content_type` property for each
3. Checks actual directory structure
4. Compares declared vs detected
5. **Auto-fixes** mismatches (if `remediate=true`)
6. Creates compliance report

**Example Output:**
```
🔍 Scanning: customer-monorepo
  📁 Directories: app, infra, docs
  🔍 Detected: app infra
  ⚠️  Mismatch: Property says ["app"] but detected ["app", "infra"]
  ✅ Auto-fixed: Added "infra" to customer-monorepo content type
```

### Source Repo Validation (Customer Repo)

Runs on every push to main/develop:

**File:** `source_monorepo/.github/workflows/validate-content-type.yml`

**Process:**
1. Detects repository structure on push
2. Fetches current `repo_content_type`
3. Compares structure vs property
4. If mismatch:
   - Creates GitHub Issue with update instructions
   - Adds PR comment (if PR)
   - Provides exact command to fix

**Example Issue:**
```markdown
## ⚠️ Repository Structure Changed

The repository structure has changed and the `repo_content_type` 
custom property needs to be updated.

### Current Status

**Detected Structure:**
- ✅ Application code found
- ✅ Infrastructure code found

**Expected `repo_content_type`:** `["app", "infra"]`

### Action Required

Update the custom property:

```bash
gh api repos/your-org/customer-monorepo/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app' \
  -f properties[][value][]='infra'
```
```

---

## 📊 Violation Types

### Type 1: `content_type_mismatch` (High Severity)

**Description**: Repository has content but property doesn't declare it

**Example:**
- Has `infra/terraform/` directory
- Property: `["app"]`
- **Auto-fix**: Add `"infra"` → `["app", "infra"]`

**Compliance Report:**
```json
{
  "repo": "customer-monorepo",
  "type": "content_type_mismatch",
  "severity": "high",
  "message": "Repository has infrastructure directories but repo_content_type does not include 'infra'",
  "detected_content": { "hasInfra": true, "hasApp": true },
  "declared_content": ["app"],
  "auto_fix_available": true
}
```

### Type 2: `content_type_stale` (Medium Severity)

**Description**: Property declares content that doesn't exist

**Example:**
- Property: `["app", "infra"]`
- No `infra/` directory found
- **Manual review**: Suggest removing `"infra"`

**Compliance Report:**
```json
{
  "repo": "customer-app-only",
  "type": "content_type_stale",
  "severity": "medium",
  "message": "repo_content_type includes 'infra' but no infrastructure directories found",
  "detected_content": { "hasInfra": false, "hasApp": true },
  "declared_content": ["app", "infra"],
  "suggestion": "Consider removing 'infra' if infrastructure was removed",
  "auto_fix_available": false
}
```

---

## 🛠️ Manual Remediation

For cases that require manual review:

### Check Current Property

```bash
gh api repos/your-org/REPO_NAME/properties/values | \
  jq '.[] | select(.property_name=="repo_content_type")'
```

### Update Property

```bash
# Add both app and infra
gh api repos/your-org/REPO_NAME/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app' \
  -f properties[][value][]='infra'

# Infrastructure only
gh api repos/your-org/REPO_NAME/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='infra'

# Application only
gh api repos/your-org/REPO_NAME/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app'
```

### Bulk Update

```bash
# Update multiple repos
for repo in customer-a customer-b customer-c; do
  gh api repos/your-org/$repo/properties/values -X PUT \
    -f properties[][property_name]='repo_content_type' \
    -f properties[][value][]='app' \
    -f properties[][value][]='infra'
  echo "✅ Updated $repo"
done
```

---

## 📋 Testing

### Test Auto-Remediation

1. **Create test repo with mismatch:**
```bash
# Create repo with infra/ but property says app-only
mkdir test-repo
cd test-repo
mkdir infra app
git init
git add .
git commit -m "Initial commit"
gh repo create your-org/test-repo --public --source=.

# Set wrong property
gh api repos/your-org/test-repo/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app'
```

2. **Run compliance scan:**
```bash
gh workflow run property-compliance.yml \
  --repo your-org/manager-repo \
  -f remediate=true \
  -f test_mode=5
```

3. **Verify fix:**
```bash
gh api repos/your-org/test-repo/properties/values | \
  jq '.[] | select(.property_name=="repo_content_type")'

# Should now show: ["app", "infra"]
```

### Test Source Repo Validation

1. **Add infra directory to app-only repo:**
```bash
cd app-only-repo
mkdir infra
echo "# Infrastructure" > infra/README.md
git add infra/
git commit -m "Add infrastructure"
git push
```

2. **Check for issue:**
```bash
gh issue list --label property-update

# Should see: "🔄 Update repo_content_type Property"
```

3. **Update property:**
```bash
# Use command from issue
gh api repos/your-org/app-only-repo/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app' \
  -f properties[][value][]='infra'
```

4. **Verify issue closes:**
```bash
# Push another commit
git commit --allow-empty -m "Trigger validation"
git push

# Issue should auto-close
gh issue list --label property-update --state closed
```

---

## 🔐 Security Considerations

### PAT Permissions

The `SOURCE_REPOS_PAT` needs:
- ✅ `repo` - Read/write repository properties
- ✅ `issues` - Create/update issues

### Auto-Fix Safety

Auto-remediation is **conservative by default**:
- ✅ Only **adds** missing types (safe)
- ❌ Never **removes** types automatically (could break workflows)
- ✅ Creates issues for manual review
- ✅ Full audit trail in compliance reports

### Opt-Out

Disable auto-remediation:

```json
{
  "auto_remediate": {
    "content_type_add_detected": false  // Disable auto-add
  }
}
```

Or run scans without remediation:
```bash
gh workflow run property-compliance.yml -f remediate=false
```

---

## 📊 Monitoring

### Compliance Reports

Download latest report:
```bash
RUN_ID=$(gh run list --workflow=property-compliance.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run download $RUN_ID
cat compliance-report-*/compliance-report.json | jq '.fixes'
```

### Auto-Fix Statistics

```bash
# Count auto-fixes in last scan
cat compliance-report-*/compliance-report.json | \
  jq '.fixes | length'

# List all auto-fixed repos
cat compliance-report-*/compliance-report.json | \
  jq '.fixes[].repo'
```

### Drift Trends

Track over time:
```bash
# Weekly: How many repos had mismatches?
# Goal: Number should decrease as teams learn to update properties
```

---

## 🎓 Best Practices

1. **Run scans frequently** - Every 6 hours catches drift early
2. **Enable auto-remediation** - Safe for adding missing types
3. **Review stale properties** - Check medium-severity violations weekly
4. **Document repo changes** - Update properties when restructuring
5. **Use source validation** - Add workflow to all customer repos
6. **Monitor trends** - Track auto-fix counts over time
7. **Test before enabling** - Use `test_mode` for initial scans

---

## 📖 Related Documentation

- [COMPLIANCE.md](COMPLIANCE.md) - Full compliance guide
- [CUSTOM-PROPERTIES.md](CUSTOM-PROPERTIES.md) - Properties overview
- [repo-content-type-examples.md](examples/repo-content-type-examples.md) - Classification examples
- [TESTING.md](TESTING.md) - Testing guide

---

**Auto-remediation is production-ready!** 🎉

