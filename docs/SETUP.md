# Setup Guide

This guide walks you through setting up the managed infrastructure service pattern.

## Roles

- **Service Provider**: Manages the manager repository and provides infrastructure services
- **Customer**: Owns their application repositories and provides infrastructure requirements via variables

---

## Part 1: Service Provider Setup

### Prerequisites
- GitHub organization or account for service provider
- AWS account (or other cloud provider) for service provider
- S3 bucket for Terraform state management
- GitHub Personal Access Token with appropriate scopes

### 1.1 Create Service Provider Manager Repository

```bash
# Initialize manager repo
cd manager_repo
git init
git add .
git commit -m "Initial service provider infrastructure manager setup"
git remote add origin <service-provider-manager-repo-url>
git push -u origin main
```

### 1.2 Configure Manager Repo Secrets

Go to: `Settings → Secrets and variables → Actions → Secrets`

Add the following **Repository Secrets**:

| Secret Name | Description | Value |
|------------|-------------|-------|
| `AWS_ACCESS_KEY_ID` | Service provider AWS credentials | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Service provider AWS credentials | AWS secret key |
| `SOURCE_REPOS_PAT` | PAT to access customer repos | GitHub PAT with `repo` scope |

**Creating the PAT for SOURCE_REPOS_PAT:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with these scopes:
   - `repo` (full control) - to read customer repo variables and post statuses
   - `workflow` (optional) - if service provider needs to trigger customer workflows
3. Copy the token immediately and store securely
4. Note: This PAT will need read access to all customer repositories

### 1.3 Configure Manager Repo Variables

Go to: `Settings → Secrets and variables → Actions → Variables`

Add the following **Repository Variables**:

| Variable Name | Description | Value |
|--------------|-------------|-------|
| `TF_STATE_BUCKET` | Service provider S3 bucket for Terraform state | `service-provider-terraform-state` |

### 1.4 Create GitHub Environments

Go to: `Settings → Environments`

Create these environments with protection rules:

1. **staging-plan**
   - No protection rules needed
   - Used for staging environment planning

2. **staging-apply**
   - No protection rules (auto-apply on main for faster customer iteration)

3. **production-plan**
   - No protection rules needed

4. **production-apply**
   - ✅ Required reviewers (add service provider operations team)
   - ✅ Wait timer: 5 minutes (optional safety buffer)
   - Used to gate production deployments for all customers

### 1.5 Create S3 Bucket for State Management

```bash
# Create bucket with service provider naming
aws s3 mb s3://service-provider-terraform-state

# Enable versioning for state history
aws s3api put-bucket-versioning \
  --bucket service-provider-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption for security
aws s3api put-bucket-encryption \
  --bucket service-provider-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Optional: Enable bucket logging for audit trail
aws s3api put-bucket-logging \
  --bucket service-provider-terraform-state \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "service-provider-audit-logs",
      "TargetPrefix": "terraform-state-access/"
    }
  }'
```

### 1.6 Configure Customer Access

For the service provider's PAT to access customer repositories:

**Option A: Per-Repository Access (Fine-Grained PAT - Recommended)**
1. Use GitHub's fine-grained PATs
2. Grant access to specific customer repositories
3. Set expiration and rotate regularly

**Option B: Organization Access (Classic PAT)**
1. If customers are in the same organization, use organization-level PAT
2. Ensure organization allows PAT access
3. Document which customers are onboarded

### 1.7 Document Customer Onboarding Process

Create internal documentation for:
- How customers request infrastructure services
- Variable schema and requirements
- SLA for deployment response times
- Support channels for customers

---

## Part 2: Customer Onboarding

### Prerequisites (Customer Side)
- GitHub repository (new or existing)
- GitHub Personal Access Token to trigger service provider workflows
- Service provider account details (org/repo name)

### 2.1 Customer Repository Setup

```bash
# Customer initializes their repo (if new)
cd customer-repo
git init
git add .
git commit -m "Initial setup with infrastructure requirements"
git remote add origin <customer-repo-url>
git push -u origin main
```

### 2.2 Add Infrastructure Directory

Customers create an `infra/` directory with their requirements:

```bash
mkdir -p infra
```

### 2.3 Configure Customer Repo Secrets

Customer goes to: `Settings → Secrets and variables → Actions → Secrets`

Add the following **Repository Secret**:

| Secret Name | Description | Value |
|------------|-------------|-------|
| `MANAGER_REPO_PAT` | PAT to trigger service provider workflows | GitHub PAT with `repo` + `workflow` scopes |

**Creating the PAT for MANAGER_REPO_PAT:**
1. Customer goes to their GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with these scopes:
   - `repo` (full control)
   - `workflow` (update workflows)
3. Copy the token immediately
4. Note: This is customer-owned and grants service provider ability to receive triggers

### 2.4 Configure Customer Repo Variables

Customer goes to: `Settings → Secrets and variables → Actions → Variables`

Add the following **Repository Variables** (provided by service provider):

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `MANAGER_REPO_OWNER` | Service provider GitHub org/user | `service-provider-ops` |
| `MANAGER_REPO_NAME` | Service provider manager repo name | `infrastructure-manager` |

### 2.5 Customer Creates Variables File

Customer creates `infra/variables.yml` with their requirements:

