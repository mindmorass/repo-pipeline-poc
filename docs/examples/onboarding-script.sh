#!/bin/bash
# Service Provider Customer Onboarding Script
# 
# Usage: ./onboarding-script.sh <customer-repo> <tier> <tools>
# Example: ./onboarding-script.sh customer-app professional terraform
# Example: ./onboarding-script.sh customer-enterprise-app enterprise terraform,ansible

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ORG="${GITHUB_ORG:-your-org}"
MANAGER_REPO="${MANAGER_REPO:-infrastructure-manager}"
TEMPLATE_REPO="${TEMPLATE_REPO:-customer-repo-template}"

# Parse arguments
CUSTOMER_REPO=$1
TIER=$2
TOOLS_ARG=$3

if [ -z "$CUSTOMER_REPO" ] || [ -z "$TIER" ] || [ -z "$TOOLS_ARG" ]; then
    echo -e "${RED}Usage: $0 <customer-repo> <tier> <tools>${NC}"
    echo "  tier: free, startup, professional, enterprise"
    echo "  tools: terraform, ansible, pulumi (comma-separated)"
    exit 1
fi

# Validate tier
case $TIER in
    free|startup|professional|enterprise)
        ;;
    *)
        echo -e "${RED}Invalid tier: $TIER${NC}"
        echo "Must be one of: free, startup, professional, enterprise"
        exit 1
        ;;
esac

# Parse tools
IFS=',' read -ra TOOLS <<< "$TOOLS_ARG"

echo -e "${GREEN}=== Customer Onboarding ===${NC}"
echo "Organization: $ORG"
echo "Customer Repo: $CUSTOMER_REPO"
echo "Tier: $TIER"
echo "Tools: ${TOOLS[*]}"
echo ""

# Step 1: Check if repo exists
echo -e "${YELLOW}Step 1: Checking if repository exists...${NC}"
if gh repo view "$ORG/$CUSTOMER_REPO" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Repository exists${NC}"
else
    echo -e "${YELLOW}Repository doesn't exist. Creating from template...${NC}"
    
    # Create from template
    gh repo create "$ORG/$CUSTOMER_REPO" \
        --template="$ORG/$TEMPLATE_REPO" \
        --private \
        --description="Customer infrastructure repository"
    
    echo -e "${GREEN}✓ Repository created from template${NC}"
fi

# Step 2: Set custom properties
echo -e "${YELLOW}Step 2: Configuring custom properties...${NC}"

# Build properties JSON
PROPERTIES_JSON='{'

