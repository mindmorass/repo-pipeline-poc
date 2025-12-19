#!/bin/bash
# Manager Repository Setup Script
# Run this after creating a repository from the template

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║     Infrastructure Manager Repository Setup                 ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗ GitHub CLI (gh) is not installed${NC}"
    echo "  Install from: https://cli.github.com/"
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    echo -e "${YELLOW}⚠ Terraform is not installed (optional but recommended)${NC}"
fi

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker is not installed (needed for dashboard)${NC}"
fi

echo -e "${GREEN}✓ Prerequisites check complete${NC}\n"

# Get organization name
echo -e "${BLUE}Step 1: Organization Configuration${NC}"
read -p "Enter your GitHub organization name: " ORG_NAME

if [ -z "$ORG_NAME" ]; then
    echo -e "${RED}Organization name is required${NC}"
    exit 1
fi

# Get current repo name
REPO_NAME=$(gh repo view --json name -q .name 2>/dev/null || basename $(git rev-parse --show-toplevel))

echo -e "${GREEN}✓ Organization: $ORG_NAME${NC}"
echo -e "${GREEN}✓ Repository: $REPO_NAME${NC}\n"

# Configure GitHub Secrets
echo -e "${BLUE}Step 2: GitHub Secrets${NC}"
echo "The following secrets need to be configured:"
echo "  1. AWS_ACCESS_KEY_ID - AWS access key for Terraform"
echo "  2. AWS_SECRET_ACCESS_KEY - AWS secret key for Terraform"
echo "  3. SPACELIFT_API_KEY_ID - Spacelift API key ID"
echo "  4. SPACELIFT_API_KEY_SECRET - Spacelift API secret"
echo "  5. SOURCE_REPOS_PAT - GitHub PAT with repo + read:org scopes"
echo ""

read -p "Do you want to set these secrets now? (y/n): " SET_SECRETS

if [ "$SET_SECRETS" = "y" ]; then
    echo ""
    read -sp "AWS_ACCESS_KEY_ID: " AWS_KEY
    echo ""
    read -sp "AWS_SECRET_ACCESS_KEY: " AWS_SECRET
    echo ""
    read -sp "SPACELIFT_API_KEY_ID: " SPACELIFT_ID
    echo ""
    read -sp "SPACELIFT_API_KEY_SECRET: " SPACELIFT_SECRET
    echo ""
    read -sp "SOURCE_REPOS_PAT (GitHub PAT): " GH_PAT
    echo ""

    gh secret set AWS_ACCESS_KEY_ID --body "$AWS_KEY"
    gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET"
    gh secret set SPACELIFT_API_KEY_ID --body "$SPACELIFT_ID"
    gh secret set SPACELIFT_API_KEY_SECRET --body "$SPACELIFT_SECRET"
    gh secret set SOURCE_REPOS_PAT --body "$GH_PAT"

    echo -e "${GREEN}✓ Secrets configured${NC}\n"
else
    echo -e "${YELLOW}⚠ Remember to set secrets later in repository settings${NC}\n"
fi

# Configure GitHub Variables
echo -e "${BLUE}Step 3: GitHub Variables${NC}"

gh variable set GITHUB_ORG --body "$ORG_NAME"
gh variable set MANAGER_REPO_NAME --body "$REPO_NAME"
gh variable set MANAGER_REPO_OWNER --body "$ORG_NAME"

echo -e "${GREEN}✓ Variables configured${NC}\n"

# Configure Terraform backend
echo -e "${BLUE}Step 4: Terraform Backend${NC}"
read -p "Enter S3 bucket name for Terraform state: " S3_BUCKET
read -p "Enter AWS region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

cat > terraform/backend.tf << EOF
terraform {
  backend "s3" {
    bucket = "$S3_BUCKET"
    key    = "infrastructure-manager/terraform.tfstate"
    region = "$AWS_REGION"
  }
}
EOF

echo -e "${GREEN}✓ Terraform backend configured${NC}\n"

