#!/usr/bin/env node

/**
 * External Property Sync Tool
 * 
 * Syncs GitHub Custom Properties with external sources of truth:
 * - Billing system (customer_tier)
 * - LDAP/Active Directory (team ownership)
 * - CMDB (security contacts, billing accounts)
 * - Internal databases
 * 
 * Usage:
 *   node sync-properties.js --source billing-api --property customer_tier
 *   node sync-properties.js --source ldap --property team_owner
 *   node sync-properties.js --source all --dry-run
 */

const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const path = require("path");

// Configuration
const ORG = process.env.GITHUB_ORG || "your-org";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");

// Parse command line arguments
const args = {
  source: process.argv.find(arg => arg.startsWith("--source="))?.split("=")[1] || "all",
  property: process.argv.find(arg => arg.startsWith("--property="))?.split("=")[1] || "all",
  verbose: process.argv.includes("--verbose")
};

if (!GITHUB_TOKEN) {
  console.error("❌ GITHUB_TOKEN environment variable is required");
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// ============================================================================
// Source of Truth Adapters
// ============================================================================

/**
 * Billing System Adapter
 * Fetches customer tiers from billing system
 */
async function fetchFromBillingSystem() {
  console.log("📊 Fetching from Billing System...");
  
  // TODO: Replace with actual billing system API call
  // const response = await fetch('https://billing.internal/api/customers');
  // const data = await response.json();
  
  // Mock data for example
  const mockBillingData = {
    "customer-a-repo": "enterprise",
    "customer-b-repo": "professional",
    "customer-c-repo": "startup",
    "customer-d-repo": "free"
  };
  
  console.log(`  Found ${Object.keys(mockBillingData).length} customer tier records`);
  
  return {
    property: "customer_tier",
    values: mockBillingData
  };
}

/**
 * LDAP/Active Directory Adapter
 * Fetches team ownership from LDAP
 */
async function fetchFromLDAP() {
  console.log("👥 Fetching from LDAP/Active Directory...");
  
  // TODO: Replace with actual LDAP query
  // const ldapClient = await connectLDAP();
  // const teams = await ldapClient.search('ou=teams,dc=company,dc=com');
  
  // Mock data for example
  const mockLDAPData = {
    "customer-a-repo": "platform-team",
    "customer-b-repo": "infrastructure-team",
    "customer-c-repo": "devops-team"
  };
  
  console.log(`  Found ${Object.keys(mockLDAPData).length} team ownership records`);
  
  return {
    property: "team_owner",
    values: mockLDAPData
  };
}

/**
 * CMDB Adapter
 * Fetches metadata from Configuration Management Database
 */
async function fetchFromCMDB() {
  console.log("🗄️  Fetching from CMDB...");
  
  // TODO: Replace with actual CMDB API
  // const response = await fetch('https://cmdb.internal/api/repos');
  
  const mockCMDBData = {
    security_contacts: {
      "customer-a-repo": "security@customer-a.com",
      "customer-b-repo": "security@customer-b.com"
    },
    billing_accounts: {
      "customer-a-repo": "billing-001",
      "customer-b-repo": "billing-002"
    }
  };
  
  return mockCMDBData;
}

/**
 * GitHub Teams Adapter
 * Fetches actual team assignments from GitHub
 */
async function fetchFromGitHubTeams() {
  console.log("🐙 Fetching actual team assignments from GitHub...");
  
  const teamAssignments = {};
  
  // Get all repositories
  const repos = await octokit.paginate(
    octokit.rest.repos.listForOrg,
    {
      org: ORG,
      per_page: 100
    }
  );
  
  for (const repo of repos) {
    if (repo.archived) continue;
    
    try {
      // Get teams with access to this repo
      const { data: teams } = await octokit.rest.repos.listTeams({
        owner: ORG,
        repo: repo.name,
        per_page: 10
      });
      
      if (teams.length > 0) {
        // Use first team as owner (usually the one with highest permissions)
        teamAssignments[repo.name] = teams[0].slug;
      }
    } catch (error) {
      if (args.verbose) {
        console.warn(`  Warning: Could not fetch teams for ${repo.name}: ${error.message}`);
      }
    }
  }
  
  console.log(`  Found ${Object.keys(teamAssignments).length} team assignments`);
  
  return {
    property: "team_owner",
    values: teamAssignments
  };
}

// ============================================================================
// Main Sync Logic
// ============================================================================

async function syncProperty(propertyName, sourceValues) {
  console.log(`\n🔄 Syncing property: ${propertyName}`);
  console.log(`   Source has ${Object.keys(sourceValues).length} values`);
  
  const updates = [];
  const errors = [];
  
  for (const [repoName, expectedValue] of Object.entries(sourceValues)) {
    try {
      // Get current property value
      const { data: props } = await octokit.rest.repos.getCustomPropertiesValues({
        owner: ORG,
        repo: repoName
      });
      
      const currentProp = props.find(p => p.property_name === propertyName);
      const currentValue = currentProp?.value;
      
      // Check if update needed
      if (currentValue !== expectedValue) {
        if (DRY_RUN) {
          console.log(`  [DRY-RUN] ${repoName}: ${propertyName} = ${currentValue} → ${expectedValue}`);
        } else {
          // Update property
          await octokit.rest.repos.createOrUpdateCustomPropertiesValues({
            owner: ORG,
            repo: repoName,
            properties: [
              {
                property_name: propertyName,
                value: expectedValue
              }
            ]
          });
          
          console.log(`  ✅ ${repoName}: ${propertyName} = ${currentValue || '(empty)'} → ${expectedValue}`);
        }
        
        updates.push({
          repo: repoName,
          property: propertyName,
          old_value: currentValue,
          new_value: expectedValue
        });
      } else if (args.verbose) {
        console.log(`  ✓ ${repoName}: ${propertyName} already correct (${currentValue})`);
      }
    } catch (error) {
      console.error(`  ❌ ${repoName}: Failed to sync - ${error.message}`);
      errors.push({
        repo: repoName,
        property: propertyName,
        error: error.message
      });
    }
  }
  
  return { updates, errors };
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║     GitHub Custom Properties External Sync Tool          ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Organization: ${ORG}`);
  console.log(`Source: ${args.source}`);
  console.log(`Property: ${args.property}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no changes)' : 'LIVE (will update)'}`);
  console.log("");
  
  const results = {
    sources: [],
    total_updates: 0,
    total_errors: 0,
    start_time: new Date()
  };
  
  try {
    // Fetch from sources based on arguments
    const dataSources = [];
    
    if (args.source === "all" || args.source === "billing-api") {
      if (args.property === "all" || args.property === "customer_tier") {
        dataSources.push(await fetchFromBillingSystem());
      }
    }
    
    if (args.source === "all" || args.source === "github-teams") {
      if (args.property === "all" || args.property === "team_owner") {
        dataSources.push(await fetchFromGitHubTeams());
      }
    }
    
    if (args.source === "all" || args.source === "ldap") {
      if (args.property === "all" || args.property === "team_owner") {
        dataSources.push(await fetchFromLDAP());
      }
    }
    
    if (args.source === "cmdb") {
      const cmdbData = await fetchFromCMDB();
      if (args.property === "all" || args.property === "security_contact") {
        dataSources.push({
          property: "security_contact",
          values: cmdbData.security_contacts
        });
      }
      if (args.property === "all" || args.property === "billing_account") {
        dataSources.push({
          property: "billing_account",
          values: cmdbData.billing_accounts
        });
      }
    }
    
    // Sync each property
    for (const source of dataSources) {
      const { updates, errors } = await syncProperty(source.property, source.values);
      
      results.sources.push({
        property: source.property,
        updates_count: updates.length,
        errors_count: errors.length,
        updates,
        errors
      });
      
      results.total_updates += updates.length;
      results.total_errors += errors.length;
    }
    
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    if (args.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
  
  // Print summary
  results.end_time = new Date();
  results.duration_seconds = (results.end_time - results.start_time) / 1000;
  
  console.log("\n" + "═".repeat(60));
  console.log("SYNC COMPLETE");
  console.log("═".repeat(60));
  console.log(`Duration: ${results.duration_seconds.toFixed(2)}s`);
  console.log(`Total updates: ${results.total_updates}`);
  console.log(`Total errors: ${results.total_errors}`);
  
  if (DRY_RUN) {
    console.log("\n⚠️  DRY-RUN MODE: No changes were made");
    console.log("   Run without --dry-run to apply changes");
  }
  
  // Write results to file
  const resultsFile = `sync-results-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results written to: ${resultsFile}`);
  
  // Exit with error if there were errors
  if (results.total_errors > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { syncProperty, fetchFromGitHubTeams, fetchFromBillingSystem };

