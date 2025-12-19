# Quick Reference Card

## For Customers

### Making Infrastructure Changes

```bash
# In your repository
cd infra

# Edit your infrastructure requirements
vim variables.yml

# Commit and push (automatically triggers service provider)
git add variables.yml
git commit -m "infra: update instance types for staging"
git push
```

### Checking Your Deployment Status

```bash
# View your workflow runs
gh run list --workflow="Trigger Infrastructure Deployment"

# Watch realtime (in your repo)
gh run watch

# Check service provider deployment (if you have access)
gh run list --repo <service-provider-org>/<manager-repo>
```

### Creating Infrastructure Change PR

```bash
# Create branch for infrastructure change
git checkout -b infra/add-production-scaling

# Update your requirements
echo "max_instances: 20" >> infra/variables.yml

# Commit and push
git add infra/variables.yml
git commit -m "infra: increase production scaling capacity"
git push -u origin infra/add-production-scaling

# Create PR - Terraform plan will be commented automatically
gh pr create --title "Increase production capacity" --body "Scaling for traffic growth"
```

---

## For Service Providers

### Monitoring Customer Deployments

```bash
# View all deployment runs
gh run list --repo <your-org>/manager-repo --workflow="Infrastructure Deployment"

# Filter by customer
gh run list --repo <your-org>/manager-repo | grep "customer-name"

# View specific deployment
gh run view <run-id> --repo <your-org>/manager-repo

# Watch logs in real-time
gh run watch --repo <your-org>/manager-repo
```

### Manual Trigger for Customer (Emergency)

```bash
# Manually trigger deployment for a customer
gh workflow run infra-deploy.yml \
  --repo <your-org>/manager-repo \
  --ref main \
  -f source_repo=customer-repo-name \
  -f source_owner=customer-org \
  -f source_ref=refs/heads/main \
  -f source_sha=<commit-sha> \
  -f environment=production \
  -f infra_path=infra \
  -f triggered_by=service-provider-ops \
  -f run_id=manual-override
```

### Customer Onboarding Quick Check

```bash
# Verify access to customer repo
gh repo view <customer-org>/<customer-repo> --json name

# Test fetch customer variables
gh api repos/<customer-org>/<customer-repo>/contents/infra/variables.yml \
  --jq '.content' | base64 -d

# Initialize Terraform for new customer
cd manager_repo/terraform
terraform init \
  -backend-config="bucket=service-provider-terraform-state" \
  -backend-config="key=<customer-repo>/staging/terraform.tfstate"
```

---

## Variables Structure (For Customers)

```yaml
# infra/variables.yml - Customer infrastructure requirements
project_name: my-application
cloud_provider: aws

environments:
  staging:
    region: us-east-1
    instance_type: t3.micro
    min_instances: 1
    max_instances: 2
    
  production:
    region: us-west-2
    instance_type: t3.small
    min_instances: 2
    max_instances: 10

networking:
  vpc_cidr: "10.0.0.0/16"
  availability_zones: 2

tags:
  customer: my-company
  project: my-project
  cost_center: engineering
```

---

## Configuration Checklist

### Customer Repository Setup
**Secrets:**
- [ ] `MANAGER_REPO_PAT` (triggers service provider)

**Variables:**
- [ ] `MANAGER_REPO_OWNER` (service provider org/user)
- [ ] `MANAGER_REPO_NAME` (service provider manager repo)

**Files:**
- [ ] `.github/workflows/trigger-infra.yml` (trigger workflow)
- [ ] `infra/variables.yml` (infrastructure requirements)

### Service Provider Manager Repo
**Secrets:**
- [ ] `AWS_ACCESS_KEY_ID` (service provider AWS credentials)
- [ ] `AWS_SECRET_ACCESS_KEY` (service provider AWS credentials)
- [ ] `SOURCE_REPOS_PAT` (access all customer repos)

**Variables:**
- [ ] `TF_STATE_BUCKET` (service provider state bucket)

**Environments:**
- [ ] `staging-plan` (no approval)
- [ ] `staging-apply` (no approval)
- [ ] `production-plan` (no approval)
- [ ] `production-apply` (requires service provider approval)

---

## Common Issues & Solutions

### Issue: Customer workflow not triggering

**Customer Checks:**
```bash
# Verify changes are in infra/ directory
git log --oneline --name-only

# Check secrets are configured
# Go to: Settings → Secrets → MANAGER_REPO_PAT

# Verify variables are set
# Go to: Settings → Variables → MANAGER_REPO_OWNER, MANAGER_REPO_NAME
```

**Service Provider Checks:**
```bash
# Check if trigger was received
gh run list --repo <your-org>/manager-repo --limit 20

# Verify SOURCE_REPOS_PAT has access to customer repo
gh repo view <customer-org>/<customer-repo>
```

### Issue: Service provider can't fetch customer variables

**Service Provider Actions:**
```bash
# Test PAT access
gh auth status

# Test direct API access to customer repo
gh api repos/<customer-org>/<customer-repo>/contents/infra/variables.yml

# Check PAT scopes (must include 'repo')
# Settings → Developer settings → Personal access tokens

# For organization customers, check:
# Organization → Settings → Third-party application access policy
```

### Issue: Terraform plan fails

**Service Provider Checks:**
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check state bucket exists
aws s3 ls s3://service-provider-terraform-state/

# Verify customer variables are valid YAML
cd /tmp
gh api repos/<customer-org>/<customer-repo>/contents/infra/variables.yml \
  --jq '.content' | base64 -d | yamllint -
