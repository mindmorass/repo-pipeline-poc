# Installation Guide

Complete guide for deploying the Infrastructure Management Platform from templates.

## 🎯 Overview

This platform provides:
- **Manager Repository**: Centralized infrastructure management with Terraform + GitHub Actions
- **Customer Repositories**: Template for customer/team repositories with automatic infrastructure deployment
- **Compliance Dashboard**: Web UI for tracking compliance across all repositories
- **Unified Scoring**: OpenSSF Scorecard + Custom Properties compliance in one score

---

## 📋 Prerequisites

### Required
- GitHub Organization (not personal account)
- GitHub CLI (`gh`) installed
- Git installed
- Organization admin permissions (for custom properties)

### Recommended
- Terraform installed (v1.5+)
- Docker installed (for dashboard)
- AWS Account (or other cloud provider)
- Spacelift account (optional, for advanced IaC management)

### GitHub Permissions

You'll need a GitHub Personal Access Token (PAT) with:
- `repo` (full)
- `workflow` (for triggering workflows)
- `read:org` (for organization access)
- `admin:org` (for custom properties - optional)

Create at: https://github.com/settings/tokens

---

## 🚀 Quick Start (15 minutes)

### Step 1: Create Manager Repository (5 min)

```bash
# 1. Go to manager_repo template
# https://github.com/YOUR-ORG/repo-management/tree/main/manager_repo

# 2. Click "Use this template" → "Create a new repository"
#    Name: infrastructure-manager (or your choice)
#    Visibility: Private (recommended)

# 3. Clone your new repository
git clone https://github.com/YOUR-ORG/infrastructure-manager.git
cd infrastructure-manager

# 4. Run setup script
chmod +x setup.sh
./setup.sh
```

**The script will guide you through**:
- ✅ Organization configuration
- ✅ GitHub secrets setup
- ✅ GitHub variables
- ✅ Terraform backend configuration
- ✅ Compliance configuration
- ✅ Dashboard setup (optional)
- ✅ Custom properties creation

### Step 2: Create Customer Repository (5 min)

```bash
# 1. Go to source_monorepo template
# https://github.com/YOUR-ORG/repo-management/tree/main/source_monorepo

# 2. Click "Use this template" → "Create a new repository"
#    Name: customer-repo-name
#    Visibility: Private

# 3. Clone your new repository
git clone https://github.com/YOUR-ORG/customer-repo-name.git
cd customer-repo-name

# 4. Run setup script
chmod +x setup.sh
./setup.sh
```

**The script will guide you through**:
- ✅ Manager repository link
- ✅ GitHub PAT setup
- ✅ Custom properties
- ✅ Infrastructure configuration
- ✅ Example application structure

### Step 3: Test the System (5 min)

```bash
# 1. Make a change to infrastructure
cd customer-repo-name
echo "test: true" >> infra/variables.yml
git add infra/variables.yml
git commit -m "test: trigger infrastructure deployment"
git push

# 2. Watch the workflows
gh run watch

# 3. View in GitHub Actions
# https://github.com/YOUR-ORG/customer-repo-name/actions
```

**Expected behavior**:
1. Customer repo triggers manager repo
2. Manager repo runs Terraform plan
3. Status posted back to customer repo
4. Compliance scan runs automatically

---

## 📚 Detailed Installation

### Phase 1: Manager Repository Setup

#### 1.1 Create from Template

Navigate to `manager_repo` directory in this repository and use GitHub's "Use this template" button to create your manager repository.

**Recommended settings**:
- Name: `infrastructure-manager`
- Description: "Centralized infrastructure management and compliance"
- Visibility: Private
- Include all branches: No (only main)

#### 1.2 Configure GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions**

Required secrets:

| Secret | Description | How to get |
|--------|-------------|------------|
| `AWS_ACCESS_KEY_ID` | AWS access key | AWS IAM console |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | AWS IAM console |
| `SOURCE_REPOS_PAT` | GitHub PAT | GitHub Settings → Tokens |
| `SPACELIFT_API_KEY_ID` | Spacelift key ID | Spacelift settings (optional) |
| `SPACELIFT_API_KEY_SECRET` | Spacelift secret | Spacelift settings (optional) |

**Creating SOURCE_REPOS_PAT**:
```bash
# Using GitHub CLI
gh auth refresh -h github.com -s repo,workflow,read:org

# Or manually at:
# https://github.com/settings/tokens/new
# Scopes: repo, workflow, read:org
```

#### 1.3 Configure GitHub Variables

Go to **Settings** → **Secrets and variables** → **Actions** → **Variables**

| Variable | Value | Example |
|----------|-------|---------|
| `GITHUB_ORG` | Your organization name | `acme-corp` |
| `MANAGER_REPO_NAME` | This repository name | `infrastructure-manager` |
| `MANAGER_REPO_OWNER` | Your organization name | `acme-corp` |

#### 1.4 Configure Terraform Backend

