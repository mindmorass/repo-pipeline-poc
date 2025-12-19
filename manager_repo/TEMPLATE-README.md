# Infrastructure Manager Repository Template

📦 **This is a GitHub Repository Template** - Use it to create your organization's centralized infrastructure management repository.

## What This Template Provides

- ✅ **GitHub Actions Workflows** - Pre-configured for Terraform deployment and compliance
- ✅ **Terraform Structure** - Ready for AWS/Azure/GCP infrastructure
- ✅ **Compliance Dashboard** - Web UI for tracking scores across all repositories
- ✅ **OpenSSF Scorecard Integration** - Unified security and governance scoring
- ✅ **Custom Properties System** - Metadata-driven automation
- ✅ **Setup Scripts** - Automated configuration for quick start

## 🚀 Getting Started

### 1. Create Repository from Template

Click the "Use this template" button above and create a new repository in your organization.

**Recommended naming**: `infrastructure-manager` or `platform-manager`

### 2. Clone and Setup

```bash
git clone https://github.com/YOUR-ORG/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME

# Run automated setup
chmod +x setup.sh
./setup.sh
```

The setup script will guide you through:
- Organization configuration
- GitHub secrets and variables
- Terraform backend setup
- Compliance configuration
- Dashboard deployment
- Custom properties creation

### 3. Verify Installation

```bash
# Run compliance scan
gh workflow run unified-compliance.yml

# Check results
gh run watch
```

## 📚 What's Included

```
infrastructure-manager/
├── .github/
│   ├── workflows/
│   │   ├── infra-deploy.yml           # Main deployment workflow
│   │   ├── unified-compliance.yml     # Compliance + Scorecard scan
│   │   ├── property-compliance.yml    # Custom properties scanner
│   │   ├── update-dashboard.yml       # Dashboard data update
│   │   └── drift-detection.yml        # Scheduled drift detection
│   └── compliance/
│       ├── config.json                # Compliance rules
│       └── README.md                  # Configuration guide
│
├── terraform/
│   ├── main.tf                        # Provider configuration
│   ├── variables.tf                   # Input variables
│   ├── outputs.tf                     # Infrastructure outputs
│   └── networking.tf                  # Example resources
│
├── dashboard/
│   ├── backend/                       # Node.js API
│   ├── frontend/                      # React UI
│   ├── docker-compose.yml             # Docker orchestration
│   └── README.md                      # Dashboard guide
│
├── tools/
│   └── sync-properties.js             # External sync tool
│
├── setup.sh                           # Automated setup script
└── README.md                          # Complete documentation
```

## ⚙️ Configuration

### Required Secrets

Configure in **Settings → Secrets and variables → Actions**:

- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `SOURCE_REPOS_PAT` - GitHub PAT with repo + workflow scopes
- `SPACELIFT_API_KEY_ID` - Spacelift credentials (optional)
- `SPACELIFT_API_KEY_SECRET` - Spacelift credentials (optional)

### Required Variables

- `GITHUB_ORG` - Your organization name
- `MANAGER_REPO_NAME` - This repository name
- `MANAGER_REPO_OWNER` - Your organization name

## 🎯 Next Steps

1. **Create Custom Properties** - Define organization-level metadata
   ```bash
   # See CUSTOM_PROPERTIES_SETUP.md (created by setup.sh)
   ```

2. **Configure Terraform** - Customize for your cloud provider
   ```bash
   cd terraform
   # Edit main.tf, variables.tf, etc.
   terraform init
   ```

3. **Set Up Customer Repos** - Use the source_monorepo template
   - Create from template
   - Run setup.sh
   - Link to this manager repo

4. **Configure Dashboard** - Optional but recommended
   ```bash
   cd dashboard
   docker-compose up -d
   open http://localhost:3001
   ```

5. **Test System** - Run a compliance scan
   ```bash
   gh workflow run unified-compliance.yml
   ```

## 📖 Documentation

- **[INSTALLATION.md](../INSTALLATION.md)** - Complete installation guide
- **[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)** - System architecture
- **[docs/SETUP.md](../docs/SETUP.md)** - Detailed setup
- **[docs/SCORECARD-INTEGRATION.md](../docs/SCORECARD-INTEGRATION.md)** - Scorecard guide
- **[dashboard/README.md](dashboard/README.md)** - Dashboard documentation

## 🔐 Security

- **Secrets**: Never commit secrets - use GitHub Secrets
- **PAT Permissions**: Minimum required scopes only
- **State Files**: Use remote backend (S3) with encryption
- **Access Control**: Limit who can modify workflows

## 🆘 Support

- **Issues**: Create issue in this repository
- **Discussions**: Use GitHub Discussions
- **Documentation**: Check `/docs` directory

## ✨ Features

### Unified Compliance Scoring
- OpenSSF Scorecard security checks
- Custom properties governance
- Single aggregate score (0-10)
- Visible in GitHub Security tab

### Compliance Dashboard
- Organization overview
- Repository scores
- Trend analysis
- Distribution visualization

### Auto-Remediation
- Detects property drift
- Auto-fixes safe violations
- Creates issues for manual review

### Tool Orchestration
- Spacelift integration
- Terraform stacks
- Ansible playbooks
- Multi-tool support

## 📄 License

Apache 2.0 - See LICENSE file

---

**Ready to Deploy!** Follow the steps above or run `./setup.sh` to get started. 🚀

