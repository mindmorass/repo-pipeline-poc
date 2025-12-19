# Repository Content Type Examples

How to use the `repo_content_type` custom property to classify repositories.

## Overview

The `repo_content_type` property identifies what content a repository manages:
- **`app`** - Application code (frontend, backend, mobile, etc.)
- **`infra`** - Infrastructure code (Terraform, Ansible, Kubernetes, etc.)
- **Both** - Monorepo containing both application and infrastructure

## Why This Matters

### For Service Providers

✅ **Targeted Compliance**: Only scan infrastructure-related properties for repos with `infra` content  
✅ **Better Filtering**: Query repos by type (`gh api orgs/your-org/properties/values --jq '.[] | select(.repo_content_type | contains(["infra"]))'`)  
✅ **Accurate Reporting**: Know exactly how many infrastructure repos you manage  
✅ **Skip Non-Infra Repos**: Don't waste time checking `infrastructure_tools` on an app-only repo

### For Customers

✅ **Clear Classification**: Document what each repo contains  
✅ **Workflow Routing**: Route CI/CD based on content type  
✅ **Team Ownership**: Different teams own app vs infra  
✅ **Compliance Clarity**: Know which repos need infrastructure properties

---

## Examples by Repository Pattern

### 1. Monorepo (Both App + Infra)

**Scenario**: Single repository with both application code and infrastructure

**Structure**:
```
customer-monorepo/
├── app/
│   ├── frontend/
│   ├── backend/
│   └── mobile/
├── infra/
│   ├── terraform/
│   └── kubernetes/
└── .github/workflows/
```

**Property Setting**:
```bash
gh api repos/your-org/customer-monorepo/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app' \
  -f properties[][value][]='infra'
```

**Required Properties**:
- `repo_content_type`: `["app", "infra"]` ✅
- `team_owner`: (required for all)
- `infrastructure_tools`: `["terraform"]` ✅ (required because has `infra`)
- `customer_tier`: `professional` ✅ (required because has `infra`)

**Behavior**:
- Pushes to `app/` trigger app deployment workflows
- Pushes to `infra/` trigger infrastructure deployment workflows
- Compliance scanner validates infrastructure properties
- Manager repo provisions Spacelift for infrastructure

---

### 2. Infrastructure-Only Repository

**Scenario**: Repository dedicated to infrastructure code only

**Structure**:
```
terraform-modules/
├── modules/
│   ├── vpc/
│   ├── eks/
│   └── rds/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── .github/workflows/
```

**Property Setting**:
```bash
gh api repos/your-org/terraform-modules/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='infra'
```

**Required Properties**:
- `repo_content_type`: `["infra"]` ✅
- `team_owner`: `infrastructure-team`
- `infrastructure_tools`: `["terraform"]` ✅ (required because has `infra`)
- `customer_tier`: `enterprise` ✅ (required because has `infra`)

**Behavior**:
- All pushes trigger infrastructure workflows
- Compliance scanner validates all infrastructure properties
- Manager repo manages Spacelift stacks

---

### 3. Application-Only Repository

**Scenario**: Repository with only application code, no infrastructure

**Structure**:
```
frontend-webapp/
├── src/
│   ├── components/
│   ├── pages/
│   └── utils/
├── public/
├── tests/
└── .github/workflows/
```

**Property Setting**:
```bash
gh api repos/your-org/frontend-webapp/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app'
```

**Required Properties**:
- `repo_content_type`: `["app"]` ✅
- `team_owner`: `frontend-team`
- ❌ **NOT required**: `infrastructure_tools` (no infra content)
- ❌ **NOT required**: `customer_tier` (no infra content)

**Behavior**:
- Pushes trigger app deployment workflows only
- Compliance scanner **skips infrastructure property checks**
- Manager repo is **not involved** (no infrastructure to manage)
- Faster compliance scans (fewer properties to validate)

---

### 4. Kubernetes Manifests Repository

**Scenario**: Infrastructure repo with K8s manifests only

**Structure**:
```
k8s-configs/
├── base/
├── overlays/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── .github/workflows/
```

**Property Setting**:
```bash
gh api repos/your-org/k8s-configs/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='infra'

gh api repos/your-org/k8s-configs/properties/values -X PUT \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='kubernetes'
```

**Required Properties**:
- `repo_content_type`: `["infra"]` ✅
- `infrastructure_tools`: `["kubernetes"]` (if supported)
- `customer_tier`: Required
- `team_owner`: Required

---

### 5. Library/SDK Repository

**Scenario**: Shared library with no app deployment or infrastructure

**Structure**:
```
shared-sdk/
├── src/
├── tests/
└── .github/workflows/
```

**Property Setting**:
```bash
gh api repos/your-org/shared-sdk/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app'
```

**Note**: Use `app` for libraries/SDKs since they're application code, not infrastructure.

**Required Properties**:
- `repo_content_type`: `["app"]` ✅
- `team_owner`: Required
- ❌ No infrastructure properties required

---

## Compliance Behavior

### Repos with `infra` Content

Compliance scanner will check:
- ✅ `repo_content_type` is set
- ✅ `team_owner` is set and valid
- ✅ `infrastructure_tools` is set (required for infra)
- ✅ `customer_tier` is set (required for infra)
- ✅ Tool-specific properties (if tools enabled)

