#!/bin/bash
# Customer Repository Setup Script
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
║     Customer Repository Setup                               ║
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

echo -e "${GREEN}✓ Prerequisites check complete${NC}\n"

# Get information
echo -e "${BLUE}Step 1: Repository Configuration${NC}"
read -p "Enter your GitHub organization name: " ORG_NAME
read -p "Enter the manager repository name: " MANAGER_REPO
MANAGER_REPO=${MANAGER_REPO:-infrastructure-manager}

# Get current repo name
REPO_NAME=$(gh repo view --json name -q .name 2>/dev/null || basename $(git rev-parse --show-toplevel))

echo -e "${GREEN}✓ Organization: $ORG_NAME${NC}"
echo -e "${GREEN}✓ Repository: $REPO_NAME${NC}"
echo -e "${GREEN}✓ Manager Repo: $MANAGER_REPO${NC}\n"

# Configure repository variables
echo -e "${BLUE}Step 2: GitHub Variables${NC}"

gh variable set MANAGER_REPO_OWNER --body "$ORG_NAME"
gh variable set MANAGER_REPO_NAME --body "$MANAGER_REPO"

echo -e "${GREEN}✓ Variables configured${NC}\n"

# Configure secrets
echo -e "${BLUE}Step 3: GitHub Secrets${NC}"
echo "You need a GitHub Personal Access Token (PAT) to trigger the manager repository."
echo "The PAT needs 'repo' and 'workflow' scopes."
echo ""

read -p "Do you want to set MANAGER_REPO_PAT now? (y/n): " SET_PAT

if [ "$SET_PAT" = "y" ]; then
    read -sp "Enter GitHub PAT: " GH_PAT
    echo ""
    gh secret set MANAGER_REPO_PAT --body "$GH_PAT"
    echo -e "${GREEN}✓ Secret configured${NC}\n"
else
    echo -e "${YELLOW}⚠ Remember to set MANAGER_REPO_PAT in repository settings${NC}\n"
fi

# Configure custom properties
echo -e "${BLUE}Step 4: Custom Properties${NC}"
echo "Setting repository custom properties for infrastructure management."
echo ""

read -p "What infrastructure tools do you want? (terraform,ansible,pulumi): " TOOLS
read -p "Customer tier? (free/startup/professional/enterprise): " TIER
read -p "Team owner (team slug): " TEAM

TIER=${TIER:-startup}

# Set repo_content_type
echo "Setting repo_content_type to app,infra (monorepo)..."
gh api repos/$ORG_NAME/$REPO_NAME/properties/values -X PUT \
  -f properties[][property_name]='repo_content_type' \
  -f properties[][value][]='app' \
  -f properties[][value][]='infra' 2>/dev/null || {
    echo -e "${YELLOW}⚠ Could not set repo_content_type (may need org admin)${NC}"
  }

# Set infrastructure_tools
if [ ! -z "$TOOLS" ]; then
    IFS=',' read -ra TOOL_ARRAY <<< "$TOOLS"
    PROP_CMD="gh api repos/$ORG_NAME/$REPO_NAME/properties/values -X PUT -f properties[][property_name]='infrastructure_tools'"
    for tool in "${TOOL_ARRAY[@]}"; do
        PROP_CMD="$PROP_CMD -f properties[][value][]='${tool// /}'"
    done
    eval "$PROP_CMD" 2>/dev/null || {
        echo -e "${YELLOW}⚠ Could not set infrastructure_tools${NC}"
    }
fi

# Set customer_tier
if [ ! -z "$TIER" ]; then
    gh api repos/$ORG_NAME/$REPO_NAME/properties/values -X PUT \
      -f properties[][property_name]='customer_tier' \
      -f properties[][value]="$TIER" 2>/dev/null || {
        echo -e "${YELLOW}⚠ Could not set customer_tier${NC}"
      }
fi

# Set team_owner
if [ ! -z "$TEAM" ]; then
    gh api repos/$ORG_NAME/$REPO_NAME/properties/values -X PUT \
      -f properties[][property_name]='team_owner' \
      -f properties[][value]="$TEAM" 2>/dev/null || {
        echo -e "${YELLOW}⚠ Could not set team_owner${NC}"
      }
