const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "../data/compliance.db");

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error("Error opening database:", err);
          reject(err);
        } else {
          console.log("✅ Database connected");
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const createScoresTable = `
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_name TEXT NOT NULL,
        unified_score REAL NOT NULL,
        scorecard_score REAL,
        compliance_score REAL NOT NULL,
        violations_count INTEGER DEFAULT 0,
        scan_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createOrgScoresTable = `
      CREATE TABLE IF NOT EXISTS org_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unified_score REAL NOT NULL,
        scorecard_score REAL,
        compliance_score REAL NOT NULL,
        total_repos INTEGER NOT NULL,
        compliant_repos INTEGER NOT NULL,
        distribution_excellent INTEGER DEFAULT 0,
        distribution_good INTEGER DEFAULT 0,
        distribution_fair INTEGER DEFAULT 0,
        distribution_poor INTEGER DEFAULT 0,
        scan_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_scores_repo ON scores(repo_name);
      CREATE INDEX IF NOT EXISTS idx_scores_date ON scores(scan_date);
      CREATE INDEX IF NOT EXISTS idx_org_scores_date ON org_scores(scan_date);
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createScoresTable);
        this.db.run(createOrgScoresTable);
        this.db.exec(createIndexes, (err) => {
          if (err) {
            console.error("Error creating tables:", err);
            reject(err);
          } else {
            console.log("✅ Database tables ready");
            resolve();
          }
        });
      });
    });
  }

  // Insert repository score
  async insertRepoScore(repoData) {
    const sql = `
      INSERT INTO scores (
        repo_name, unified_score, scorecard_score, compliance_score, 
        violations_count, scan_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(
        sql,
        [
          repoData.repo_name,
          repoData.unified_score,
          repoData.scorecard_score,
          repoData.compliance_score,
          repoData.violations_count || 0,
          repoData.scan_date,
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Insert organization score
  async insertOrgScore(orgData) {
    const sql = `
      INSERT INTO org_scores (
        unified_score, scorecard_score, compliance_score,
        total_repos, compliant_repos,
        distribution_excellent, distribution_good, distribution_fair, distribution_poor,
        scan_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(
        sql,
        [
          orgData.unified_score,
          orgData.scorecard_score,
          orgData.compliance_score,
          orgData.total_repos,
          orgData.compliant_repos,
          orgData.distribution_excellent || 0,
          orgData.distribution_good || 0,
          orgData.distribution_fair || 0,
          orgData.distribution_poor || 0,
          orgData.scan_date,
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Get latest scores for all repos
  async getLatestRepoScores() {
    const sql = `
      SELECT s1.*
      FROM scores s1
      INNER JOIN (
        SELECT repo_name, MAX(scan_date) as max_date
        FROM scores
        GROUP BY repo_name
      ) s2 ON s1.repo_name = s2.repo_name AND s1.scan_date = s2.max_date
      ORDER BY s1.unified_score DESC
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Get latest organization score
  async getLatestOrgScore() {
    const sql = `
      SELECT * FROM org_scores
      ORDER BY scan_date DESC
      LIMIT 1
    `;

    return new Promise((resolve, reject) => {
      this.db.get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Get score trends for a repo
  async getRepoTrends(repoName, days = 30) {
    const sql = `
      SELECT * FROM scores
      WHERE repo_name = ?
      AND scan_date >= date('now', '-' || ? || ' days')
      ORDER BY scan_date ASC
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [repoName, days], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Get organization score trends
  async getOrgTrends(days = 30) {
    const sql = `
      SELECT * FROM org_scores
      WHERE scan_date >= date('now', '-' || ? || ' days')
      ORDER BY scan_date ASC
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [days], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Get repositories with score below threshold
  async getBelowThreshold(threshold) {
    const sql = `
      SELECT s1.*
      FROM scores s1
      INNER JOIN (
        SELECT repo_name, MAX(scan_date) as max_date
        FROM scores
        GROUP BY repo_name
      ) s2 ON s1.repo_name = s2.repo_name AND s1.scan_date = s2.max_date
      WHERE s1.unified_score < ?
      ORDER BY s1.unified_score ASC
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [threshold], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) console.error("Error closing database:", err);
        else console.log("Database closed");
      });
    }
  }
}

// Export singleton instance
const db = new Database();
module.exports = db;
