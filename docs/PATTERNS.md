# Customer Repository Patterns

This document compares different repository patterns for customers using the managed infrastructure service.

## Pattern 1: Monorepo (Implemented) ✅

### Structure
```
customer-monorepo/
├── app/                    # Customer application code
│   ├── src/
│   ├── tests/
│   └── Dockerfile
├── infra/                  # Infrastructure requirements for service provider
│   ├── variables.yml
│   └── README.md
└── .github/workflows/
    ├── trigger-infra.yml   # Triggers service provider on infra/**
    └── app-ci.yml          # Customer's app CI/CD
```

### Characteristics
- **Single repository** for app and infrastructure requirements
- **Path-based triggers** separate concerns
- **Simple management** for customers
- **Unified versioning** of app + infra

### Pros
✅ Single repository for customers to manage  
✅ Atomic changes (app + infra in one PR)  
✅ Easier to keep app and infra requirements in sync  
✅ Good for microservices

### Cons
❌ Can become large over time  
❌ Mixed concerns in one repo  
❌ CI/CD runs for both app and infra  

### Best For
- Small to medium customer teams
- Microservices architecture
- When app and infra change together
- Rapid development cycles
- Startups and fast-moving teams

---

## Pattern 2: Separate Infrastructure Repository

### Structure
```
customer-app-repo/         # Customer application only
├── src/
├── tests/
└── .github/workflows/
    └── app-ci.yml         # Build, test, deploy app

customer-infra-repo/       # Infrastructure requirements only
├── infra/
│   └── variables.yml
└── .github/workflows/
    └── trigger-infra.yml  # Triggers service provider
```

### Characteristics
- **Dedicated repositories** for each concern
- **Independent workflows**
- **Separate access controls**
- **Clear separation of concerns**

### Pros
✅ Clean separation of concerns  
✅ Independent access control (dev team vs ops team)  
✅ Smaller, focused repositories  
✅ Different customer teams can own each repo  

### Cons
❌ More repositories for customer to manage  
❌ Coordinating changes across repos  
❌ Version synchronization challenges  

### Best For
- Large customer organizations with specialized roles
- Customer platform/DevOps teams manage infrastructure separately
- Strict compliance requirements
- Multiple customer apps sharing infrastructure
- Enterprise customers

---

## Pattern 3: Multi-Service Monorepo

### Structure
```
customer-monorepo/
├── services/
│   ├── api/
│   │   ├── src/
│   │   └── Dockerfile
│   ├── web/
│   │   ├── src/
│   │   └── Dockerfile
│   └── worker/
│       ├── src/
│       └── Dockerfile
├── infra/
│   ├── variables.yml       # Shared infrastructure
│   ├── api-vars.yml        # Service-specific overrides
│   ├── web-vars.yml
│   └── worker-vars.yml
└── .github/workflows/
    ├── trigger-infra.yml   # Triggers service provider
    ├── api-ci.yml
    ├── web-ci.yml
    └── worker-ci.yml
```

### Characteristics
- **Multiple services** in one customer repo
- **Shared infrastructure** requirements
- **Service-specific** variable files
- **Path-based triggers** for each service

### Pros
✅ All customer services in one place  
✅ Shared tooling and workflows  
✅ Easier code sharing between services  
✅ Consistent standards across services  

### Cons
❌ Large repository  
❌ Complex CI/CD configuration  
❌ Potential for tight coupling  

### Best For
- Medium to large customer organizations
- Microservices with shared infrastructure
- Customer teams that need to coordinate changes
- When services are tightly coupled

---

## Pattern 4: Multi-Customer (Service Provider View)

### Structure
```
service-provider-manager-repo/
├── terraform/
│   ├── main.tf
│   ├── modules/
│   │   ├── customer-vpc/
│   │   ├── customer-compute/
│   │   └── customer-database/
│   └── ...

customer-a-repo/
├── app/
├── infra/
│   └── variables.yml      # customer_id: customer-a
└── .github/workflows/
    └── trigger-infra.yml

customer-b-repo/
├── app/
├── infra/
│   └── variables.yml      # customer_id: customer-b
└── .github/workflows/
    └── trigger-infra.yml
```

