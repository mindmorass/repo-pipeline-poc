# Example: Terraform Only Configuration

This is the most common pattern - customer wants Terraform infrastructure management via Spacelift.

## Custom Properties Configuration

### Via GitHub UI

Repository Settings → Custom Properties:

```
infrastructure_tools: terraform
terraform_version: 1.6
spacelift_auto_deploy: false
infrastructure_approval_required: true
customer_tier: professional
```

### Via GitHub CLI

```bash
gh api -X PUT repos/your-org/customer-app/properties/values \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform' \
  -f properties[][property_name]='terraform_version' \
  -f properties[][value]='1.6' \
  -f properties[][property_name]='spacelift_auto_deploy' \
  -f properties[][value]=false \
  -f properties[][property_name]='infrastructure_approval_required' \
  -f properties[][value]=true
```

## Expected Behavior

### On Infrastructure Change

1. Customer edits `infra/variables.yml`
2. Commits and pushes to branch
3. Creates PR

### Automatic Actions

```
source_repo/.github/workflows/trigger-infra.yml
  ↓ Fetches custom properties
  ↓ Sends to manager repo

manager_repo/.github/workflows/infra-deploy.yml
  ↓ Creates Spacelift Terraform stack
  ↓ Configures approval policy
  ↓ Posts status: infra/spacelift-setup ✅

source_repo workflow
  ↓ Waits for setup completion
  ↓ Unblocks other workflows
```

### PR Comments

Customer will see:

```markdown
🚀 **Infrastructure Deployment Triggered**

**Enabled Tools:**
- `terraform`

**Configuration:**
- Spacelift Auto-Deploy: ❌
- Terraform Version: `1.6`
- Approval Required: ✅
- Stack Name: `customer-app-main`

Monitor progress: https://github.com/service-provider/infrastructure-manager/actions
```

And:

```markdown
## 🚀 Infrastructure Setup Complete

**Configured Tools:**
✅ Terraform via Spacelift

[View setup details](...)
```

### Commit Statuses

Customer repo commit will show:
- `infra/spacelift-setup` ✅ Spacelift Terraform stack ready
- `infrastructure-setup-status` ✅ Infrastructure setup complete

## Repository Structure

```
customer-app/
├── .github/
│   └── workflows/
│       ├── trigger-infra.yml  # From service provider template
│       └── deploy-app.yml     # Customer's app deployment
├── app/
│   └── src/
│       └── ... (customer code)
├── infra/
│   ├── variables.yml          # Terraform variables
│   └── README.md
└── README.md
```

## Spacelift Stack Configuration

Service provider creates:

```yaml
Stack Name: customer-app-main
Repository: customer-org/customer-app
Branch: main
Project Root: infra/
Terraform Version: 1.6
Auto-deploy: false
Labels:
  - managed-by:infrastructure-manager
  - customer:customer-app
  - environment:production
  - tool:terraform
```

## Next Steps for Customer

1. ✅ Custom properties configured
2. ✅ Trigger workflow added to repo
3. ✅ `infra/variables.yml` created
4. → Make infrastructure change
5. → Watch automatic Spacelift provisioning
6. → Approve and merge PR
7. → Infrastructure deployed!

