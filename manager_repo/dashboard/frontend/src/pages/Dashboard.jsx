import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Dashboard.css';

const COLORS = {
  excellent: '#22c55e',
  good: '#3b82f6',
  fair: '#f59e0b',
  poor: '#ef4444'
};

const GRADE_COLORS = {
  'A+': '#22c55e',
  'B': '#3b82f6',
  'C': '#f59e0b',
  'D': '#ff8042',
  'F': '#ef4444'
};

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orgScore, setOrgScore] = useState(null);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [orgRes, summaryRes, trendsRes] = await Promise.all([
        axios.get('/api/scores/organization'),
        axios.get('/api/scores/summary'),
        axios.get('/api/trends/organization?days=30')
      ]);

      setOrgScore(orgRes.data);
      setSummary(summaryRes.data);
      setTrends(trendsRes.data.trends || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>⚠️ Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  const distributionData = summary?.distribution ? [
    { name: 'Excellent (9-10)', value: summary.distribution.excellent.count, color: COLORS.excellent },
    { name: 'Good (7-9)', value: summary.distribution.good.count, color: COLORS.good },
    { name: 'Fair (5-7)', value: summary.distribution.fair.count, color: COLORS.fair },
    { name: 'Poor (0-5)', value: summary.distribution.poor.count, color: COLORS.poor }
  ] : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Organization Overview</h2>
          <p className="subtitle">Unified compliance and security scores across all repositories</p>
        </div>
        <button onClick={fetchDashboardData} className="btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-header">
            <span className="metric-icon">🎯</span>
            <span className="metric-label">Unified Score</span>
          </div>
          <div className="metric-value">
            {orgScore?.unified_score?.toFixed(1)}/10
          </div>
          <div className="metric-grade" style={{ backgroundColor: GRADE_COLORS[orgScore?.grade] }}>
            Grade: {orgScore?.grade}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🔒</span>
            <span className="metric-label">Scorecard Score</span>
          </div>
          <div className="metric-value">
            {orgScore?.scorecard_score?.toFixed(1) || 'N/A'}/10
          </div>
          <div className="metric-detail">Security Checks</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">✅</span>
            <span className="metric-label">Compliance Score</span>
          </div>
          <div className="metric-value">
            {orgScore?.compliance_score?.toFixed(1)}/10
          </div>
          <div className="metric-detail">Custom Properties</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">📦</span>
            <span className="metric-label">Repositories</span>
          </div>
          <div className="metric-value">
            {orgScore?.compliant_repos}/{orgScore?.total_repos}
          </div>
          <div className="metric-detail">
            {orgScore?.compliance_percentage}% Compliant
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Trend Chart */}
        <div className="chart-card">
          <h3>30-Day Score Trend</h3>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="unified_score" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Unified Score"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="compliance_score" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Compliance"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">
              <p>No trend data available yet</p>
              <p className="text-sm">Run compliance scans multiple times to build trend data</p>
            </div>
          )}
        </div>

        {/* Distribution Pie Chart */}
        <div className="chart-card">
          <h3>Score Distribution</h3>
          {distributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No distribution data</div>
          )}
        </div>
      </div>

      {/* Top and Bottom Performers */}
      <div className="performers-grid">
        <div className="performer-card">
          <h3>🏆 Top Performers</h3>
          {summary?.top_performers?.length > 0 ? (
            <ul className="performer-list">
              {summary.top_performers.map((repo, idx) => (
                <li key={idx}>
                  <Link to={`/repositories/${repo.name}`}>{repo.name}</Link>
                  <span className={`badge grade-${repo.grade.replace('+', 'plus')}`}>
                    {repo.score.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No data available</p>
          )}
        </div>

        <div className="performer-card alert">
          <h3>⚠️ Needs Attention</h3>
          {summary?.bottom_performers?.length > 0 ? (
            <ul className="performer-list">
              {summary.bottom_performers.map((repo, idx) => (
                <li key={idx}>
                  <Link to={`/repositories/${repo.name}`}>{repo.name}</Link>
                  <span className={`badge grade-${repo.grade.replace('+', 'plus')}`}>
                    {repo.score.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">All repositories performing well! ✅</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-card">
        <h3>Compliance Statistics</h3>
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-value">{summary?.compliance?.total_violations || 0}</div>
            <div className="stat-label">Total Violations</div>
          </div>
          <div className="stat">
            <div className="stat-value">{summary?.compliance?.repos_with_violations || 0}</div>
            <div className="stat-label">Repos with Violations</div>
          </div>
          <div className="stat">
            <div className="stat-value">{summary?.compliance?.fully_compliant || 0}</div>
            <div className="stat-label">Fully Compliant</div>
          </div>
          <div className="stat">
            <div className="stat-value">{summary?.overview?.median_score?.toFixed(1) || 'N/A'}</div>
            <div className="stat-label">Median Score</div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="footer-info">
        <p>Last updated: {orgScore?.last_updated ? new Date(orgScore.last_updated).toLocaleString() : 'N/A'}</p>
      </div>
    </div>
  );
}

export default Dashboard;