# Infrastructure tools (multi-select)
PROPERTIES_JSON+='{"property_name":"infrastructure_tools","value":['
for i in "${!TOOLS[@]}"; do
    PROPERTIES_JSON+="\"${TOOLS[$i]}\""
    if [ $i -lt $((${#TOOLS[@]}-1)) ]; then
        PROPERTIES_JSON+=","
    fi
done
PROPERTIES_JSON+=']},'

# Customer tier
PROPERTIES_JSON+='{"property_name":"customer_tier","value":"'$TIER'"},'

# Default configurations
PROPERTIES_JSON+='{"property_name":"infrastructure_approval_required","value":true},'
PROPERTIES_JSON+='{"property_name":"spacelift_auto_deploy","value":false},'

# Terraform-specific (if enabled)
if [[ " ${TOOLS[@]} " =~ " terraform " ]]; then
    PROPERTIES_JSON+='{"property_name":"terraform_version","value":"latest"},'
fi

# Ansible-specific (if enabled)
if [[ " ${TOOLS[@]} " =~ " ansible " ]]; then
    PROPERTIES_JSON+='{"property_name":"ansible_inventory_path","value":"ansible/inventory/"},'
fi

# Remove trailing comma and close JSON
PROPERTIES_JSON="${PROPERTIES_JSON%,}"
PROPERTIES_JSON+='}'

# Set properties via API
gh api -X PUT "repos/$ORG/$CUSTOMER_REPO/properties/values" \
    --input - <<< "{\"properties\":$(echo $PROPERTIES_JSON | jq -c .)}"

echo -e "${GREEN}✓ Custom properties configured${NC}"

# Step 3: Add repository variables
echo -e "${YELLOW}Step 3: Setting repository variables...${NC}"

gh variable set MANAGER_REPO_OWNER --repo "$ORG/$CUSTOMER_REPO" --body "$ORG"
gh variable set MANAGER_REPO_NAME --repo "$ORG/$CUSTOMER_REPO" --body "$MANAGER_REPO"

echo -e "${GREEN}✓ Repository variables set${NC}"

# Step 4: Set up secrets (if not in same org)
echo -e "${YELLOW}Step 4: Checking secrets...${NC}"

if gh secret list --repo "$ORG/$CUSTOMER_REPO" | grep -q "MANAGER_REPO_PAT"; then
    echo -e "${GREEN}✓ MANAGER_REPO_PAT already exists${NC}"
else
    echo -e "${YELLOW}⚠ MANAGER_REPO_PAT not found${NC}"
    echo "Please manually set MANAGER_REPO_PAT secret in repository settings"
    echo "Go to: https://github.com/$ORG/$CUSTOMER_REPO/settings/secrets/actions"
fi

# Step 5: Create initial infrastructure directory
echo -e "${YELLOW}Step 5: Setting up initial infrastructure...${NC}"

# Clone repo temporarily
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

gh repo clone "$ORG/$CUSTOMER_REPO" .

# Create infra directory if it doesn't exist
if [ ! -d "infra" ]; then
    mkdir -p infra
    
    # Create basic variables.yml
    cat > infra/variables.yml <<EOF
# Infrastructure variables for $CUSTOMER_REPO
# Managed by service provider: $MANAGER_REPO

project_name: $CUSTOMER_REPO
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
  customer: $CUSTOMER_REPO
  tier: $TIER
EOF

    # Create README
    cat > infra/README.md <<EOF
# Infrastructure

This directory contains infrastructure requirements for $CUSTOMER_REPO.

## Enabled Tools

$(printf '- %s\n' "${TOOLS[@]}")

## Configuration

Edit \`variables.yml\` to change your infrastructure requirements.

Changes to this directory will automatically trigger infrastructure provisioning via the service provider.

## Support

Contact service provider for questions:
- Slack: #infrastructure-support
- Email: support@service-provider.com
EOF

    git add infra/
    git commit -m "infra: initial infrastructure setup"
    git push origin main
    
    echo -e "${GREEN}✓ Initial infrastructure committed${NC}"
else
    echo -e "${GREEN}✓ Infrastructure directory already exists${NC}"
fi

# Cleanup
cd - > /dev/null
rm -rf "$TEMP_DIR"

# Step 6: Trigger initial setup
echo -e "${YELLOW}Step 6: Triggering initial infrastructure setup...${NC}"

# Create a test commit to trigger workflow
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
gh repo clone "$ORG/$CUSTOMER_REPO" .

echo "# Auto-generated test file" > infra/.test
git add infra/.test
git commit -m "infra: trigger initial setup"
git push origin main

echo -e "${GREEN}✓ Initial setup triggered${NC}"

# Cleanup
cd - > /dev/null
rm -rf "$TEMP_DIR"

# Step 7: Summary
echo ""
echo -e "${GREEN}=== Onboarding Complete! ===${NC}"
echo ""
echo "Customer: $CUSTOMER_REPO"
echo "Tier: $TIER"
echo "Tools: ${TOOLS[*]}"
echo ""
echo "Next steps:"
echo "1. Monitor workflow: https://github.com/$ORG/$CUSTOMER_REPO/actions"
echo "2. Check Spacelift stacks are created"
echo "3. Verify customer can see commit statuses"
echo "4. Send onboarding email to customer"
echo ""
echo "Customer access:"
echo "- Repository: https://github.com/$ORG/$CUSTOMER_REPO"
echo "- Settings: https://github.com/$ORG/$CUSTOMER_REPO/settings"
echo "- Custom Properties: https://github.com/$ORG/$CUSTOMER_REPO/settings#custom-properties"
echo ""
echo -e "${GREEN}Done! 🎉${NC}"

