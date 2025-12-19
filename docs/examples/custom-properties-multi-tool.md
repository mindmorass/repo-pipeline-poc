# Example: Multi-Tool Configuration (Terraform + Ansible)

Advanced pattern - customer wants both Terraform (infrastructure) and Ansible (configuration management).

## Custom Properties Configuration

### Via GitHub UI

Repository Settings → Custom Properties:

```
infrastructure_tools: terraform, ansible
terraform_version: 1.6
ansible_inventory_path: ansible/inventory/
spacelift_auto_deploy: false
infrastructure_approval_required: true
customer_tier: enterprise
```

### Via GitHub CLI

```bash
gh api -X PUT repos/your-org/customer-enterprise-app/properties/values \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform' \
  -f properties[][value][]='ansible' \
  -f properties[][property_name]='terraform_version' \
  -f properties[][value]='1.6' \
  -f properties[][property_name]='ansible_inventory_path' \
  -f properties[][value]='ansible/inventory/' \
  -f properties[][property_name]='spacelift_auto_deploy' \
  -f properties[][value]=false \
  -f properties[][property_name]='infrastructure_approval_required' \
  -f properties[][value]=true \
  -f properties[][property_name]='customer_tier' \
  -f properties[][value]='enterprise'
```

## Expected Behavior

### On Infrastructure Change

Customer makes changes to either:
- `infra/variables.yml` (Terraform)
- `ansible/playbooks/*.yml` (Ansible)

### Automatic Actions

```
source_repo/.github/workflows/trigger-infra.yml
  ↓ Fetches custom properties
  ↓ Detects: ["terraform", "ansible"]
  ↓ Sends to manager repo

manager_repo/.github/workflows/infra-deploy.yml
  ┌─→ Creates Spacelift Terraform stack
  │   └─ Configures approval policy
  │   └─ Posts status: infra/spacelift-setup ✅
  │
  └─→ Creates Spacelift Ansible stack
      └─ Configures inventory path
      └─ Posts status: infra/ansible-setup ✅

source_repo workflow
  ↓ Waits for BOTH setups
  ↓ Unblocks when all complete
```

### PR Comments

```markdown
🚀 **Infrastructure Deployment Triggered**

**Enabled Tools:**
- `terraform`
- `ansible`

**Configuration:**
- Spacelift Auto-Deploy: ❌
- Terraform Version: `1.6`
- Approval Required: ✅
- Stack Name: `customer-enterprise-app-main`

Monitor progress: https://github.com/service-provider/infrastructure-manager/actions
```

And:

```markdown
## 🚀 Infrastructure Setup Complete

**Configured Tools:**
✅ Terraform via Spacelift
✅ Ansible via Spacelift

[View setup details](...)
```

### Commit Statuses

Customer repo commit shows BOTH:
- `infra/spacelift-setup` ✅ Spacelift Terraform stack ready
- `infra/ansible-setup` ✅ Spacelift Ansible stack ready
- `infrastructure-setup-status` ✅ Infrastructure setup complete

## Repository Structure

```
customer-enterprise-app/
├── .github/
│   └── workflows/
│       ├── trigger-infra.yml  # Triggers on infra/** OR ansible/**
│       └── deploy-app.yml
├── app/
│   └── src/
│       └── ... (customer code)
├── infra/
│   ├── variables.yml          # Terraform variables
│   └── README.md
├── ansible/
│   ├── inventory/
│   │   ├── production.yml
│   │   └── staging.yml
│   ├── playbooks/
│   │   ├── configure-servers.yml
│   │   └── deploy-app.yml
│   └── roles/
│       └── ...
└── README.md
```

## Updated Trigger Workflow

Customer needs to update trigger workflow to watch Ansible path:

```yaml
# .github/workflows/trigger-infra.yml
on:
  push:
    branches:
      - main
      - develop
    paths:
      - "infra/**"
      - "ansible/**"  # ← Add this
  pull_request:
    branches:
      - main
      - develop
    paths:
      - "infra/**"
      - "ansible/**"  # ← Add this
```

## Spacelift Stacks Created

### Terraform Stack

```yaml
Stack Name: customer-enterprise-app-main
Repository: customer-org/customer-enterprise-app
Branch: main
Project Root: infra/
Type: Terraform
Version: 1.6
Auto-deploy: false
Labels:
  - managed-by:infrastructure-manager
  - customer:customer-enterprise-app
  - tool:terraform
```

### Ansible Stack

```yaml
Stack Name: customer-enterprise-app-main-ansible
Repository: customer-org/customer-enterprise-app
Branch: main
Project Root: ansible/
Type: Ansible
Inventory Path: ansible/inventory/
Auto-deploy: false
Labels:
  - managed-by:infrastructure-manager
  - customer:customer-enterprise-app
  - tool:ansible
```

## Deployment Flow

### Phase 1: Infrastructure (Terraform)

1. Spacelift Terraform stack runs
2. Provisions AWS infrastructure
3. Outputs server IPs/endpoints

### Phase 2: Configuration (Ansible)

1. Spacelift Ansible stack runs
2. Uses Terraform outputs as inventory
3. Configures servers
4. Deploys application

Both stacks can be managed independently or orchestrated together!

## Enterprise Benefits

With `customer_tier: enterprise`:
- Priority support from service provider
- Faster approval times
- Dedicated Slack channel
- Custom SLA (99.9% uptime)

## Cost Considerations

Multiple tools = multiple Spacelift stacks = higher costs.

Service provider typically charges:
- Base fee per repository
- Per-tool fee (e.g., $50/month per tool)
- Usage-based (Spacelift run minutes)

Example:
- Terraform only: $100/month
- Terraform + Ansible: $150/month
- Enterprise support: +$200/month

