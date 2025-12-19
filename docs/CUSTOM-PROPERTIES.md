# GitHub Custom Properties for Infrastructure Management

This document explains how to use GitHub Custom Properties to control infrastructure tool provisioning and behavior.

## Overview

GitHub Custom Properties act as metadata tags on repositories, similar to AWS resource tags. In this system, they enable **customer self-service infrastructure configuration** by declaring which tools and configurations the service provider should provision.

## Mental Model

```
AWS Tags              GitHub Custom Properties
---------             ------------------------
Key: Environment      Property: infrastructure_tools
Value: production     Value: ["terraform", "ansible"]

Purpose: Organize     Purpose: Control behavior
         & filter              & automation
```

## Benefits

✅ **Customer Self-Service** - Customers control their infrastructure without service provider intervention  
✅ **Declarative** - Simple YAML-like configuration via GitHub UI or API  
✅ **Auditable** - Changes tracked in organization audit log  
✅ **Enforceable** - Can be required via rulesets  
✅ **Queryable** - Easy to find all repos with specific properties  
✅ **Type-Safe** - Schema enforced at organization level

---

## Property Schema

### Organization-Level Configuration

These properties should be configured at the **GitHub Organization level** (only org owners can do this):

Go to: `Organization Settings → Repository Custom Properties`

### Core Infrastructure Properties

#### `infrastructure_tools` (Multi-Select) **[REQUIRED]**

**Purpose**: Declares which infrastructure tools the customer wants enabled  
**Type**: Multi-select  
**Allowed Values**: `terraform`, `ansible`, `pulumi`, `cloudformation`, `crossplane`  
**Default**: `[]` (empty - no tools enabled)

```yaml
# Example
infrastructure_tools: ["terraform", "ansible"]
```

**Behavior**:
- Empty array = No infrastructure provisioning
- `terraform` = Spacelift stack created for Terraform
- `ansible` = Spacelift stack created for Ansible
- Multiple values = Multiple stacks provisioned

---

#### `spacelift_auto_deploy` (Boolean)

**Purpose**: Enable automatic deployment on main branch merge  
**Type**: Boolean  
**Default**: `false`

```yaml
spacelift_auto_deploy: true
```

**Behavior**:
- `true` = Spacelift automatically applies approved plans on main
- `false` = Manual approval required for all deployments

---

#### `infrastructure_approval_required` (Boolean)

**Purpose**: Require manual approval for infrastructure changes  
**Type**: Boolean  
**Default**: `true`

```yaml
infrastructure_approval_required: true
```

**Behavior**:
- `true` = Service provider must approve before apply
- `false` = Automatic apply (use with caution)

---

#### `terraform_version` (Single-Select)

**Purpose**: Specify Terraform version for Spacelift stack  
**Type**: Single-select  
**Allowed Values**: `1.5`, `1.6`, `1.7`, `1.8`, `latest`  
**Default**: `latest`

```yaml
terraform_version: "1.6"
```

**Behavior**: Spacelift will use this Terraform version

---

#### `spacelift_stack_name` (String)

**Purpose**: Custom name for Spacelift stack  
**Type**: String  
**Default**: Auto-generated from repo name and branch

```yaml
spacelift_stack_name: "customer-app-prod"
```

**Behavior**: If empty, auto-generates: `{repo-name}-{branch}`

---

#### `ansible_inventory_path` (String)

**Purpose**: Path to Ansible inventory in the repository  
**Type**: String  
**Default**: `inventory/`

```yaml
ansible_inventory_path: "ansible/inventory/"
```

**Behavior**: Spacelift Ansible stack will use this path

---

### Repository Classification Properties

#### `repo_content_type` (Multi-Select) **RECOMMENDED**

**Purpose**: Identify what content the repository manages  
**Type**: Multi-select  
**Allowed Values**: `app`, `infra`  
**Default**: None (must be set)

```yaml
repo_content_type: ["app", "infra"]  # Monorepo
repo_content_type: ["infra"]         # Infrastructure-only
repo_content_type: ["app"]           # Application-only (no infra)
```

**Behavior**:
- **`infra`** - Repository contains infrastructure code (triggers infrastructure deployments)
- **`app`** - Repository contains application code
- **Both** - Monorepo with both app and infrastructure

**Why This Matters**:
- ✅ Compliance scanner can skip non-infra repos
- ✅ Better filtering and reporting
- ✅ Identifies monorepos vs single-purpose repos
- ✅ Helps route workflows correctly

**Examples**:
```yaml
# Monorepo (like source_monorepo)
repo_content_type: ["app", "infra"]

# Infrastructure-only repo (like source_infra_repo)
repo_content_type: ["infra"]

# App-only repo (like source_app_repo)
repo_content_type: ["app"]

# Frontend app with no infrastructure
repo_content_type: ["app"]
```

---

### Optional: Customer Metadata Properties

#### `customer_tier` (Single-Select)

