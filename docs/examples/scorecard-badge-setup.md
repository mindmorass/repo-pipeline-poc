# Scorecard Badge Setup

This guide shows how to add compliance score badges to repository READMEs, making scores visible to developers and stakeholders.

## Overview

Badges provide at-a-glance visibility of compliance status:

```markdown
[![Unified Compliance](https://img.shields.io/badge/compliance-7.9%2F10-green)]()
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/your-org/your-repo)]()
```

---

## Option 1: Static Badge (Shields.io)

### Simple Static Badge

Add to your repository's `README.md`:

```markdown
## Compliance Status

[![Compliance Score](https://img.shields.io/badge/compliance-8.2%2F10-brightgreen)](https://github.com/your-org/manager-repo/security/code-scanning)
[![Last Scanned](https://img.shields.io/badge/last%20scanned-2024--12--19-blue)](https://github.com/your-org/manager-repo/actions/workflows/unified-compliance.yml)
```

**Pros**: Simple, no infrastructure needed  
**Cons**: Manual update required (not dynamic)

### Color-Coded by Score

```markdown
<!-- Excellent (9-10) -->

![Compliance](https://img.shields.io/badge/compliance-9.5%2F10-brightgreen)

<!-- Good (7-9) -->

![Compliance](https://img.shields.io/badge/compliance-7.8%2F10-green)

<!-- Fair (5-7) -->

![Compliance](https://img.shields.io/badge/compliance-6.2%2F10-yellow)

<!-- Poor (3-5) -->

![Compliance](https://img.shields.io/badge/compliance-4.1%2F10-orange)

<!-- Critical (0-3) -->

![Compliance](https://img.shields.io/badge/compliance-2.3%2F10-red)
```

---

## Option 2: Dynamic Badge (GitHub API Endpoint)

### Create Badge Endpoint

Create a simple API endpoint that serves current score:

```javascript
// manager_repo/tools/badge-server.js
const express = require("express");
const { Octokit } = require("@octokit/rest");
const app = express();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

app.get("/badge/:org/:repo", async (req, res) => {
  try {
    const { org, repo } = req.params;

    // Fetch latest unified compliance run
    const { data: runs } = await octokit.actions.listWorkflowRuns({
      owner: org,
      repo: "manager-repo",
      workflow_id: "unified-compliance.yml",
      status: "completed",
      per_page: 1,
    });

    if (runs.workflow_runs.length === 0) {
      return res.json({
        schemaVersion: 1,
        label: "compliance",
        message: "unknown",
        color: "lightgrey",
      });
    }

    // Download artifacts and parse score
    const runId = runs.workflow_runs[0].id;
    const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({
      owner: org,
      repo: "manager-repo",
      run_id: runId,
    });

    // Parse score from artifact (simplified - would need actual download/parse)
    const score = 7.9; // Parse from downloaded artifact

    // Determine color
    let color = "red";
    if (score >= 9) color = "brightgreen";
    else if (score >= 7) color = "green";
    else if (score >= 5) color = "yellow";
    else if (score >= 3) color = "orange";

    // Return Shields.io endpoint JSON format
    res.json({
      schemaVersion: 1,
      label: "compliance",
      message: `${score}/10`,
      color: color,
    });
  } catch (error) {
    res.status(500).json({
      schemaVersion: 1,
      label: "compliance",
      message: "error",
      color: "lightgrey",
    });
  }
});

app.listen(3000, () => console.log("Badge server running on port 3000"));
```

### Use Dynamic Badge

```markdown
[![Compliance Score](https://img.shields.io/endpoint?url=https://your-badge-server.com/badge/your-org/your-repo)](https://github.com/your-org/manager-repo/security/code-scanning)
```

---

## Option 3: GitHub Actions Auto-Update

### Workflow to Update Badge in README

