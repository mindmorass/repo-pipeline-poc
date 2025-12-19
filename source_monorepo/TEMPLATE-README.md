# Customer Repository Template (Monorepo)

📦 **This is a GitHub Repository Template** - Use it to create customer/team repositories with automatic infrastructure management.

## What This Template Provides

- ✅ **Monorepo Structure** - Application (`app/`) and infrastructure (`infra/`) in one repo
- ✅ **GitHub Actions Workflows** - Pre-configured for infrastructure deployment
- ✅ **Manager Repo Integration** - Automatic triggering of infrastructure workflows
- ✅ **Compliance Validation** - Content type validation on every push
- ✅ **Custom Properties** - Metadata for tool selection and governance
- ✅ **Setup Script** - Automated configuration

## 🚀 Getting Started

### 1. Create Repository from Template

Click the "Use this template" button above and create a new repository.

**Naming conventions**:
- `customer-{name}` - For customer repositories
- `team-{name}` - For internal team repositories
- `{project}-monorepo` - For project repositories

### 2. Clone and Setup

```bash
git clone https://github.com/YOUR-ORG/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME

# Run automated setup
chmod +x setup.sh
./setup.sh
```

The setup script will configure:
- Manager repository connection
- GitHub secrets and variables
- Custom properties
- Infrastructure requirements
- Example application structure

### 3. Test Infrastructure Deployment

```bash
# Make a change to infrastructure
echo "test: true" >> infra/variables.yml
git add infra/variables.yml
git commit -m "test: trigger infrastructure deployment"
git push

# Watch the workflow
gh run watch
```

## 📚 What's Included

```
customer-repo/
├── .github/
│   └── workflows/
│       ├── trigger-infra.yml          # Triggers manager repo
│       └── validate-content-type.yml  # Validates repo structure
│
├── app/
│   ├── src/                           # Application source code
│   ├── tests/                         # Application tests
│   └── README.md                      # App documentation
│
├── infra/
│   ├── variables.yml                  # Infrastructure requirements
│   └── README.md                      # Infrastructure guide
│
├── setup.sh                           # Automated setup script
└── README.md                          # Complete documentation
```

## ⚙️ Configuration

### Required Variables

Configure in **Settings → Secrets and variables → Actions → Variables**:

- `MANAGER_REPO_OWNER` - Organization name (e.g., `acme-corp`)
- `MANAGER_REPO_NAME` - Manager repo name (e.g., `infrastructure-manager`)

### Required Secrets

- `MANAGER_REPO_PAT` - GitHub PAT with `repo` + `workflow` scopes

**Creating PAT**:
```bash
# Using GitHub CLI
gh auth refresh -h github.com -s repo,workflow

# Or manually at: https://github.com/settings/tokens/new
# Scopes needed: repo, workflow
```

### Custom Properties

Set via GitHub UI or CLI:

```bash
ORG="your-org"
REPO="your-repo"

gh api repos/$ORG/$REPO/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app' \
  -f properties[][value][]='infra' \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform' \
  -f properties[][property_name]='customer_tier' \
  -f properties[][value]='professional'
```

## 🏗️ Repository Structure

### Application Directory (`app/`)

Put your application code here:

```
app/
├── src/              # Source code
├── tests/            # Tests
├── package.json      # Dependencies (Node.js)
├── requirements.txt  # Dependencies (Python)
└── README.md         # Documentation
```

### Infrastructure Directory (`infra/`)

Define infrastructure requirements in `variables.yml`:

```yaml
project_name: my-app
cloud_provider: aws

environments:
  staging:
    region: us-east-1
    instance_type: t3.micro
    min_instances: 1
    max_instances: 2
    
  production:
    region: us-east-1
    instance_type: t3.small
    min_instances: 2
    max_instances: 5
```

**Triggering deployments**: Changes to `infra/**` automatically trigger the manager repository.

## 🔄 Workflow Automation

### Infrastructure Deployment

**File**: `.github/workflows/trigger-infra.yml`

**Triggers on**:
- Push to `main` with changes to `infra/**`
- Pull requests with changes to `infra/**`
- Manual trigger