**Purpose**: Customer subscription tier (affects SLA and approval speed)  
**Type**: Single-select  
**Allowed Values**: `free`, `startup`, `professional`, `enterprise`

```yaml
customer_tier: "enterprise"
```

**Behavior**:
- `enterprise` = Fast-track approvals, priority support
- Others = Standard approval process

---

#### `customer_id` (String)

**Purpose**: Unique customer identifier for billing/tracking  
**Type**: String

```yaml
customer_id: "cust_abc123"
```

---

#### `billing_account` (String)

**Purpose**: Associated billing account for cost allocation  
**Type**: String

```yaml
billing_account: "billing-prod-001"
```

---

#### `region_restriction` (Single-Select)

**Purpose**: Geographic deployment restrictions  
**Type**: Single-select  
**Allowed Values**: `us-only`, `eu-only`, `apac-only`, `global`

```yaml
region_restriction: "eu-only"
```

---

## Setting Custom Properties

### Via GitHub Web UI (Easiest for Customers)

1. Go to repository: `Settings → General`
2. Scroll to "Custom properties" section
3. Set values for available properties
4. Click "Save changes"

**Note**: Only properties defined at the organization level will be available.

### Via GitHub API

```bash
# Set custom properties for a repository
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  repos/OWNER/REPO/properties/values \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform' \
  -f properties[][value][]='ansible' \
  -f properties[][property_name]='terraform_version' \
  -f properties[][value]='1.6'
```

### Via Terraform (For Service Providers)

```hcl
# Set custom properties on customer repos
resource "github_repository_custom_properties" "customer_repo" {
  repository = "customer-app"
  
  custom_properties {
    property_name = "infrastructure_tools"
    value         = ["terraform", "ansible"]
  }
  
  custom_properties {
    property_name = "terraform_version"
    value         = "1.6"
  }
  
  custom_properties {
    property_name = "customer_tier"
    value         = "enterprise"
  }
}
```

---

## How It Works: End-to-End Flow

### Step 1: Customer Sets Properties

Customer repo owner sets custom properties:

```yaml
infrastructure_tools: ["terraform"]
terraform_version: "1.6"
spacelift_auto_deploy: false
infrastructure_approval_required: true
```

### Step 2: Customer Makes Infrastructure Change

```bash
cd infra/
vim variables.yml  # Edit infrastructure requirements
git commit -am "infra: increase instance count"
git push
```

### Step 3: Trigger Workflow Reads Properties

`source_repo/.github/workflows/trigger-infra.yml` automatically:

1. Fetches custom properties via GitHub API
2. Packages them into JSON payload
3. Sends to manager repo

```javascript
// Automatic in workflow
const { data: props } = await github.rest.repos.getCustomPropertiesValues({
  owner: context.repo.owner,
  repo: context.repo.repo
});
```

### Step 4: Manager Repo Provisions Tools

`manager_repo/.github/workflows/infra-deploy.yml` automatically:

1. Parses infrastructure properties
2. Creates/updates Spacelift stack for Terraform
3. Configures approval policies
4. Posts status back to customer repo

```yaml
# Automatic - service provider workflow
- If terraform in tools → Create Spacelift Terraform stack
- If ansible in tools → Create Spacelift Ansible stack
- If approval_required → Attach approval policy
- Post status → Customer sees: "infra/spacelift-setup ✅"
```

### Step 5: Customer Workflow Waits for Setup

Customer workflow blocks until infrastructure setup completes:

```yaml
# In customer repo - blocks other workflows
wait-for-infrastructure-setup:
  needs: trigger-manager
  timeout-minutes: 30
  # Polls for "infra/spacelift-setup" status
  # Only proceeds when ✅ success
```

### Step 6: Other Workflows Proceed

Once infrastructure setup is complete, customer's other workflows can run:

```yaml
# Customer's app deployment workflow
deploy-app:
  needs: infrastructure-setup-status  # ← Blocks until infra ready
  runs-on: ubuntu-latest
  steps:
    - name: Deploy Application
      run: ./deploy.sh
```

---

## Common Patterns

### Pattern 1: Terraform Only (Most Common)

```yaml
infrastructure_tools: ["terraform"]
terraform_version: "1.6"
spacelift_auto_deploy: false
infrastructure_approval_required: true
```

**Result**: Spacelift Terraform stack with manual approval

---

### Pattern 2: Terraform + Ansible

```yaml
infrastructure_tools: ["terraform", "ansible"]
terraform_version: "1.6"
ansible_inventory_path: "inventory/"
spacelift_auto_deploy: false
```

**Result**: Two Spacelift stacks (Terraform + Ansible), both with approval

---

### Pattern 3: Enterprise Fast-Track

```yaml
infrastructure_tools: ["terraform"]
terraform_version: "latest"
spacelift_auto_deploy: true
infrastructure_approval_required: false
customer_tier: "enterprise"
```

