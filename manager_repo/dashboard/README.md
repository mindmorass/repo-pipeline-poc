# Compliance Dashboard

A web-based dashboard for visualizing unified compliance scores across your GitHub organization.

## 🎯 Overview

The Compliance Dashboard aggregates OpenSSF Scorecard security checks and GitHub Custom Properties compliance data to provide a unified view of your organization's repository health.

### Features

- **📊 Organization Overview**: Single unified score across all repositories
- **📈 Trend Analysis**: Track score changes over time
- **🏆 Top/Bottom Performers**: Identify best and worst performing repos
- **🎯 Score Distribution**: Visualize how repos are distributed across grades
- **📦 Repository Details**: Drill down into individual repository scores
- **⚡ Real-time Updates**: Automatically updated after each compliance scan
- **📱 Responsive Design**: Works on desktop, tablet, and mobile

## 🏗️ Architecture

```
Dashboard
├─ Backend (Node.js/Express)
│  ├─ REST API for scores, repositories, trends
│  ├─ SQLite database for historical data
│  └─ GitHub API integration
│
├─ Frontend (React + Vite)
│  ├─ Dashboard views
│  ├─ Charts (Recharts)
│  └─ Responsive UI
│
└─ Data Pipeline (GitHub Actions)
   ├─ Triggered after unified-compliance scan
   ├─ Parses SARIF + compliance JSON
   └─ Updates dashboard database
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- GitHub Personal Access Token with `repo` and `read:org` scopes
- Unified compliance workflow running (generates the data)

### 1. Backend Setup

```bash
cd manager_repo/dashboard/backend

# Install dependencies
npm install

# Create .env file
cp env.example.txt .env

# Edit .env with your settings
nano .env

# Initialize database
mkdir -p data

# Start server
npm start
```

**Environment Variables**:

```bash
NODE_ENV=development
PORT=3000
GITHUB_TOKEN=ghp_your_token_here
GITHUB_ORG=your-organization-name
FRONTEND_URL=http://localhost:3001
DB_PATH=./data/compliance.db
```

### 2. Frontend Setup

```bash
cd manager_repo/dashboard/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:3001`

### 3. Initial Data Load

To populate the dashboard with initial data:

```bash
# Option 1: Run unified compliance scan
gh workflow run unified-compliance.yml --repo your-org/manager-repo

# Option 2: Manually import data
# After compliance scan completes, the update-dashboard workflow 
# will automatically send data to the API
```

## 📊 API Endpoints

### Scores

- `GET /api/scores/organization` - Get organization-wide score
- `GET /api/scores/summary` - Get summary statistics
- `GET /api/scores/below-threshold?threshold=7.0` - Get low-scoring repos

### Repositories

- `GET /api/repositories` - List all repositories with scores
- `GET /api/repositories/:name` - Get details for a repository
- `GET /api/repositories/:name/history?days=30` - Get historical scores

### Trends

- `GET /api/trends/organization?days=30` - Get organization score trends
- `GET /api/trends/distribution?days=30` - Get distribution over time
- `GET /api/trends/comparison` - Compare current vs. baseline

### Health

- `GET /api/health` - Health check

### Example Response

```json
{
  "unified_score": 8.2,
  "scorecard_score": 8.5,
  "compliance_score": 7.9,
  "total_repos": 142,
  "compliant_repos": 128,
  "compliance_percentage": 90,
  "distribution": {
    "excellent": 68,
    "good": 42,
    "fair": 18,
    "poor": 14
  },
  "grade": "B",
  "last_updated": "2024-12-19"
}
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
cd manager_repo/dashboard

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Using Docker Manually

```bash
# Build backend
cd backend
docker build -t compliance-dashboard-api .

# Build frontend
cd ../frontend
docker build -t compliance-dashboard-ui .

# Run backend
docker run -d \
  -p 3000:3000 \
  -e GITHUB_TOKEN=$GITHUB_TOKEN \
  -e GITHUB_ORG=your-org \
  -v $(pwd)/data:/app/data \
  compliance-dashboard-api

# Run frontend
docker run -d \
  -p 3001:80 \
  compliance-dashboard-ui
```

## 🔄 Data Updates

The dashboard is automatically updated via the `update-dashboard.yml` workflow:

1. **Trigger**: Runs after `unified-compliance.yml` completes
2. **Process**: Downloads artifacts, parses results, updates database
3. **Frequency**: Every time compliance scan runs

### Manual Data Import

If you need to manually import data:

```bash
# Download compliance artifacts
gh run download <run-id> --repo your-org/manager-repo

# Send to API
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d @dashboard-data.json
```

## 📈 Dashboard Views

### 1. Overview Dashboard

**URL**: `/`

**Shows**:
- Organization unified score (large card)
- Component scores (Scorecard, Compliance)
- 30-day trend chart
- Score distribution pie chart
- Top 5 and bottom 5 performers
- Compliance statistics

### 2. Repositories List

**URL**: `/repositories`

**Shows**:
- Searchable/filterable list of all repositories
- Sort by: score, name, violations
- Filter by: grade (A+, B, C, D, F), violations
- Quick actions: view details, see trends

### 3. Repository Details

**URL**: `/repositories/:name`

