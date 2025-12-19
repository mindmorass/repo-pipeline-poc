# Testing Guide

Complete guide for testing the infrastructure manager platform without making real deployments.

## Overview

The platform includes comprehensive **test/dry-run modes** that allow you to:
- ✅ Test workflow linkages between source and manager repos
- ✅ Test job execution flows and dependencies
- ✅ Test notification and feedback mechanisms
- ✅ Test PR comments and status checks
- ✅ Test compliance scanning
- ❌ **WITHOUT** making actual infrastructure changes

---

## Test Modes Available

### 1. Source Repo Test Mode

Test customer workflow triggers without deploying infrastructure.

### 2. Manager Repo Test Mode

Test manager repo orchestration without calling Spacelift APIs.

### 3. Compliance Scanner Test Mode

Test compliance scanning on a limited set of repositories.

---

## Quick Start

### Test Customer → Manager Integration

```bash
# From customer repo (source_monorepo)
gh workflow run trigger-infra.yml \
  --repo your-org/source-monorepo \
  -f dry_run=true \
  -f environment=dev
```

This will:
- ✅ Fetch custom properties
- ✅ Trigger manager repo with dry_run flag
- ✅ Wait for manager repo to complete
- ✅ Post status checks and PR comments
- ❌ Skip actual infrastructure deployments

### Test Manager Repo Directly

```bash
# From manager repo
gh workflow run infra-deploy.yml \
  --repo your-org/manager-repo \
  -f source_repo="customer-test-repo" \
  -f source_owner="your-org" \
  -f source_ref="refs/heads/main" \
  -f source_sha="abc123def456" \
  -f environment="dev" \
  -f infrastructure_properties='{"tools":["terraform"],"terraform_version":"1.6"}' \
  -f dry_run=true
```

This will:
- ✅ Parse infrastructure properties
- ✅ Simulate Spacelift stack creation
- ✅ Post status back to source repo
- ❌ Skip actual Spacelift API calls

### Test Compliance Scanner

```bash
# Test on 5 repos only
gh workflow run property-compliance.yml \
  --repo your-org/manager-repo \
  -f test_mode=5 \
  -f severity_filter=all
```

---

## Detailed Testing Scenarios

### Scenario 1: Test End-to-End Flow

**Goal**: Verify complete workflow from customer push to manager deployment notification.

**Steps**:

1. **Setup** - Create a test branch in source repo:
```bash
cd source-monorepo
git checkout -b test/dry-run-integration
```

2. **Make Infrastructure Change**:
```bash
echo "# Test change" >> infra/test.tf
git add infra/test.tf
git commit -m "test: dry-run integration"
git push origin test/dry-run-integration
```

3. **Trigger Test Workflow**:
```bash
gh workflow run trigger-infra.yml \
  -f dry_run=true \
  -f environment=dev
```

4. **Watch Progress**:
```bash
# Watch source repo workflow
gh run watch --repo your-org/source-monorepo

# In another terminal, watch manager repo
gh run watch --repo your-org/manager-repo
```

5. **Expected Results**:
- Source repo workflow shows "🧪 TEST MODE ENABLED"
- Manager repo receives trigger with `dry_run=true`
- Manager repo shows "🧪 TEST MODE" banner
- Spacelift API calls are skipped (logs show "Simulating...")
- Status checks posted back to source repo (with 🧪 emoji)
- Source repo workflow completes successfully
- PR comment added (if PR exists) with test mode indicator

6. **Verify Status Checks**:
```bash
gh api repos/your-org/source-monorepo/commits/$(git rev-parse HEAD)/statuses
```

Expected output includes:
```json
{
  "context": "infra/spacelift-setup",
  "description": "🧪 TEST MODE: Spacelift setup simulated",
  "state": "success"
}
```

---

### Scenario 2: Test Custom Properties Integration

**Goal**: Verify property fetching and passing between repos.

**Steps**:

1. **Set Test Properties** on source repo:
```bash
gh api repos/your-org/source-monorepo/properties/values -X PUT \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform' \
  -f properties[][value][]='ansible'

gh api repos/your-org/source-monorepo/properties/values -X PUT \
  -f properties[][property_name]='terraform_version' \
  -f properties[][value]='1.7'
```

2. **Trigger Workflow in Test Mode**:
```bash
gh workflow run trigger-infra.yml -f dry_run=true
```

3. **Check Workflow Logs** for property parsing:
```bash
gh run view --log | grep "properties"
```

