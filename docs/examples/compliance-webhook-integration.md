# Compliance Webhook Integration

How to integrate compliance scanning with external systems via webhooks.

## Use Case: Billing System Integration

When a customer's subscription changes, automatically sync their `customer_tier` property.

### Architecture

```
Billing System → Webhook → API Gateway → Sync Tool → GitHub Properties
```

### Implementation

#### 1. API Endpoint (Optional - Simple Approach)

```javascript
// api/webhooks/billing.js
const { syncProperty } = require('../../manager_repo/tools/sync-properties');

export default async function handler(req, res) {
  // Verify webhook signature
  const signature = req.headers['x-billing-signature'];
  if (!verifySignature(req.body, signature, process.env.BILLING_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { event, customer, new_tier } = req.body;
  
  if (event === 'subscription.updated') {
    // Find customer's repo
    const repoName = customer.github_repo;
    
    // Sync property
    await syncProperty('customer_tier', {
      [repoName]: new_tier
    });
    
    return res.json({ success: true, updated: repoName });
  }
  
  return res.json({ success: true, skipped: 'Not a subscription update' });
}
```

#### 2. GitHub Actions Workflow (Recommended)

```yaml
# .github/workflows/billing-sync.yml
name: Billing System Sync

on:
  repository_dispatch:
    types: [billing_update]
  workflow_dispatch:
    inputs:
      customer_repo:
        description: 'Customer repository name'
        required: true
      new_tier:
        description: 'New customer tier'
        type: choice
        options:
          - free
          - startup
          - professional
          - enterprise
        required: true

jobs:
  sync-tier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Update Customer Tier
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.SOURCE_REPOS_PAT }}
          script: |
            const repoName = '${{ github.event.inputs.customer_repo || github.event.client_payload.customer_repo }}';
            const newTier = '${{ github.event.inputs.new_tier || github.event.client_payload.new_tier }}';
            
            core.info(`Updating ${repoName} to tier: ${newTier}`);
            
            await github.rest.repos.createOrUpdateCustomPropertiesValues({
              owner: context.repo.owner,
              repo: repoName,
              properties: [
                {
                  property_name: 'customer_tier',
                  value: newTier
                }
              ]
            });
            
            core.info(`✅ Updated ${repoName} customer_tier to ${newTier}`);
      
      - name: Trigger Compliance Scan
        run: |
          gh workflow run property-compliance.yml
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### 3. Trigger from External System

```bash
# From billing system, trigger GitHub Actions via API
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/your-org/manager-repo/dispatches \
  -d '{
    "event_type": "billing_update",
    "client_payload": {
      "customer_repo": "customer-a-repo",
      "new_tier": "enterprise"
    }
  }'
```

---

## Use Case: Team Reorganization

When teams are renamed or restructured in LDAP/AD, automatically sync to GitHub.

### Webhook Flow

```
LDAP/AD Change → Webhook → Sync Tool → GitHub Teams & Properties
```

### Implementation

```yaml
# .github/workflows/ldap-sync.yml
name: LDAP Team Sync

on:
  repository_dispatch:
    types: [team_rename, team_reorganization]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  sync-teams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: cd tools && npm install
      
      - name: Sync from LDAP
        run: npm run sync:ldap
        working-directory: tools
        env:
          GITHUB_TOKEN: ${{ secrets.SOURCE_REPOS_PAT }}
          GITHUB_ORG: ${{ github.repository_owner }}
          LDAP_SERVER: ${{ secrets.LDAP_SERVER }}
          LDAP_USER: ${{ secrets.LDAP_USER }}
          LDAP_PASSWORD: ${{ secrets.LDAP_PASSWORD }}
      
      - name: Trigger Compliance Scan
        run: gh workflow run property-compliance.yml
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Use Case: Repository Transfer

When a repo is transferred between organizations or teams, update properties automatically.

### GitHub Webhook

```javascript
// GitHub webhook handler
app.post('/webhooks/github', async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;
  
  if (event === 'repository' && payload.action === 'transferred') {
    const repo = payload.repository.name;
    
    // Trigger sync
    await fetch('https://api.github.com/repos/your-org/manager-repo/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify({
        event_type: 'repo_transferred',
        client_payload: {
          repo_name: repo,
          old_owner: payload.changes.owner.from.login,
          new_owner: payload.repository.owner.login
        }
      })
    });
    
    res.json({ success: true });
  } else {
    res.json({ skipped: true });
  }
});
```