### Characteristics
- **Isolated customer repositories**
- **Shared service provider infrastructure modules**
- **Per-customer state files**
- **Customer-specific variables**

### Pros
✅ Complete customer isolation  
✅ Shared infrastructure patterns across customers  
✅ Easy to onboard new customers  
✅ Independent deployments per customer  

### Cons
❌ Many repositories for service provider to monitor  
❌ Module versioning complexity  
❌ Need to maintain backward compatibility

### Best For Service Providers
- SaaS platforms
- Managed service providers
- When customers need complete isolation
- Scalable customer onboarding

---

## Pattern 5: Multi-Region for Customers

### Structure
```
customer-global-app-repo/
├── app/
├── infra/
│   ├── us-east-variables.yml
│   ├── eu-west-variables.yml
│   └── ap-south-variables.yml
└── .github/workflows/
    ├── trigger-infra-us.yml
    ├── trigger-infra-eu.yml
    └── trigger-infra-ap.yml

service-provider-manager-repo/
├── terraform/
│   ├── main.tf              # Region-aware
│   └── ...
└── .github/workflows/
    └── infra-deploy.yml     # Handles all regions
```

### Characteristics
- **Multiple regions** for customer
- **Region-specific** variable files
- **Single service provider** workflow
- **Common infrastructure** patterns

### Pros
✅ Multi-region redundancy for customers  
✅ Geographic distribution  
✅ Compliance with data residency  
✅ Disaster recovery capabilities  

### Cons
❌ Complex to manage for customers  
❌ Higher costs  
❌ State management per region  
❌ Coordination across regions

### Best For Customers
- Enterprise applications
- High-availability requirements
- Geographic compliance needs
- Global customer base

---

## Workflow Trigger Patterns

### 1. Path-Based (Current - Recommended)
```yaml
on:
  push:
    paths:
      - "infra/**"
```
**Best for:** Customer monorepos, selective triggering  
**Customer experience:** Only triggers when they change infra

### 2. Branch-Based
```yaml
on:
  push:
    branches:
      - main
      - "release/**"
```
**Best for:** GitFlow customers, release management  
**Customer experience:** Triggers on specific branches

### 3. Manual Dispatch
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
```
**Best for:** Controlled customer deployments  
**Customer experience:** Manual button to trigger service provider

### 4. Tag-Based
```yaml
on:
  push:
    tags:
      - "infra-v*"
```
**Best for:** Versioned infrastructure releases  
**Customer experience:** Tag-based infrastructure releases

---

## State Management Patterns (Service Provider)

### 1. Per-Customer Repository (Current - Recommended)
```
s3://service-provider-state/
├── customer-a-monorepo/
│   ├── staging/
│   └── production/
└── customer-b-app/
    └── production/
```
**Isolation:** Customer repository level  
**Best for:** Independent customer projects  
**Benefit:** Complete customer isolation

### 2. Per-Customer Service
```
s3://service-provider-state/
├── customer-a/
│   ├── api-service/
│   ├── web-service/
│   └── worker-service/
└── customer-b/
    └── app-service/
```
**Isolation:** Customer service level  
**Best for:** Customers with microservices  
**Benefit:** Service independence within customer

### 3. Per-Customer Region
```
s3://service-provider-state/
├── customer-a/
│   ├── us-east-1/
│   │   ├── staging/
│   │   └── production/
│   └── eu-west-1/
│       └── production/
└── customer-b/
    └── us-west-2/
```
**Isolation:** Customer region level  
**Best for:** Multi-region customers  
**Benefit:** Regional isolation

---

## Approval Patterns

### 1. Environment-Based (Current - Recommended)
```yaml
environment: production-apply  # Service provider approval required
```
**Approvals:** Service provider approves all production  
**Customer experience:** Automatic for staging, manual gate for production

### 2. Customer-Tier Based
```yaml
if: customer_tier == 'enterprise'
  environment: enterprise-fast-track  # Auto-approve
else:
  environment: standard-approval      # Requires approval
```
**Approvals:** Based on customer SLA tier  
**Customer experience:** Enterprise customers get faster deploys

### 3. Change-Size Based
```yaml
if: steps.plan.outputs.changes > 10
  environment: high-risk-approval    # Extra review