Create or update `terraform/backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "infrastructure-manager/terraform.tfstate"
    region = "us-east-1"
  }
}
```

**Create S3 bucket** (if needed):
```bash
aws s3 mb s3://your-terraform-state-bucket --region us-east-1
aws s3api put-bucket-versioning \
  --bucket your-terraform-state-bucket \
  --versioning-configuration Status=Enabled
```

#### 1.5 Initialize Terraform

```bash
cd terraform
terraform init
terraform plan  # Should run without errors
cd ..
```

#### 1.6 Configure Compliance

Edit `.github/compliance/config.json` to match your organization's needs:

```json
{
  "required_properties": ["repo_content_type", "team_owner"],
  "required_for_infra_repos": ["infrastructure_tools", "customer_tier"],
  "valid_values": {
    "customer_tier": ["free", "startup", "professional", "enterprise"]
  }
}
```

#### 1.7 Set Up Dashboard (Optional)

```bash
cd dashboard

# Configure backend
cat > backend/.env << EOF
NODE_ENV=production
PORT=3000
GITHUB_TOKEN=your_pat_here
GITHUB_ORG=your-org
FRONTEND_URL=http://localhost:3001
EOF

# Start with Docker
docker-compose up -d

# Access dashboard
open http://localhost:3001
```

---

### Phase 2: Organization Custom Properties

#### 2.1 Create Property Schemas

Run these commands with organization admin permissions:

```bash
ORG="your-org"

# repo_content_type (multi-select)
gh api orgs/$ORG/properties/schema -X POST \
  -f property_name='repo_content_type' \
  -f value_type='multi_select' \
  -f description='Repository content type' \
  -f allowed_values[]='app' \
  -f allowed_values[]='infra'

# infrastructure_tools (multi-select)
gh api orgs/$ORG/properties/schema -X POST \
  -f property_name='infrastructure_tools' \
  -f value_type='multi_select' \
  -f description='Infrastructure tools to enable' \
  -f allowed_values[]='terraform' \
  -f allowed_values[]='ansible' \
  -f allowed_values[]='pulumi'

# customer_tier (single-select)
gh api orgs/$ORG/properties/schema -X POST \
  -f property_name='customer_tier' \
  -f value_type='single_select' \
  -f description='Customer subscription tier' \
  -f allowed_values[]='free' \
  -f allowed_values[]='startup' \
  -f allowed_values[]='professional' \
  -f allowed_values[]='enterprise'

# team_owner (string)
gh api orgs/$ORG/properties/schema -X POST \
  -f property_name='team_owner' \
  -f value_type='string' \
  -f description='Team that owns this repository'

# terraform_version (single-select)
gh api orgs/$ORG/properties/schema -X POST \
  -f property_name='terraform_version' \
  -f value_type='single_select' \
  -f description='Terraform version' \
  -f default_value='latest' \
  -f allowed_values[]='1.5' \
  -f allowed_values[]='1.6' \
  -f allowed_values[]='1.7' \
  -f allowed_values[]='1.8' \
  -f allowed_values[]='latest'

# spacelift_auto_deploy (true/false as string)
gh api orgs/$ORG/properties/schema -X POST \
  -f property_name='spacelift_auto_deploy' \
  -f value_type='true_false' \
  -f description='Auto-deploy on main branch' \
  -f default_value='false'
```

#### 2.2 Verify Properties

```bash
gh api orgs/$ORG/properties/schema | jq '.[] | {name: .property_name, type: .value_type}'
```

---

### Phase 3: Customer Repository Setup

#### 3.1 Create from Template

Use the `source_monorepo` template to create customer repositories.

**For each customer/team**:
1. Go to source_monorepo template
2. Click "Use this template"
3. Name: `customer-{name}` or `team-{name}`
4. Visibility: Private
5. Create repository

#### 3.2 Run Setup Script

```bash
git clone https://github.com/YOUR-ORG/customer-name.git
cd customer-name
chmod +x setup.sh
./setup.sh
```

Follow the prompts to configure:
- Manager repository connection
- Custom properties
- Infrastructure requirements
- Application structure

#### 3.3 Set Custom Properties

If not done via setup script:

```bash
ORG="your-org"
REPO="customer-name"

gh api repos/$ORG/$REPO/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app' \
  -f properties[][value][]='infra' \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform' \
  -f properties[][property_name]='customer_tier' \
  -f properties[][value]='professional' \
  -f properties[][property_name]='team_owner' \
  -f properties[][value]='platform-team'
```

---

## ✅ Verification

### Test Manager Repository

```bash
# Run unified compliance scan
gh workflow run unified-compliance.yml --repo YOUR-ORG/infrastructure-manager

# Wait for completion
gh run watch

# View results
gh run list --workflow=unified-compliance.yml --limit 1
```

**Expected output**:
- ✅ Compliance scan completes
- ✅ Organization score calculated
- ✅ Dashboard updated (if configured)
- ✅ Issue created with compliance report

### Test Customer Repository