---

## Use Case: Compliance Dashboard

External dashboard that shows org-wide compliance status.

### API Endpoint for Dashboard

```javascript
// api/compliance/status.js
import { Octokit } from '@octokit/rest';

export default async function handler(req, res) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  // Get latest compliance report artifact
  const { data: runs } = await octokit.rest.actions.listWorkflowRuns({
    owner: 'your-org',
    repo: 'manager-repo',
    workflow_id: 'property-compliance.yml',
    per_page: 1
  });
  
  if (runs.workflow_runs.length === 0) {
    return res.json({ error: 'No compliance scans found' });
  }
  
  const latestRun = runs.workflow_runs[0];
  
  // Get artifacts
  const { data: artifacts } = await octokit.rest.actions.listWorkflowRunArtifacts({
    owner: 'your-org',
    repo: 'manager-repo',
    run_id: latestRun.id
  });
  
  const reportArtifact = artifacts.artifacts.find(a => 
    a.name.startsWith('compliance-report')
  );
  
  if (!reportArtifact) {
    return res.json({ error: 'No compliance report found' });
  }
  
  // Download and return report
  const { data: report } = await octokit.rest.actions.downloadArtifact({
    owner: 'your-org',
    repo: 'manager-repo',
    artifact_id: reportArtifact.id,
    archive_format: 'zip'
  });
  
  // Parse and return
  res.json({
    scan_date: latestRun.created_at,
    status: latestRun.conclusion,
    report_url: reportArtifact.archive_download_url
  });
}
```

---

## Security Considerations

### 1. Verify Webhook Signatures

Always verify incoming webhooks:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

### 2. Rate Limiting

Prevent abuse:

```javascript
// Simple rate limiter
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  
  const requests = rateLimitMap.get(ip).filter(time => now - time < windowMs);
  
  if (requests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  requests.push(now);
  rateLimitMap.set(ip, requests);
  return true;
}
```

### 3. Audit Logging

Log all webhook-triggered changes:

```javascript
const auditLog = {
  timestamp: new Date().toISOString(),
  source: 'billing_webhook',
  action: 'property_update',
  repo: repoName,
  property: 'customer_tier',
  old_value: oldTier,
  new_value: newTier,
  triggered_by: 'billing-system'
};

await logToCloudWatch(auditLog);
```

---

## Testing Webhooks

### Local Testing with ngrok

```bash
# Start local webhook server
node webhook-server.js

# Expose with ngrok
ngrok http 3000

# Use ngrok URL in billing system webhook config
https://abc123.ngrok.io/webhooks/billing
```

### Test Payloads

```bash
# Test billing update
curl -X POST http://localhost:3000/webhooks/billing \
  -H "Content-Type: application/json" \
  -H "X-Billing-Signature: test-signature" \
  -d '{
    "event": "subscription.updated",
    "customer": {
      "id": "cust_123",
      "github_repo": "customer-a-repo"
    },
    "new_tier": "enterprise",
    "timestamp": "2024-12-19T00:00:00Z"
  }'

# Test team rename
curl -X POST http://localhost:3000/webhooks/ldap \
  -H "Content-Type: application/json" \
  -d '{
    "event": "team.renamed",
    "old_name": "platform-team",
    "new_name": "infrastructure-team",
    "affected_members": 15
  }'
```

---

## Monitoring

### Webhook Success Rate

Track webhook processing:

```javascript
const metrics = {
  total_webhooks: 0,
  successful: 0,
  failed: 0,
  avg_processing_time_ms: 0
};

// After each webhook
await sendMetricToDatadog('webhook.processed', 1, {
  source: 'billing',
  status: 'success'
});
```

### Dashboard Alerts

Alert when webhook fails:

```javascript
if (result.status === 'failed') {
  await sendSlackAlert({
    channel: '#ops-alerts',
    message: `⚠️ Billing webhook failed for customer: ${customer.name}`,
    severity: 'high'
  });
}
```

---

## Examples Directory

For complete working examples:
- `examples/webhooks/billing-server.js` - Complete webhook server
- `examples/webhooks/test-payloads/` - Test JSON payloads
- `examples/webhooks/docker-compose.yml` - Local testing setup