```yaml
# manager_repo/.github/workflows/update-badges.yml
name: Update Compliance Badges

on:
  workflow_run:
    workflows: ["Unified Compliance with Scorecard"]
    types: [completed]

jobs:
  update-badges:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}

    steps:
      - uses: actions/checkout@v4

      - name: Download Compliance Results
        uses: actions/github-script@v7
        with:
          script: |
            const artifacts = await github.rest.actions.listWorkflowRunArtifacts({
              owner: context.repo.owner,
              repo: context.repo.repo,
              run_id: ${{ github.event.workflow_run.id }}
            });

            const artifact = artifacts.data.artifacts.find(a => 
              a.name === 'unified-results'
            );

            if (artifact) {
              const download = await github.rest.actions.downloadArtifact({
                owner: context.repo.owner,
                repo: context.repo.repo,
                artifact_id: artifact.id,
                archive_format: 'zip'
              });
              
              // Save and extract
              require('fs').writeFileSync('artifact.zip', Buffer.from(download.data));
            }

      - name: Extract Score
        id: score
        run: |
          unzip -o artifact.zip
          SCORE=$(jq -r '.runs[0].properties.aggregateScore' scorecard-results-merged.sarif)
          echo "score=$SCORE" >> $GITHUB_OUTPUT

          # Determine color
          if (( $(echo "$SCORE >= 9" | bc -l) )); then
            COLOR="brightgreen"
          elif (( $(echo "$SCORE >= 7" | bc -l) )); then
            COLOR="green"
          elif (( $(echo "$SCORE >= 5" | bc -l) )); then
            COLOR="yellow"
          elif (( $(echo "$SCORE >= 3" | bc -l) )); then
            COLOR="orange"
          else
            COLOR="red"
          fi

          echo "color=$COLOR" >> $GITHUB_OUTPUT

      - name: Update Customer Repo READMEs
        uses: actions/github-script@v7
        env:
          SCORE: ${{ steps.score.outputs.score }}
          COLOR: ${{ steps.score.outputs.color }}
        with:
          github-token: ${{ secrets.SOURCE_REPOS_PAT }}
          script: |
            const score = process.env.SCORE;
            const color = process.env.COLOR;

            // Fetch all customer repos
            const { data: repos } = await github.rest.repos.listForOrg({
              org: context.repo.owner,
              type: 'all'
            });

            const customerRepos = repos.filter(r => 
              r.name.startsWith('customer-') && !r.archived
            );

            for (const repo of customerRepos) {
              try {
                // Fetch README
                const { data: readme } = await github.rest.repos.getContent({
                  owner: context.repo.owner,
                  repo: repo.name,
                  path: 'README.md'
                });
                
                const content = Buffer.from(readme.content, 'base64').toString('utf8');
                
                // Update badge
                const badgeRegex = /!\[Compliance Score\]\(https:\/\/img\.shields\.io\/badge\/compliance-[\d.]+%2F10-\w+\)/;
                const newBadge = `![Compliance Score](https://img.shields.io/badge/compliance-${score}%2F10-${color})`;
                
                if (badgeRegex.test(content)) {
                  const updatedContent = content.replace(badgeRegex, newBadge);
                  
                  await github.rest.repos.createOrUpdateFileContents({
                    owner: context.repo.owner,
                    repo: repo.name,
                    path: 'README.md',
                    message: `docs: update compliance badge to ${score}/10`,
                    content: Buffer.from(updatedContent).toString('base64'),
                    sha: readme.sha
                  });
                  
                  core.info(`✅ Updated badge in ${repo.name}`);
                }
                
              } catch (error) {
                core.warning(`Failed to update ${repo.name}: ${error.message}`);
              }
            }
```

---

## Option 4: OpenSSF Scorecard Official Badge

For the OpenSSF Scorecard portion only:

### Enable Scorecard Badge

In `manager_repo/.github/workflows/unified-compliance.yml`, update the Scorecard step:

```yaml
- name: Run Scorecard Analysis
  uses: ossf/scorecard-action@v2
  with:
    results_file: scorecard-results.sarif
    results_format: sarif
    repo_token: ${{ secrets.SOURCE_REPOS_PAT }}
    publish_results: true # Changed from false