**What it does**:
1. Fetches custom properties
2. Triggers manager repository
3. Waits for infrastructure setup
4. Posts status back

### Content Type Validation

**File**: `.github/workflows/validate-content-type.yml`

**Triggers on**:
- Push to `main` or `develop`
- Pull requests

**What it does**:
1. Detects repository structure (app/, infra/)
2. Validates against `repo_content_type` property
3. Creates issue if mismatch
4. Auto-closes issue when fixed

## 📊 Custom Properties

### repo_content_type

**Purpose**: Classify what this repository contains

**Values**:
- `app` - Contains application code
- `infra` - Contains infrastructure code
- `app,infra` - Monorepo (both)

**Set it**:
```bash
gh api repos/ORG/REPO/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app' \
  -f properties[][value][]='infra'
```

### infrastructure_tools

**Purpose**: Which IaC tools to enable

**Values**: `terraform`, `ansible`, `pulumi`, `cloudformation`, `crossplane`

**Example**:
```bash
gh api repos/ORG/REPO/properties/values -X PUT \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform' \
  -f properties[][value][]='ansible'
```

### customer_tier

**Purpose**: Subscription/service tier

**Values**: `free`, `startup`, `professional`, `enterprise`

### team_owner

**Purpose**: Team that owns this repository

**Value**: Team slug (e.g., `platform-team`)

## 🎯 Common Tasks

### Update Infrastructure

```bash
# Edit requirements
vi infra/variables.yml

# Commit and push
git add infra/variables.yml
git commit -m "infra: update instance types"
git push

# Watch deployment
gh run watch
```

### Add New Tool

```bash
# Update custom properties
gh api repos/$ORG/$REPO/properties/values -X PUT \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform' \
  -f properties[][value][]='ansible'  # Added!

# Push any infra change to trigger
echo "# Updated $(date)" >> infra/variables.yml
git add infra/variables.yml
git commit -m "infra: enable ansible"
git push
```

### View Deployment Status

```bash
# List recent runs
gh run list --workflow=trigger-infra.yml --limit 5

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

## 📖 Documentation

- **[INSTALLATION.md](../INSTALLATION.md)** - Installation guide
- **[docs/PATTERNS.md](../docs/PATTERNS.md)** - Repository patterns
- **[docs/CUSTOM-PROPERTIES.md](../docs/CUSTOM-PROPERTIES.md)** - Properties guide
- **[docs/QUICK-REFERENCE.md](../docs/QUICK-REFERENCE.md)** - Quick commands

## 🐛 Troubleshooting

### Workflow Not Triggering

**Problem**: Push to `infra/` doesn't trigger manager repo

**Solutions**:
1. Check `MANAGER_REPO_PAT` is set
2. Verify PAT has `workflow` scope
3. Confirm manager repo name in variables
4. Check workflow logs for errors

### Custom Properties Not Set

**Problem**: Cannot set custom properties

**Solutions**:
1. Properties must exist at organization level first
2. Contact organization admin
3. Try setting via repository Settings UI

### Deployment Fails

**Problem**: Infrastructure deployment fails

**Solutions**:
1. Check manager repository workflow logs
2. Verify custom properties are correct
3. Review `infra/variables.yml` for errors
4. Contact service provider/platform team

## ✨ Features

### Automatic Infrastructure

- Changes to `infra/` trigger deployments
- No manual Terraform commands needed
- Status updates posted to pull requests
- Blocking workflows ensure setup completes

### Compliance Validation

- Structure changes detected automatically
- Mismatches create GitHub issues
- Auto-remediation for safe cases
- Full audit trail

### Tool Selection

- Choose tools via custom properties
- Manager repo provisions automatically
- Spacelift stacks created on-demand
- Multi-tool support (Terraform, Ansible, etc.)

## 🔐 Security

- PAT stored as secret (never in code)
- Limited PAT scopes (repo + workflow only)
- Infrastructure changes require approval (optional)
- All deployments logged and auditable

---

**Ready to Start!** Run `./setup.sh` to configure your repository. 🚀

**Need Help?** Contact your platform team or check the documentation.

