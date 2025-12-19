#!/bin/bash
# set-repo-content-types.sh
# Script to set repo_content_type property for repositories

set -e

# Configuration
ORG="${GITHUB_ORG:-your-org}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════════╗"
echo "║     Set Repository Content Type Properties            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Organization: $ORG"
echo ""

# Function to set property
set_content_type() {
  local repo=$1
  shift
  local types=("$@")
  
  echo -e "${BLUE}Setting $repo content types: ${types[*]}${NC}"
  
  # Build gh command with multiple values
  local cmd="gh api repos/$ORG/$repo/properties/values -X PUT"
  cmd="$cmd -f properties[][property_name]='repo_content_type'"
  
  for type in "${types[@]}"; do
    cmd="$cmd -f properties[][value][]='$type'"
  done
  
  if eval "$cmd"; then
    echo -e "${GREEN}✅ Set $repo: ${types[*]}${NC}"
  else
    echo -e "${YELLOW}⚠️  Failed to set $repo${NC}"
  fi
  echo ""
}

# Example: Monorepo (both app and infra)
echo "## Example: Monorepo"
set_content_type "customer-monorepo" "app" "infra"

# Example: Infrastructure-only repos
echo "## Example: Infrastructure-only repos"
set_content_type "terraform-modules" "infra"
set_content_type "ansible-playbooks" "infra"
set_content_type "kubernetes-configs" "infra"

# Example: App-only repos (no infrastructure managed here)
echo "## Example: App-only repos"
set_content_type "frontend-webapp" "app"
set_content_type "backend-api" "app"
set_content_type "mobile-app" "app"

echo "╔════════════════════════════════════════════════════════╗"
echo "║     ✅ Repository Content Types Set                   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Verify:"
echo "  gh api repos/$ORG/REPO_NAME/properties/values | jq '.[] | select(.property_name==\"repo_content_type\")'"
echo ""
echo "Run compliance scan:"
echo "  gh workflow run property-compliance.yml --repo $ORG/manager-repo"
echo ""