fi

echo -e "${GREEN}✓ Custom properties configured${NC}\n"

# Update infra/variables.yml
echo -e "${BLUE}Step 5: Infrastructure Configuration${NC}"
read -p "Enter project name (default: $REPO_NAME): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-$REPO_NAME}

cat > infra/variables.yml << EOF
# Infrastructure Configuration for $PROJECT_NAME
# Managed by: $MANAGER_REPO

project_name: $PROJECT_NAME
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

networking:
  vpc_cidr: "10.0.0.0/16"
  availability_zones: 2

tags:
  managed_by: $MANAGER_REPO
  customer: $REPO_NAME
  tier: $TIER
EOF

echo -e "${GREEN}✓ Infrastructure configuration created${NC}\n"

# Create example app
echo -e "${BLUE}Step 6: Application Structure${NC}"
read -p "Create example application structure? (y/n): " CREATE_APP

if [ "$CREATE_APP" = "y" ]; then
    mkdir -p app/src
    
    cat > app/README.md << EOF
# $PROJECT_NAME Application

This directory contains the application code.

## Structure

\`\`\`
app/
├── src/           # Source code
├── tests/         # Test files
├── package.json   # Dependencies (if Node.js)
└── README.md      # This file
\`\`\`

## Development

Add your application code in the \`src/\` directory.

## Infrastructure

Infrastructure configuration is in \`../infra/variables.yml\`.
Changes to infrastructure will trigger automated deployment via the manager repository.
EOF

    cat > app/src/index.js << EOF
// Example application entry point
console.log('Hello from $PROJECT_NAME!');
EOF

    echo -e "${GREEN}✓ Application structure created${NC}\n"
fi

# Commit changes
echo -e "${BLUE}Step 7: Commit Configuration${NC}"
read -p "Do you want to commit these changes? (y/n): " COMMIT_CHANGES

if [ "$COMMIT_CHANGES" = "y" ]; then
    git add .
    git commit -m "chore: initial customer repo configuration"
    
    read -p "Push to remote? (y/n): " PUSH_CHANGES
    if [ "$PUSH_CHANGES" = "y" ]; then
        git push origin main
        echo -e "${GREEN}✓ Changes pushed${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠ Remember to commit and push your changes${NC}\n"
fi

# Test infrastructure trigger
echo -e "${BLUE}Step 8: Test Infrastructure Workflow${NC}"
read -p "Do you want to test the infrastructure workflow? (y/n): " TEST_WORKFLOW

if [ "$TEST_WORKFLOW" = "y" ]; then
    echo "Making a test change to trigger infrastructure deployment..."
    echo "# Test deployment" >> infra/variables.yml
    git add infra/variables.yml
    git commit -m "test: trigger infrastructure deployment"
    git push origin main
    
    echo -e "${GREEN}✓ Infrastructure workflow triggered${NC}"
    echo -e "${YELLOW}  Check Actions tab: https://github.com/$ORG_NAME/$REPO_NAME/actions${NC}\n"
fi

# Summary
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║     ✅ Setup Complete!                                       ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo "Repository: $ORG_NAME/$REPO_NAME"
echo "Manager: $ORG_NAME/$MANAGER_REPO"
echo ""
echo "What happens next:"
echo ""
echo "1. Changes to infra/ directory trigger the manager repository"
echo "2. Manager repo provisions infrastructure via Terraform"
echo "3. Status updates are posted back to this repository"
echo "4. Compliance scans run automatically"
echo ""
echo "Next steps:"
echo ""
echo "1. Add your application code to app/"
echo ""
echo "2. Update infrastructure requirements in infra/variables.yml"
echo ""
echo "3. View infrastructure status:"
echo "   https://github.com/$ORG_NAME/$REPO_NAME/actions"
echo ""
echo "4. Check custom properties:"
echo "   https://github.com/$ORG_NAME/$REPO_NAME/settings"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  - README.md - Getting started"
echo "  - infra/README.md - Infrastructure guide"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"