```

### Issue: State lock error

**Service Provider Actions:**
```bash
# Check if another deployment is running for this customer
gh run list --repo <your-org>/manager-repo | grep "<customer-repo>"

# List current locks (if using DynamoDB)
aws dynamodb scan --table-name terraform-state-locks \
  --filter-expression "contains(LockID, :customer)" \
  --expression-attribute-values '{":customer":{"S":"<customer-repo>"}}'

# Manual unlock (CAREFUL - only if deployment is truly stuck)
cd manager_repo/terraform
terraform init \
  -backend-config="bucket=service-provider-terraform-state" \
  -backend-config="key=<customer-repo>/<env>/terraform.tfstate"
terraform force-unlock <lock-id>
```

---

## Deployment Flow

### Customer Pull Request Flow
```
Customer: edit infra/variables.yml
  ↓
Customer: create PR
  ↓
Customer workflow: trigger-infra.yml runs
  ↓
Service Provider: infra-deploy.yml triggered
  ↓
Service Provider: Terraform plan generated
  ↓
Service Provider: plan commented on customer PR ← CUSTOMER REVIEWS
  ↓
Customer: approves & merges PR
  ↓
Service Provider: Terraform apply runs (if production, requires SP approval)
  ↓
Customer: receives deployment status
```

### Customer Main Branch Flow
```
Customer: push to main with infra/ changes
  ↓
Customer workflow: trigger-infra.yml runs
  ↓
Service Provider: infra-deploy.yml triggered
  ↓
Service Provider: Terraform plan generated
  ↓
Service Provider: Terraform apply runs
  ↓
Customer: receives success/failure status
```

---

## Terraform State Organization

```
s3://service-provider-terraform-state/
  ├── customer-a-repo/
  │   ├── staging/
  │   │   └── terraform.tfstate
  │   └── production/
  │       └── terraform.tfstate
  ├── customer-b-repo/
  │   └── production/
  │       └── terraform.tfstate
  └── customer-c-monorepo/
      ├── staging/
      └── production/
```

---

## Emergency Procedures

### Customer: Rollback Infrastructure

1. Find previous working deployment:
   ```bash
   gh run list --workflow="Trigger Infrastructure Deployment" --status=success --limit 5
   ```

2. Get the commit SHA from that run

3. Revert `infra/` directory:
   ```bash
   git checkout <working-commit-sha> -- infra/
   git commit -m "infra: rollback to working state <commit-sha>"
   git push
   ```

4. Monitor service provider deployment

### Customer: Disable Auto-Deployment

Temporarily disable infrastructure deployments:

```bash
# Option 1: Disable workflow in GitHub UI
# Settings → Actions → Workflows → trigger-infra.yml → Disable

# Option 2: Comment out trigger in workflow file
# Edit .github/workflows/trigger-infra.yml
# Comment out the 'on:' section
```

### Service Provider: Emergency Customer Deployment Pause

```bash
# Option 1: Cancel running deployment
gh run cancel <run-id> --repo <your-org>/manager-repo

# Option 2: Disable workflow temporarily
gh workflow disable infra-deploy.yml --repo <your-org>/manager-repo

# Option 3: Add environment protection (requires approval for all)
# Settings → Environments → staging-apply → Add required reviewers
```

---

## Monitoring & Observability

### Customer Monitoring
```bash
# View your deployment history
gh run list --workflow="Trigger Infrastructure Deployment"

# Check current infrastructure status (ask service provider for access)
# Or rely on commit statuses in your repo
```

### Service Provider Monitoring
```bash
# All customer deployments
gh run list --repo <your-org>/manager-repo --workflow="Infrastructure Deployment"

# Failed deployments
gh run list --repo <your-org>/manager-repo --status=failure

# View Terraform state for customer
aws s3 cp s3://service-provider-terraform-state/<customer-repo>/production/terraform.tfstate - | \
  terraform show -json - | jq

# Audit all state access
aws s3api get-bucket-logging --bucket service-provider-terraform-state
```

---

## Best Practices

### For Customers

✅ **DO:**
- Test changes in staging before production
- Review Terraform plans in PR comments carefully
- Use descriptive commit messages for infra changes
- Document custom variables in your infra/README.md
- Coordinate large infrastructure changes with service provider

❌ **DON'T:**
- Don't commit secrets or credentials to variables.yml
- Don't bypass PR reviews for infrastructure changes
- Don't manually modify AWS resources (always use variables.yml)
- Don't merge PRs without reviewing Terraform plan

### For Service Providers

✅ **DO:**
- Monitor all customer deployments actively
- Respond to customer deployment failures quickly
- Maintain backward compatibility in infrastructure modules
- Document variable schema changes for customers
- Set up alerting for deployment failures
- Rotate PATs regularly
- Audit customer state access

❌ **DON'T:**
- Don't modify customer state files manually
- Don't share customer infrastructure details between customers
- Don't deploy to production without approval gates
- Don't make breaking changes to variable schema without notice

---

## Getting Help

### For Customers
1. Check your workflow logs first
2. Review commit status details
3. Look for Terraform plan comments on PRs
4. Contact service provider support (see service provider's contact info)
5. Review [SETUP.md](SETUP.md) documentation

### For Service Providers
1. Check manager repo workflow logs
2. Review customer repository structure
3. Verify PAT permissions and expiration
4. Check [ARCHITECTURE.md](ARCHITECTURE.md) for design details
5. Review Terraform state and logs