```
**Approvals:** Large changes require extra approval  
**Customer experience:** Small changes are faster

### 4. Resource-Type Based
```yaml
if: contains(steps.plan.outputs.resources, 'aws_rds')
  environment: database-approval      # DBA review required
```
**Approvals:** Sensitive resources need specialized approval  
**Customer experience:** Database changes require service provider DBA

---

## Comparison Matrix

| Pattern | Customer Complexity | Service Provider Overhead | Isolation | Best Customer Size |
|---------|---------------------|---------------------------|-----------|-------------------|
| **Monorepo** | Low | Low | Medium | Small-Medium |
| **Separate Repos** | Medium | Medium | High | Medium-Large |
| **Multi-Service** | High | Medium | Medium | Medium-Large |
| **Multi-Customer** | N/A (SP pattern) | High | Very High | Any (SP manages) |
| **Multi-Region** | Very High | High | High | Enterprise |

---

## Migration Paths for Customers

### From Monorepo to Separate Repos
1. Create new customer infrastructure repo
2. Move `infra/` directory to new repo
3. Update workflow with service provider details
4. Notify service provider of new repo
5. Archive old infra directory in app repo

### From Separate Repos to Monorepo
1. Create monorepo structure
2. Migrate app code to `app/`
3. Migrate infra requirements to `infra/`
4. Update workflows for path-based triggers
5. Archive old repositories

### Adding New Region
1. Copy `infra/variables.yml` to `infra/<region>-variables.yml`
2. Update region-specific settings
3. Create new trigger workflow for region
4. Coordinate with service provider for state setup
5. Test in new region

---

## Customer Onboarding Patterns

### Self-Service Onboarding (Recommended)
1. Customer creates repository
2. Customer copies template workflow
3. Customer creates variables.yml
4. Customer configures secrets (service provider provides values)
5. Customer pushes - automatic trigger to service provider
6. Service provider auto-detects and provisions

### Managed Onboarding
1. Customer requests infrastructure service
2. Service provider creates variables template
3. Service provider helps configure customer repo
4. Service provider adds customer repo to monitoring
5. Service provider performs initial deployment
6. Hand off to customer for self-service

### Enterprise Onboarding
1. Service contract negotiation
2. Dedicated service provider engineer assigned
3. Custom infrastructure patterns designed
4. Pilot deployment in customer staging
5. Production migration planning
6. Ongoing support and optimization

---

## Choosing a Pattern

### Questions for Customers:

1. **Team Size & Structure**
   - Small team (< 10): Monorepo
   - Large team with roles: Separate repos
   - Multiple teams: Multi-service

2. **Application Complexity**
   - Simple app: Monorepo
   - Multiple services: Multi-service monorepo
   - Enterprise platform: Separate repos

3. **Deployment Frequency**
   - Daily deployments: Monorepo (easier)
   - Weekly/monthly: Separate repos (safer)

4. **Compliance Requirements**
   - Standard: Monorepo
   - Strict audit: Separate repos
   - Multi-region: Multi-region pattern

5. **Infrastructure Stability**
   - Frequent changes: Monorepo
   - Stable infrastructure: Separate repos

### Questions for Service Providers:

1. **Customer Volume**
   - Few customers: Manual onboarding
   - Many customers: Self-service onboarding
   - Enterprise mix: Tiered onboarding

2. **Infrastructure Diversity**
   - Similar patterns: Shared modules
   - Diverse needs: Flexible modules
   - Custom requirements: Pluggable architecture

3. **SLA Requirements**
   - Standard: Environment-based approval
   - Tiered: Customer-tier approval
   - Enterprise: Dedicated support

---

## Next Steps

**For Customers:**
1. Choose the pattern that fits your team
2. Review [SETUP.md](SETUP.md) for implementation
3. Contact service provider for onboarding
4. Customize variables for your needs
5. Test thoroughly in staging

**For Service Providers:**
1. Document supported patterns for customers
2. Create onboarding templates
3. Set up monitoring for all patterns
4. Define SLAs per customer tier
5. Build customer self-service portal