# Configure compliance config
echo -e "${BLUE}Step 5: Compliance Configuration${NC}"

cat > .github/compliance/config.json << EOF
{
  "\$schema": "https://json-schema.org/draft-07/schema",
  "description": "Custom Property Compliance Configuration for $ORG_NAME",
  "required_properties": [
    "repo_content_type",
    "team_owner"
  ],
  "required_for_infra_repos": [
    "infrastructure_tools",
    "customer_tier"
  ],
  "optional_properties": [
    "terraform_version",
    "spacelift_auto_deploy",
    "infrastructure_approval_required",
    "ansible_inventory_path",
    "spacelift_stack_name",
    "billing_account",
    "security_contact",
    "region_restriction"
  ],
  "valid_values": {
    "repo_content_type": ["app", "infra"],
    "customer_tier": ["free", "startup", "professional", "enterprise"],
    "infrastructure_tools": [
      "terraform",
      "ansible",
      "pulumi",
      "cloudformation",
      "crossplane"
    ],
    "terraform_version": ["1.5", "1.6", "1.7", "1.8", "latest"],
    "region_restriction": ["us-only", "eu-only", "apac-only", "global"]
  },
  "auto_remediate": {
    "team_owner": true,
    "missing_optional": false,
    "missing_required": false,
    "invalid_value": false,
    "content_type_add_detected": true,
    "content_type_remove_missing": false
  },
  "content_detection_rules": {
    "infra_indicators": [
      "infra",
      "terraform",
      "ansible",
      "kubernetes",
      "k8s",
      "helm",
      "cloudformation",
      "pulumi"
    ],
    "app_indicators": [
      "app",
      "src",
      "frontend",
      "backend",
      "services",
      "packages",
      "lib",
      "components"
    ],
    "check_file_extensions": true,
    "infra_file_patterns": [".tf", ".tfvars", "ansible.cfg", "playbook.yml"]
  },
  "severity_rules": {
    "missing_required": "high",
    "missing_optional": "low",
    "invalid_value": "high",
    "invalid_team": "critical",
    "team_mismatch": "medium",
    "stale_property": "low",
    "deprecated_value": "medium",
    "content_type_mismatch_add": "high",
    "content_type_mismatch_remove": "medium"
  },
  "team_mappings": {},
  "repository_exclusions": [
    ".github",
    "archived-*",
    "template-*"
  ],
  "notification_config": {
    "slack_webhook_url": "",
    "email_recipients": [],
    "severity_threshold": "high"
  }
}
EOF

echo -e "${GREEN}✓ Compliance configuration created${NC}\n"

# Dashboard setup
echo -e "${BLUE}Step 6: Dashboard Configuration${NC}"
read -p "Do you want to set up the compliance dashboard? (y/n): " SETUP_DASHBOARD

if [ "$SETUP_DASHBOARD" = "y" ]; then
    # Create backend .env
    cat > dashboard/backend/.env << EOF
NODE_ENV=production
PORT=3000
GITHUB_TOKEN=\${SOURCE_REPOS_PAT}
GITHUB_ORG=$ORG_NAME
FRONTEND_URL=http://localhost:3001
DB_PATH=./data/compliance.db
CACHE_TTL=300
EOF

    echo -e "${GREEN}✓ Dashboard configuration created${NC}"
    echo -e "${YELLOW}  To start dashboard: cd dashboard && docker-compose up -d${NC}\n"
else
    echo -e "${YELLOW}⚠ Skipping dashboard setup${NC}\n"
fi

# Create Organization Custom Properties
echo -e "${BLUE}Step 7: GitHub Custom Properties${NC}"
echo "Creating organization-level custom properties..."
echo ""

read -p "Do you want to create custom properties now? (y/n): " CREATE_PROPS

if [ "$CREATE_PROPS" = "y" ]; then
    echo -e "${YELLOW}Note: This requires organization admin permissions${NC}"
    
    # This would need GitHub API calls to create org-level custom properties
    # For now, provide instructions
    cat > CUSTOM_PROPERTIES_SETUP.md << EOF