### Repos with ONLY `app` Content

Compliance scanner will check:
- ✅ `repo_content_type` is set
- ✅ `team_owner` is set and valid
- ⏭️ **SKIPS** `infrastructure_tools` (not required)
- ⏭️ **SKIPS** `customer_tier` (not required)
- ⏭️ **SKIPS** infrastructure-specific checks

### Repos with NO `repo_content_type`

Compliance scanner will:
- ⚠️  Issue **HIGH severity** violation for missing `repo_content_type`
- ⏭️  Skip other checks (can't determine if infra required)

---

## Migration Guide

### Step 1: Classify Your Repositories

Review each repository and determine content type:

```bash
# List all repos
gh repo list your-org --limit 1000 --json name,description

# Classify:
# - Has infra/, terraform/, ansible/ → infra (or both if also has app/)
# - Only has src/, app/, frontend/ → app
# - Has both → both
```

### Step 2: Set Properties in Bulk

Create a CSV file `repo-classifications.csv`:
```csv
repo,type1,type2
customer-monorepo,app,infra
terraform-modules,infra,
frontend-app,app,
backend-api,app,
ansible-playbooks,infra,
```

Script to apply:
```bash
#!/bin/bash
while IFS=, read -r repo type1 type2; do
  if [ "$repo" = "repo" ]; then continue; fi  # Skip header
  
  cmd="gh api repos/your-org/$repo/properties/values -X PUT"
  cmd="$cmd -f properties[][property_name]='repo_content_type'"
  cmd="$cmd -f properties[][value][]='$type1'"
  
  if [ -n "$type2" ]; then
    cmd="$cmd -f properties[][value][]='$type2'"
  fi
  
  eval "$cmd"
  echo "✅ Set $repo: $type1${type2:+, $type2}"
done < repo-classifications.csv
```

### Step 3: Run Compliance Scan

```bash
# Test with limited repos first
gh workflow run property-compliance.yml \
  --repo your-org/manager-repo \
  -f test_mode=10

# Review results
gh run list --workflow=property-compliance.yml --limit 1

# Fix any violations
# ...

# Run full scan
gh workflow run property-compliance.yml
```

### Step 4: Update Existing Properties

For repos with `infra` content that were missing infrastructure properties:

```bash
# Example: Set infrastructure_tools for infra repos
gh api repos/your-org/terraform-modules/properties/values -X PUT \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform'

gh api repos/your-org/terraform-modules/properties/values -X PUT \
  -f properties[][property_name]='customer_tier' \
  -f properties[][value]='professional'
```

---

## Querying by Content Type

### Find All Infrastructure Repos

```bash
# Using gh CLI
gh api graphql -f query='
{
  organization(login: "your-org") {
    repositories(first: 100) {
      nodes {
        name
        customProperties {
          property_name
          value
        }
      }
    }
  }
}' | jq '.data.organization.repositories.nodes[] | 
  select(.customProperties[] | 
    select(.property_name=="repo_content_type" and 
      (.value | contains("infra"))))
  | .name'
```

### Find App-Only Repos

```bash
# Find repos with ONLY app (not infra)
gh api graphql -f query='...' | jq '... | 
  select(.customProperties[] | 
    select(.property_name=="repo_content_type" and 
      .value==["app"]))
  | .name'
```

### Find Monorepos

```bash
# Repos with both app and infra
gh api graphql -f query='...' | jq '... | 
  select(.customProperties[] | 
    select(.property_name=="repo_content_type" and 
      (.value | length == 2)))
  | .name'
```

---

## Best Practices

1. **Set content type on all repos** - Makes classification explicit
2. **Use `app` for non-infra code** - Even if it's a library or tool
3. **Use `infra` for any infrastructure** - Terraform, Ansible, K8s, etc.
4. **Use both for monorepos** - If repo has both app and infra code
5. **Update when repo changes** - If you add/remove infra, update property
6. **Document in README** - Note the content type in repo README
7. **Use in workflows** - Route jobs based on content type

---

## Troubleshooting

### Compliance scan fails on app-only repo

**Problem**: App-only repo flagged for missing `infrastructure_tools`

**Solution**: 
```bash
gh api repos/your-org/app-repo/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app'
```

Compliance scanner will then skip infrastructure checks.

### Monorepo not triggering infrastructure workflows

**Problem**: Repo has infra but workflows don't trigger

**Solution**: 
1. Check `repo_content_type` includes `infra`:
```bash
gh api repos/your-org/monorepo/properties/values | \
  jq '.[] | select(.property_name=="repo_content_type")'
```

2. Ensure `infrastructure_tools` is set:
```bash
gh api repos/your-org/monorepo/properties/values -X PUT \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform'
```

### Can't decide between app and infra

**Guidelines**:
- **Dockerfiles only** → `app` (containerization is part of app deployment)
- **CI/CD configs only** → `app` (workflow automation)
- **Terraform/Ansible/K8s** → `infra` (actual infrastructure)
- **Both above** → `["app", "infra"]`

---

## Related Documentation

- [CUSTOM-PROPERTIES.md](../CUSTOM-PROPERTIES.md) - Full properties guide
- [COMPLIANCE.md](../COMPLIANCE.md) - Compliance scanning
- [set-repo-content-types.sh](set-repo-content-types.sh) - Bulk setting script