**Result**: Fully automated deployments (enterprise only)

---

### Pattern 4: Multi-Tool with Restrictions

```yaml
infrastructure_tools: ["terraform", "pulumi"]
terraform_version: "1.6"
region_restriction: "eu-only"
customer_tier: "professional"
```

**Result**: Multiple IaC tools with geographic restrictions

---

## Querying Repositories by Properties

### Via GitHub CLI

```bash
# Find all repos with Terraform enabled
gh api graphql -f query='
{
  organization(login: "your-org") {
    repositories(first: 100) {
      nodes {
        name
        customProperties {
          property {
            name
          }
          value
        }
      }
    }
  }
}'

# Filter for specific property value
gh repo list your-org --json name,customProperties --jq \
  '.[] | select(.customProperties.infrastructure_tools | contains(["terraform"]))'
```

### Via GitHub API

```bash
# Get custom properties for a specific repo
gh api repos/OWNER/REPO/properties/values

# List all repos and their properties
gh api orgs/ORG/properties/values
```

---

## Service Provider Operations

### Discovering Managed Customers

Service providers can automatically discover all customer repos with infrastructure enabled:

```yaml
# manager_repo/.github/workflows/discover-customers.yml
- name: Find Managed Repositories
  run: |
    gh api orgs/${{ github.repository_owner }}/properties/values \
      --jq '.[] | select(.property_values[] | 
        select(.property_name == "infrastructure_tools" and 
               (.value | length > 0)))' \
      > managed-repos.json
```

### Bulk Operations

```bash
# Set property on multiple repos
for repo in customer-a customer-b customer-c; do
  gh api -X PUT repos/your-org/$repo/properties/values \
    -f properties[][property_name]='terraform_version' \
    -f properties[][value]='1.7'
done
```

### Customer Onboarding Script

```bash
#!/bin/bash
# onboard-customer.sh

REPO=$1
TIER=$2

gh api -X PUT repos/your-org/$REPO/properties/values \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform' \
  -f properties[][property_name]='customer_tier' \
  -f properties[][value]="$TIER" \
  -f properties[][property_name]='infrastructure_approval_required' \
  -f properties[][value]=true

echo "✅ Onboarded $REPO with tier: $TIER"
```

---

## Troubleshooting

### Issue: Properties Not Showing in UI

**Cause**: Properties must be defined at organization level first

**Solution**:
1. Go to Organization Settings → Repository Custom Properties
2. Create property definitions
3. Then set values on individual repos

---

### Issue: Workflow Can't Read Properties

**Cause**: GitHub token lacks permissions

**Solution**: Ensure `GITHUB_TOKEN` has `repository:read` and `metadata:read` permissions

---

### Issue: Property Changes Not Triggering Workflow

**Cause**: Custom property changes don't trigger workflows by default

**Solution**: Customer must commit a change to `infra/` directory to trigger workflow

---

### Issue: Wrong Property Type

**Cause**: API expects array but received string

**Solution**: Wrap single values in array for multi-select properties:
```javascript
// Wrong
infrastructure_tools: "terraform"

// Correct
infrastructure_tools: ["terraform"]
```

---

## Best Practices

### For Customers

✅ **DO:**
- Start with minimal tools (`terraform` only)
- Test in staging before enabling in production
- Use `infrastructure_approval_required: true` initially
- Document why you enabled each tool

❌ **DON'T:**
- Don't enable `spacelift_auto_deploy` without thorough testing
- Don't set `infrastructure_approval_required: false` in production
- Don't enable tools you're not actively using

### For Service Providers

✅ **DO:**
- Define clear property schemas with validation
- Document all properties for customers
- Monitor property changes in audit logs
- Provide templates for common configurations
- Set sensible defaults

❌ **DON'T:**
- Don't allow unlimited tool combinations without testing
- Don't skip approval gates for production
- Don't change property schemas without customer notice

---

## Security Considerations

### Access Control

- Only repository admins can set custom properties
- Organization owners define available properties
- Use GitHub Rulesets to require specific properties

### Audit Trail

All custom property changes are logged:
```bash
# View audit log for property changes
gh api orgs/YOUR-ORG/audit-log \
  --jq '.[] | select(.action | contains("repo.custom_property"))'
```

### Validation

Use GitHub Rulesets to enforce:
- Required properties before merges
- Allowed property values
- Property combinations

---

## Examples

See [docs/examples/custom-properties/](../examples/custom-properties/) for:
- Complete property schemas
- Customer onboarding examples
- Service provider automation scripts
- Common configuration templates

---

## Next Steps

1. **Service Providers**: Define organization-level custom properties
2. **Customers**: Set properties on your repositories
3. **Test**: Make an infrastructure change and watch automatic provisioning
4. **Scale**: Roll out to more repos and tools

For questions, see [QUICK-REFERENCE.md](QUICK-REFERENCE.md) or contact your service provider.