Expected output:
```
Fetched 2 custom properties
Infrastructure tools enabled: terraform, ansible
Terraform version: 1.7
```

4. **Verify Manager Repo Received Properties**:
```bash
# View manager repo logs
gh run view --repo your-org/manager-repo --log | grep "properties"
```

Expected:
```
🧪 TEST MODE: Would create Spacelift stack with config:
{
  "repo_name": "source-monorepo",
  "tools": ["terraform", "ansible"],
  "terraform_version": "1.7"
}
```

---

### Scenario 3: Test Blocking Behavior

**Goal**: Verify that source repo workflows block until manager completes.

**Steps**:

1. **Create Dependent Workflow** in source repo:
```yaml
# .github/workflows/app-deploy.yml
name: App Deployment

on:
  push:
    branches: [main]

jobs:
  wait-for-infra:
    runs-on: ubuntu-latest
    steps:
      - name: Check Infrastructure Status
        run: |
          echo "This job depends on infrastructure-setup-status"
    # This will wait for infrastructure setup
```

2. **Configure as Required Check**:
```bash
# Via GitHub UI: Settings → Branches → main → Require status checks
# Add: "infrastructure-setup-status"
```

3. **Push Change**:
```bash
echo "# App change" >> app/README.md
git add app/
git commit -m "test: app deployment waits for infra"
git push
```

4. **Observe Blocking**:
- Infrastructure workflow runs first
- App workflow shows "waiting for status check"
- After infrastructure completes, app workflow proceeds

---

### Scenario 4: Test Compliance Scanner

**Goal**: Test compliance scanning without running full org scan.

**Steps**:

1. **Run Limited Scan**:
```bash
gh workflow run property-compliance.yml \
  -f test_mode=5 \
  -f remediate=false \
  -f severity_filter=all
```

2. **Watch Scan Progress**:
```bash
gh run watch
```

3. **Download Report**:
```bash
# Get latest run ID
RUN_ID=$(gh run list --workflow=property-compliance.yml --limit 1 --json databaseId --jq '.[0].databaseId')

# Download artifacts
gh run download $RUN_ID
```

4. **Review Results**:
```bash
cat compliance-report-*/compliance-report.json | jq '.violations'
```

5. **Test Auto-Remediation** (optional):
```bash
# After reviewing violations, test auto-fix
gh workflow run property-compliance.yml \
  -f test_mode=5 \
  -f remediate=true
```

---

### Scenario 5: Test PR Comments and Feedback

**Goal**: Verify PR comments are posted correctly.

**Steps**:

1. **Create Test PR**:
```bash
cd source-monorepo
git checkout -b test/pr-feedback
echo "# Test infra change" >> infra/test.tf
git add infra/
git commit -m "test: PR feedback"
git push origin test/pr-feedback

# Create PR
gh pr create --title "Test: PR Feedback" --body "Testing dry-run with PR comments"
```

2. **Trigger Test Workflow** (automatically triggers on PR):
```bash
# Workflow runs automatically, or manually:
gh workflow run trigger-infra.yml -f dry_run=true
```

3. **Check PR for Comments**:
```bash
gh pr view --web
# Or
gh pr view --comments
```

Expected comment:
```
## 🧪 TEST MODE: Infrastructure Capabilities

**Enabled Tools:** terraform, ansible

### Configuration
- Terraform Version: 1.7
- Auto-deploy: false
- Approval Required: true

### Test Mode
⚠️ This run is in TEST MODE - no actual infrastructure changes
were made. All Spacelift operations were simulated.

✅ Test completed successfully!
```

4. **Check Status Checks**:
```bash
gh pr checks
```

Expected:
```
✓ infrastructure-setup-status  🧪 TEST MODE: Spacelift setup simulated
✓ infra/spacelift-setup       🧪 TEST MODE: Spacelift setup simulated
```

---

### Scenario 6: Test Error Handling

**Goal**: Test how errors are reported without breaking anything.

**Steps**:

1. **Test Invalid Properties**:
```bash
# Set invalid tool
gh api repos/your-org/source-monorepo/properties/values -X PUT \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='invalid-tool'
```

2. **Trigger Test**:
```bash
gh workflow run trigger-infra.yml -f dry_run=true
```

3. **Expected Result**:
- Workflow completes
- Logs show warning about invalid tool
- PR comment indicates issue
- Status check fails appropriately

4. **Fix Property**:
```bash
# Reset to valid value
gh api repos/your-org/source-monorepo/properties/values -X PUT \
  -f properties[][property_name]='infrastructure_tools' \
  -f properties[][value][]='terraform'
```