```yaml
# Customer infrastructure requirements
project_name: customer-app-name
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
  customer: customer-name
  project: customer-project
  environment: "{{ environment }}"
```

### 2.6 Customer Adds Workflow

Copy the trigger workflow from `source_monorepo/.github/workflows/trigger-infra.yml` to customer repo.

---

## Part 3: Testing the Integration

### 3.1 Service Provider Verification

Service provider should verify:

```bash
# Check PAT has access to customer repo
gh repo view <customer-org>/<customer-repo> --json name

# Verify state bucket is accessible
aws s3 ls s3://service-provider-terraform-state/

# Test Terraform initialization
cd manager_repo/terraform
terraform init \
  -backend-config="bucket=service-provider-terraform-state" \
  -backend-config="key=test-customer/staging/terraform.tfstate"
```

### 3.2 Customer Test Deployment

Customer makes a test change:

```bash
cd customer-repo
echo "# Test infrastructure" >> infra/test.tf
git add infra/test.tf
git commit -m "test: trigger infrastructure deployment"
git push
```

### 3.3 Verify End-to-End Flow

1. **Customer Side**: Go to customer repo Actions tab
   - Should see "Trigger Infrastructure Deployment" workflow running
   - Verify it successfully triggers service provider

2. **Service Provider Side**: Go to manager repo Actions tab
   - Should see "Infrastructure Deployment" workflow running
   - Verify it fetches customer variables
   - Check Terraform plan is generated

3. **Customer Feedback**: Check customer repo
   - Should see commit status "infra/terraform-deploy"
   - Status should link to service provider workflow

### 3.4 Test PR Flow

Customer creates a PR:

```bash
cd customer-repo
git checkout -b test-infra-change
echo "test_variable: true" >> infra/variables.yml
git add infra/variables.yml
git commit -m "infra: test infrastructure change"
git push -u origin test-infra-change
```

1. Customer creates PR on GitHub
2. Wait for service provider workflow to run
3. Verify Terraform plan appears as comment on customer PR
4. Customer reviews and merges
5. Verify apply runs automatically

---

## Part 4: Production Readiness

### 4.1 Service Provider Hardening

- [ ] Set up monitoring for all customer deployments
- [ ] Configure alerting for deployment failures
- [ ] Document runbooks for common issues
- [ ] Set up backup for Terraform state bucket
- [ ] Configure DynamoDB for state locking
- [ ] Enable CloudTrail for audit logging
- [ ] Set up customer usage dashboards

### 4.2 Customer Communication

Service provider should provide customers with:

- [ ] Variables schema documentation
- [ ] Supported infrastructure patterns
- [ ] SLA commitments
- [ ] Support contact information
- [ ] Escalation procedures
- [ ] Cost transparency reports

### 4.3 Access Control Review

- [ ] Rotate all PATs on schedule
- [ ] Review customer access permissions
- [ ] Audit state bucket access logs
- [ ] Verify environment protection rules
- [ ] Test backup and recovery procedures

---

## Troubleshooting

### Issue: Service provider can't access customer repo

**Service Provider Actions:**
```bash
# Verify PAT permissions
gh auth status

# Test access to specific customer repo
gh repo view <customer-org>/<customer-repo>

# Check organization settings if applicable
# Settings → Third-party application access policy
```

### Issue: Customer workflow not triggering

**Customer Actions:**
- Verify `MANAGER_REPO_OWNER` and `MANAGER_REPO_NAME` variables are correct
- Check that changes are in `infra/` directory
- Verify `MANAGER_REPO_PAT` has correct scopes

**Service Provider Actions:**
- Check manager repo workflow logs for incoming triggers
- Verify `SOURCE_REPOS_PAT` is valid and not expired

### Issue: Terraform state conflicts

**Service Provider Actions:**
```bash
# Check for state locks
aws dynamodb scan --table-name terraform-state-locks

# Review state bucket structure
aws s3 ls s3://service-provider-terraform-state/ --recursive

# Verify per-customer isolation
aws s3 ls s3://service-provider-terraform-state/<customer-repo>/
```

---

## Security Best Practices

### For Service Providers

1. **Credential Management**
   - Rotate PATs every 90 days
   - Use AWS IAM roles where possible
   - Never commit credentials to repos

2. **Customer Isolation**
   - Separate Terraform state per customer
   - Use AWS resource tagging for cost allocation
   - Implement guardrails via Policy-as-Code

3. **Audit Trail**
   - Enable CloudTrail on all accounts
   - Log all state bucket access
   - Track customer deployment history

### For Customers

1. **Variable Security**
   - Never commit secrets to `variables.yml`
   - Use service provider's secret management
   - Review plans before merging PRs

2. **Access Control**
   - Limit who can approve infrastructure changes
   - Use branch protection on main branch
   - Require PR reviews for infra changes

---

## Next Steps

**For Service Providers:**
- [ ] Onboard additional customers
- [ ] Expand infrastructure module library
- [ ] Implement drift detection
- [ ] Add cost reporting per customer
- [ ] Create customer self-service portal

**For Customers:**
- [ ] Customize `infra/variables.yml` for your needs
- [ ] Set up branch protection rules
- [ ] Train team on infrastructure workflow
- [ ] Establish PR review process