```bash
cd customer-repo
echo "test: true" >> infra/variables.yml
git add infra/variables.yml
git commit -m "test: trigger deployment"
git push

# Watch workflow
gh run watch
```

**Expected output**:
- ✅ trigger-infra workflow starts
- ✅ Manager repository triggered
- ✅ Terraform plan runs
- ✅ Status posted back to customer repo
- ✅ Spacelift stack created (if configured)

### Test Dashboard

```bash
cd infrastructure-manager/dashboard
docker-compose up -d

# Check health
curl http://localhost:3000/api/health

# Access UI
open http://localhost:3001
```

**Expected output**:
- ✅ Organization score displayed
- ✅ Repository list shown
- ✅ Trend charts populated (after multiple scans)

---

## 🔧 Configuration

### Customize for Your Organization

#### 1. Update Compliance Rules

Edit `manager_repo/.github/compliance/config.json`:

```json
{
  "required_properties": [
    "repo_content_type",
    "team_owner",
    "cost_center"  // Add custom properties
  ],
  "valid_values": {
    "customer_tier": ["free", "pro", "enterprise"],  // Your tiers
    "region_restriction": ["us", "eu", "apac"]  // Your regions
  }
}
```

#### 2. Customize Terraform Modules

Add modules to `manager_repo/terraform/`:

```bash
cd manager_repo/terraform
mkdir -p modules/networking modules/compute modules/database
```

#### 3. Adjust Workflows

Edit workflow files to match your needs:
- `manager_repo/.github/workflows/infra-deploy.yml` - Main deployment
- `manager_repo/.github/workflows/unified-compliance.yml` - Compliance scanning

#### 4. Configure Notifications

Add Slack webhook or email notifications in compliance config:

```json
{
  "notification_config": {
    "slack_webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK",
    "email_recipients": ["ops@company.com"],
    "severity_threshold": "high"
  }
}
```

---

## 📖 Post-Installation

### 1. Onboard Teams

Use the template to create repositories for each team:

```bash
# Automated onboarding
./manager_repo/docs/examples/onboarding-script.sh team-name professional terraform
```

### 2. Set Up Monitoring

- Enable GitHub notifications for workflow failures
- Configure Slack/Teams integration
- Set up alerting for low compliance scores

### 3. Documentation

Share with teams:
- `docs/QUICK-REFERENCE.md` - Quick commands
- `docs/PATTERNS.md` - Repository patterns
- `docs/CUSTOM-PROPERTIES.md` - Property guide

### 4. Training

Conduct training sessions on:
- How to update infrastructure requirements
- Understanding compliance scores
- Using the dashboard
- Troubleshooting workflows

---

## 🐛 Troubleshooting

### Workflow Not Triggering

**Problem**: Customer repo push doesn't trigger manager repo

**Solutions**:
1. Check `MANAGER_REPO_PAT` secret is set
2. Verify PAT has `repo` + `workflow` scopes
3. Check manager repo name in customer repo variables
4. Review workflow logs for errors

### Custom Properties Not Working

**Problem**: Cannot set custom properties

**Solutions**:
1. Verify organization admin permissions
2. Check property schema exists: `gh api orgs/YOUR-ORG/properties/schema`
3. Ensure property names match exactly
4. Try setting via UI: Repository → Settings → Custom Properties

### Dashboard Shows No Data

**Problem**: Dashboard loads but shows "No data"

**Solutions**:
1. Run compliance scan first: `gh workflow run unified-compliance.yml`
2. Check update-dashboard workflow ran successfully
3. Verify database file exists: `dashboard/backend/data/compliance.db`
4. Check API logs: `docker-compose logs api`

### Terraform Fails

**Problem**: Terraform commands fail in workflows

**Solutions**:
1. Verify AWS credentials are set
2. Check S3 backend bucket exists
3. Initialize locally first: `terraform init`
4. Review Terraform logs in workflow output

---

## 📚 Additional Resources

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Setup Guide](docs/SETUP.md)
- [Custom Properties](docs/CUSTOM-PROPERTIES.md)
- [Scorecard Integration](docs/SCORECARD-INTEGRATION.md)
- [Dashboard Guide](manager_repo/dashboard/README.md)
- [Compliance System](docs/COMPLIANCE.md)
- [Auto-Remediation](docs/AUTO-REMEDIATION.md)

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/infrastructure-manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/infrastructure-manager/discussions)
- **Documentation**: All docs in `/docs` directory

---

## ✨ Success Checklist

Before going live, verify:

- [ ] Manager repository created and configured
- [ ] All secrets and variables set
- [ ] Terraform backend initialized
- [ ] Custom properties created at org level
- [ ] At least one customer repository created from template
- [ ] Test workflow runs successfully
- [ ] Compliance scan completes
- [ ] Dashboard accessible (if configured)
- [ ] Documentation shared with teams
- [ ] Training completed

**Congratulations! Your Infrastructure Management Platform is ready! 🎉**