```

### Add Badge to README

```markdown
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/your-org/your-repo/badge)](https://securityscorecards.dev/viewer/?uri=github.com/your-org/your-repo)
```

**Note**: This only shows the Scorecard score, not the unified score including custom properties.

---

## Complete Badge Suite Example

### For Manager Repo

```markdown
# Infrastructure Manager

[![Unified Compliance](https://img.shields.io/badge/compliance-8.2%2F10-green)](https://github.com/your-org/manager-repo/security/code-scanning)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/your-org/manager-repo/badge)](https://securityscorecards.dev/viewer/?uri=github.com/your-org/manager-repo)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Central infrastructure management and compliance orchestration.

## Compliance Status

| Metric               | Score     | Target | Status |
| -------------------- | --------- | ------ | ------ |
| Unified Score        | 8.2/10    | ≥7.0   | ✅     |
| OpenSSF Scorecard    | 8.5/10    | ≥7.0   | ✅     |
| Custom Properties    | 7.9/10    | ≥7.0   | ✅     |
| Repositories Scanned | 142       | -      | -      |
| Compliant Repos      | 128 (90%) | ≥85%   | ✅     |

**Last Updated**: 2024-12-19
```

### For Customer Repo

```markdown
# Customer Infrastructure

[![Compliance Score](https://img.shields.io/badge/compliance-9.1%2F10-brightgreen)](https://github.com/your-org/manager-repo/security/code-scanning)
[![Infrastructure Status](https://img.shields.io/badge/infrastructure-provisioned-success)](https://github.com/your-org/customer-repo/actions)
[![Spacelift](https://img.shields.io/badge/spacelift-enabled-blue)](https://your-org.app.spacelift.io/stack/customer-repo-main)

Infrastructure as Code for Customer XYZ.

## Status

- ✅ **Compliance**: 9.1/10 (Excellent)
- ✅ **Custom Properties**: All required properties set
- ✅ **Infrastructure Tools**: Terraform, Ansible
- ✅ **Last Scanned**: 2024-12-19
```

---

## Badge Automation Script

### Standalone Script

```bash
#!/bin/bash
# update-readme-badges.sh
# Updates compliance badge in repository READMEs

SCORE=$1
ORG=$2
REPO_PATTERN=${3:-"customer-*"}

if [ -z "$SCORE" ] || [ -z "$ORG" ]; then
  echo "Usage: $0 <score> <org> [repo_pattern]"
  exit 1
fi

# Determine color
if (( $(echo "$SCORE >= 9" | bc -l) )); then
  COLOR="brightgreen"
elif (( $(echo "$SCORE >= 7" | bc -l) )); then
  COLOR="green"
elif (( $(echo "$SCORE >= 5" | bc -l) )); then
  COLOR="yellow"
elif (( $(echo "$SCORE >= 3" | bc -l) )); then
  COLOR="orange"
else
  COLOR="red"
fi

echo "Updating badges with score: $SCORE ($COLOR)"

# Find matching repos
gh repo list $ORG --json name,isArchived --limit 1000 \
  | jq -r ".[] | select(.name | test(\"$REPO_PATTERN\")) | select(.isArchived == false) | .name" \
  | while read REPO; do

  echo "Processing $REPO..."

  # Clone repo
  TEMP_DIR=$(mktemp -d)
  cd $TEMP_DIR

  gh repo clone $ORG/$REPO .

  if [ -f "README.md" ]; then
    # Update badge
    sed -i.bak "s|!\[Compliance Score\](https://img.shields.io/badge/compliance-[^)]*)|![Compliance Score](https://img.shields.io/badge/compliance-${SCORE}%2F10-${COLOR})|g" README.md

    if ! diff README.md README.md.bak > /dev/null 2>&1; then
      git add README.md
      git commit -m "docs: update compliance badge to ${SCORE}/10"
      git push origin main
      echo "✅ Updated $REPO"
    else
      echo "⏭️  No change needed for $REPO"
    fi
  fi

  cd -
  rm -rf $TEMP_DIR
done

echo "Done!"
```

**Usage**:

```bash
# Update all customer repos with score 7.9
./update-readme-badges.sh 7.9 your-org "customer-.*"
```

---

## Badge Templates

### Minimal

```markdown
[![Compliance](https://img.shields.io/badge/compliance-8.2%2F10-green)]()
```

### With Link

```markdown
[![Compliance](https://img.shields.io/badge/compliance-8.2%2F10-green)](https://github.com/your-org/manager-repo/security/code-scanning)
```

### With All Metrics

```markdown
[![Unified Score](https://img.shields.io/badge/unified-8.2%2F10-green)]()
[![Scorecard](https://img.shields.io/badge/scorecard-8.5%2F10-green)]()
[![Properties](https://img.shields.io/badge/properties-7.9%2F10-green)]()
[![Status](https://img.shields.io/badge/status-compliant-success)]()
```

### Custom Style

```markdown
<!-- Flat style -->

[![Compliance](https://img.shields.io/badge/compliance-8.2%2F10-green?style=flat)]()

<!-- Flat-square style -->

[![Compliance](https://img.shields.io/badge/compliance-8.2%2F10-green?style=flat-square)]()

<!-- For-the-badge style -->

[![Compliance](https://img.shields.io/badge/compliance-8.2%2F10-green?style=for-the-badge)]()

<!-- Plastic style -->

[![Compliance](https://img.shields.io/badge/compliance-8.2%2F10-green?style=plastic)]()
```

---

## Best Practices

1. **Keep badges up-to-date**: Automate updates via GitHub Actions
2. **Link to details**: Make badges clickable to Security tab or compliance report
3. **Use color coding**: Help users quickly identify status
4. **Show trends**: Consider adding "improving/declining" indicators
5. **Document thresholds**: Explain what each score range means
6. **Update on every scan**: Keep badges synced with latest compliance run

---

## Troubleshooting

### Badge Shows Old Score

**Cause**: Cache or stale data

**Fix**:

```markdown
<!-- Add cache buster -->

[![Compliance](https://img.shields.io/badge/compliance-8.2%2F10-green?v=2024-12-19)]()
```

### Badge Not Updating Automatically

**Cause**: Workflow not triggered

**Fix**:

```bash
# Check workflow runs
gh run list --workflow=update-badges.yml

# Manually trigger
gh workflow run update-badges.yml
```

### Wrong Color for Score

**Cause**: Incorrect threshold logic

**Fix**: Review color determination in workflow:

```bash
if (( $(echo "$SCORE >= 9" | bc -l) )); then
  COLOR="brightgreen"
# ... etc
fi
```

---

## Related

- [SCORECARD-INTEGRATION.md](../SCORECARD-INTEGRATION.md) - Full integration docs
- [Shields.io](https://shields.io/) - Badge service
- [OpenSSF Scorecard Badge](https://github.com/ossf/scorecard#badges)