**Shows**:
- Detailed scores (unified, scorecard, compliance)
- Violation breakdown
- 90-day historical trend
- Trend analysis (improving/declining/stable)
- Recent scans

### 4. Trends Analysis

**URL**: `/trends`

**Shows**:
- Organization-wide trends over 30/60/90 days
- Distribution changes over time
- Comparison with baseline
- Improvement velocity
- Recommendations

## 🎨 Customization

### Branding

Edit `frontend/src/App.jsx`:

```jsx
<h1>
  <span className="icon">📊</span> Your Company Compliance Dashboard
</h1>
```

### Colors

Edit `frontend/src/styles/Dashboard.css`:

```css
:root {
  --color-primary: #3b82f6;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}
```

### Score Thresholds

Edit `backend/src/routes/scores.js`:

```javascript
function getGrade(score) {
  if (score >= 9) return 'A+';
  if (score >= 8) return 'A';   // Add custom grades
  if (score >= 7) return 'B';
  // ...
}
```

## 🔧 Configuration

### Backend Configuration

**File**: `backend/env.example.txt`

```bash
# Server
PORT=3000                    # API port
NODE_ENV=production          # Environment

# GitHub
GITHUB_TOKEN=ghp_xxx         # PAT with repo + read:org
GITHUB_ORG=your-org          # Organization name

# Database
DB_PATH=./data/compliance.db # SQLite database path

# CORS
FRONTEND_URL=http://localhost:3001  # Frontend URL

# Cache
CACHE_TTL=300               # Cache duration (seconds)
```

### Frontend Configuration

**File**: `frontend/vite.config.js`

```javascript
export default defineConfig({
  server: {
    port: 3001,              // Dev server port
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // Backend URL
        changeOrigin: true
      }
    }
  }
});
```

## 📊 Database Schema

### `scores` Table

Stores individual repository scores:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| repo_name | TEXT | Repository name |
| unified_score | REAL | Unified score (0-10) |
| scorecard_score | REAL | Scorecard score (0-10) |
| compliance_score | REAL | Compliance score (0-10) |
| violations_count | INTEGER | Number of violations |
| scan_date | TEXT | Date of scan (ISO 8601) |
| created_at | TEXT | Record creation timestamp |

### `org_scores` Table

Stores organization-wide scores:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| unified_score | REAL | Org unified score |
| scorecard_score | REAL | Org scorecard score |
| compliance_score | REAL | Org compliance score |
| total_repos | INTEGER | Total repos scanned |
| compliant_repos | INTEGER | Fully compliant repos |
| distribution_* | INTEGER | Repos in each category |
| scan_date | TEXT | Date of scan |
| created_at | TEXT | Record creation timestamp |

## 🚨 Troubleshooting

### Dashboard Shows "No Data"

**Cause**: Database is empty

**Fix**:
```bash
# Run compliance scan
gh workflow run unified-compliance.yml --repo your-org/manager-repo

# Wait for update-dashboard workflow to complete
# Check database
sqlite3 backend/data/compliance.db "SELECT COUNT(*) FROM scores;"
```

### API Returns 404

**Cause**: Backend not running or wrong port

**Fix**:
```bash
# Check backend is running
curl http://localhost:3000/api/health

# Check logs
cd backend && npm start
```

### Frontend Can't Connect to API

**Cause**: CORS or proxy misconfiguration

**Fix**:
```javascript
// frontend/vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',  // Verify backend URL
      changeOrigin: true
    }
  }
}
```

### Data Not Updating

**Cause**: update-dashboard workflow not running

**Fix**:
```bash
# Manually trigger update
gh workflow run update-dashboard.yml --repo your-org/manager-repo

# Check workflow status
gh run list --workflow=update-dashboard.yml --limit 5
```

## 🔐 Security

### API Authentication (Optional)

Add API key authentication:

```javascript
// backend/src/server.js
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Production Deployment

For production:

1. **Use HTTPS**: Deploy behind nginx/Cloudflare
2. **Secure Secrets**: Use environment variables, never commit
3. **Rate Limiting**: Add rate limiting to API
4. **Database Backups**: Regular backups of SQLite database
5. **Monitor**: Set up monitoring and alerts

## 📝 Development

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build
# Output: dist/

# Build backend (if using Docker)
cd backend
docker build -t compliance-dashboard-api .
```

### Adding New Features

1. **Backend**: Add routes in `backend/src/routes/`
2. **Frontend**: Add pages in `frontend/src/pages/`
3. **Database**: Update schema in `backend/src/database.js`

## 🤝 Contributing

See main project [CONTRIBUTING.md](../../CONTRIBUTING.md)

## 📄 License

Apache 2.0 - See [LICENSE](../../LICENSE)

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/manager-repo/issues)
- **Docs**: [SCORECARD-INTEGRATION.md](../../docs/SCORECARD-INTEGRATION.md)
- **Slack**: #infrastructure-compliance

---

**Related Documentation**:
- [SCORECARD-INTEGRATION.md](../../docs/SCORECARD-INTEGRATION.md) - Integration guide
- [COMPLIANCE.md](../../docs/COMPLIANCE.md) - Compliance system
- [QUICK-REFERENCE.md](../../docs/QUICK-REFERENCE.md) - Quick commands