# Custom Properties Setup

Run these commands with organization admin permissions:

\`\`\`bash
# Create repo_content_type property
gh api orgs/$ORG_NAME/properties/schema \\
  -X POST \\
  -f property_name='repo_content_type' \\
  -f value_type='multi_select' \\
  -f description='Repository content type (app, infra)' \\
  -f allowed_values[]='app' \\
  -f allowed_values[]='infra'

# Create infrastructure_tools property
gh api orgs/$ORG_NAME/properties/schema \\
  -X POST \\
  -f property_name='infrastructure_tools' \\
  -f value_type='multi_select' \\
  -f description='Infrastructure tools to enable' \\
  -f allowed_values[]='terraform' \\
  -f allowed_values[]='ansible' \\
  -f allowed_values[]='pulumi'

# Create customer_tier property
gh api orgs/$ORG_NAME/properties/schema \\
  -X POST \\
  -f property_name='customer_tier' \\
  -f value_type='single_select' \\
  -f description='Customer subscription tier' \\
  -f allowed_values[]='free' \\
  -f allowed_values[]='startup' \\
  -f allowed_values[]='professional' \\
  -f allowed_values[]='enterprise'

# Create team_owner property
gh api orgs/$ORG_NAME/properties/schema \\
  -X POST \\
  -f property_name='team_owner' \\
  -f value_type='string' \\
  -f description='Team that owns this repository'
\`\`\`

See docs/CUSTOM-PROPERTIES.md for complete list.
EOF

    echo -e "${GREEN}✓ Created CUSTOM_PROPERTIES_SETUP.md with instructions${NC}\n"
else
    echo -e "${YELLOW}⚠ Remember to create custom properties${NC}\n"
fi

# Initialize Terraform
echo -e "${BLUE}Step 8: Terraform Initialization${NC}"
read -p "Do you want to initialize Terraform now? (y/n): " INIT_TF

if [ "$INIT_TF" = "y" ]; then
    cd terraform
    terraform init
    cd ..
    echo -e "${GREEN}✓ Terraform initialized${NC}\n"
else
    echo -e "${YELLOW}⚠ Remember to run: cd terraform && terraform init${NC}\n"
fi

# Commit changes
echo -e "${BLUE}Step 9: Commit Configuration${NC}"
read -p "Do you want to commit these changes? (y/n): " COMMIT_CHANGES

if [ "$COMMIT_CHANGES" = "y" ]; then
    git add .
    git commit -m "chore: initial manager repo configuration for $ORG_NAME"
    
    read -p "Push to remote? (y/n): " PUSH_CHANGES
    if [ "$PUSH_CHANGES" = "y" ]; then
        git push origin main
        echo -e "${GREEN}✓ Changes pushed${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠ Remember to commit and push your changes${NC}\n"
fi

# Summary
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║     ✅ Setup Complete!                                       ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo "Next steps:"
echo ""
echo "1. Review and update compliance configuration:"
echo "   .github/compliance/config.json"
echo ""
echo "2. Customize Terraform modules in terraform/"
echo ""
echo "3. Set up custom properties (if not done):"
echo "   See CUSTOM_PROPERTIES_SETUP.md"
echo ""
echo "4. Test compliance scan:"
echo "   gh workflow run unified-compliance.yml"
echo ""
echo "5. Set up customer repositories using the source_monorepo template"
echo ""
echo "6. Access dashboard (if configured):"
echo "   cd dashboard && docker-compose up -d"
echo "   Open http://localhost:3001"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  - README.md - Overview"
echo "  - docs/SETUP.md - Detailed setup guide"
echo "  - docs/SCORECARD-INTEGRATION.md - Scorecard integration"
echo "  - dashboard/README.md - Dashboard setup"
echo ""
echo -e "${GREEN}Happy managing! 🚀${NC}"