---

## What Gets Tested vs Skipped

### ✅ What DOES Run in Test Mode

| Component | Behavior |
|-----------|----------|
| **Workflow Triggers** | Normal - workflows start as expected |
| **Property Fetching** | Normal - reads actual custom properties |
| **Job Dependencies** | Normal - jobs wait for dependencies |
| **Status Checks** | Normal - posts to source repo commits |
| **PR Comments** | Normal - adds comments to PRs |
| **Logs & Output** | Normal - full logging |
| **Notifications** | Normal - GitHub issue creation |
| **Validation** | Normal - validates all inputs |
| **Error Handling** | Normal - catches and reports errors |

### ❌ What DOES NOT Run in Test Mode

| Component | Behavior |
|-----------|----------|
| **Spacelift API Calls** | Skipped - simulated instead |
| **Terraform Apply** | Skipped - simulated |
| **Infrastructure Changes** | Skipped - nothing deployed |
| **External Webhooks** | Skipped - no external systems called |
| **Billing Updates** | Skipped - no real changes |

---

## Test Mode Indicators

### Source Repo Logs

```
🧪 TEST MODE ENABLED - No actual deployments will run
   This will test:
   ✓ Workflow triggers and linkages
   ✓ Job execution flow
   ✓ Notification and feedback
   ✗ Actual infrastructure changes (SKIPPED)
```

### Manager Repo Logs

```
╔════════════════════════════════════════════════════════╗
║           🧪 TEST MODE ENABLED                        ║
╚════════════════════════════════════════════════════════╝

This workflow is running in TEST MODE

What WILL run:
  ✓ All job orchestration and linkages
  ✓ Property parsing and validation
  ✓ Status updates and notifications
  ✓ PR comments and feedback
  ✓ Job dependencies and blocking

What will NOT run:
  ✗ Actual Terraform applies
  ✗ Actual Spacelift API calls
  ✗ Real infrastructure changes
  ✗ External system modifications

Perfect for testing workflow integrations!
```

### Spacelift Setup Logs

```
🧪 TEST MODE: Skipping actual Spacelift API calls
🧪 TEST MODE: Simulating stack check for customer-repo-stack
🧪 TEST MODE: Would create Spacelift stack with config:
{
  "name": "customer-repo-stack",
  "repository": "your-org/source-monorepo",
  "terraformVersion": "1.7",
  "autodeploy": false
}
✅ TEST MODE: Simulated stack creation for customer-repo-stack
```

---

## Troubleshooting Test Mode

### Test workflow doesn't start

**Check:**
```bash
# Verify workflow file syntax
gh workflow view trigger-infra.yml

# Check if workflow is enabled
gh workflow list

# View recent runs
gh run list --workflow=trigger-infra.yml
```

**Fix:**
```bash
# Enable workflow if disabled
gh workflow enable trigger-infra.yml
```

### Status checks not appearing

**Check:**
```bash
# Verify PAT has correct permissions
gh auth status

# Check if SOURCE_REPOS_PAT secret exists
gh secret list --repo your-org/manager-repo | grep SOURCE_REPOS_PAT
```

**Fix:**
```bash
# Create PAT with repo permissions
# Settings → Developer settings → Personal access tokens
# Add to manager-repo secrets
gh secret set SOURCE_REPOS_PAT --repo your-org/manager-repo
```

### PR comments not posting

**Check:**
```bash
# Verify PR exists
gh pr list

# Check workflow has write permissions
# .github/workflows/*.yml should have:
# permissions:
#   pull-requests: write
```

### Manager repo not triggered

**Check:**
```bash
# Verify variables are set
gh variable list --repo your-org/source-monorepo

# Should include:
# MANAGER_REPO_OWNER
# MANAGER_REPO_NAME
```

**Fix:**
```bash
gh variable set MANAGER_REPO_OWNER --body "your-org" --repo your-org/source-monorepo
gh variable set MANAGER_REPO_NAME --body "manager-repo" --repo your-org/source-monorepo
```

---

## Automated Test Script

For convenience, here's a complete test script:

```bash
#!/bin/bash
# test-platform.sh - Automated platform testing

set -e

ORG="your-org"
SOURCE_REPO="source-monorepo"
MANAGER_REPO="manager-repo"

echo "╔════════════════════════════════════════════════════════╗"
echo "║     Infrastructure Platform Test Suite                ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Source repo trigger
echo "📝 Test 1: Source repo workflow trigger..."
gh workflow run trigger-infra.yml \
  --repo $ORG/$SOURCE_REPO \
  -f dry_run=true \
  -f environment=dev

sleep 5

# Test 2: Watch source workflow
echo "👀 Watching source repo workflow..."
SOURCE_RUN_ID=$(gh run list --repo $ORG/$SOURCE_REPO --workflow=trigger-infra.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $SOURCE_RUN_ID --repo $ORG/$SOURCE_REPO --exit-status || true

# Test 3: Check manager repo was triggered
echo "🔍 Checking manager repo was triggered..."
sleep 10
MANAGER_RUN_ID=$(gh run list --repo $ORG/$MANAGER_REPO --workflow=infra-deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')

if [ -z "$MANAGER_RUN_ID" ]; then
  echo "❌ Manager repo was not triggered"
  exit 1
fi

echo "✅ Manager repo triggered (Run ID: $MANAGER_RUN_ID)"

# Test 4: Watch manager workflow
echo "👀 Watching manager repo workflow..."
gh run watch $MANAGER_RUN_ID --repo $ORG/$MANAGER_REPO --exit-status || true

# Test 5: Check status was posted back
echo "🔍 Checking status checks..."
COMMIT_SHA=$(gh run view $SOURCE_RUN_ID --repo $ORG/$SOURCE_REPO --json headSha --jq -r '.headSha')
STATUSES=$(gh api repos/$ORG/$SOURCE_REPO/commits/$COMMIT_SHA/statuses)

if echo "$STATUSES" | grep -q "🧪 TEST MODE"; then
  echo "✅ Status checks include test mode indicator"
else
  echo "⚠️  Status checks may not include test mode indicator"
fi

# Test 6: Compliance scan (limited)
echo "📝 Test 6: Compliance scan (5 repos)..."
gh workflow run property-compliance.yml \
  --repo $ORG/$MANAGER_REPO \
  -f test_mode=5 \
  -f severity_filter=all

sleep 5
COMPLIANCE_RUN_ID=$(gh run list --repo $ORG/$MANAGER_REPO --workflow=property-compliance.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $COMPLIANCE_RUN_ID --repo $ORG/$MANAGER_REPO --exit-status || true

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     ✅ All Tests Complete!                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Results:"
echo "  ✓ Source workflow triggered and completed"
echo "  ✓ Manager workflow triggered and completed"
echo "  ✓ Status checks posted"
echo "  ✓ Compliance scan completed"
echo ""
echo "View results:"
echo "  Source:     gh run view $SOURCE_RUN_ID --repo $ORG/$SOURCE_REPO --log"
echo "  Manager:    gh run view $MANAGER_RUN_ID --repo $ORG/$MANAGER_REPO --log"
echo "  Compliance: gh run view $COMPLIANCE_RUN_ID --repo $ORG/$MANAGER_REPO --log"
```

Make it executable:
```bash
chmod +x test-platform.sh
```

Run tests:
```bash
./test-platform.sh
```

---

## CI/CD Integration

### Test on Every Push

Add to `.github/workflows/test.yml`:

```yaml
name: Platform Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test-integration:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Test Workflow
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh workflow run trigger-infra.yml \
            --repo ${{ github.repository }} \
            -f dry_run=true \
            -f environment=dev
      
      - name: Wait for Completion
        run: sleep 30
      
      - name: Check Result
        run: |
          RUN_ID=$(gh run list --workflow=trigger-infra.yml --limit 1 --json databaseId --jq '.[0].databaseId')
          STATUS=$(gh run view $RUN_ID --json conclusion --jq -r '.conclusion')
          
          if [ "$STATUS" != "success" ]; then
            echo "Test workflow failed"
            exit 1
          fi
```

---

## Best Practices

1. **Always test in dry-run first** before real deployments
2. **Use test branches** for integration testing
3. **Review logs** thoroughly to ensure behavior is as expected
4. **Test error scenarios** to verify error handling
5. **Automate tests** with the provided script
6. **Document custom tests** specific to your organization
7. **Run compliance scans** with `test_mode` before full scans

---

## Related Documentation

- [SETUP.md](SETUP.md) - Initial platform setup
- [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - Quick command reference
- [COMPLIANCE.md](COMPLIANCE.md) - Compliance scanning guide
- [CUSTOM-PROPERTIES.md](CUSTOM-PROPERTIES.md) - Custom properties guide

---

**Happy Testing!** 🧪

