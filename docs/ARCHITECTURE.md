# Repository Management Architecture

## Overview

This project demonstrates a **managed infrastructure service pattern** where a service provider's manager repository handles infrastructure deployment for multiple customer repositories.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                Customer Repository (Monorepo)                    │
│                                                                   │
│  ┌─────────┐  ┌─────────┐                                       │
│  │   app/  │  │  infra/ │                                       │
│  │         │  │         │                                       │
│  │  code   │  │variables│◄──── Customer commits changes        │
│  │         │  │  .yml   │                                       │
│  └─────────┘  └────┬────┘                                       │
│                     │                                            │
│                     ▼                                            │
│         ┌──────────────────────┐                                │
│         │ .github/workflows/   │                                │
│         │  trigger-infra.yml   │                                │
│         │                      │                                │
│         │ • Detects changes    │                                │
│         │ • Sends variables    │                                │
│         │ • Gets feedback      │                                │
│         └──────────┬───────────┘                                │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     │ workflow_dispatch
                     │ (with variables)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│          Service Provider Manager Repo                           │
│                                                                   │
│         ┌──────────────────────┐                                │
│         │ .github/workflows/   │                                │
│         │  infra-deploy.yml    │                                │
│         │                      │                                │
│         │ 1. Fetch variables   │                                │
│         │ 2. Post pending      │───┐                            │
│         └──────────┬───────────┘   │                            │
│                    │                │                            │
│                    ▼                │                            │
│         ┌──────────────────────┐   │                            │
│         │   Terraform Plan     │   │                            │
│         │                      │   │                            │
│         │ • Load variables     │   │                            │
│         │ • Generate plan      │   │                            │
│         │ • Comment on PR      │   │                            │
│         └──────────┬───────────┘   │                            │
│                    │                │                            │
│                    ▼                │                            │
│         ┌──────────────────────┐   │ Status Updates             │
│         │  Terraform Apply     │   │ & Comments                 │
│         │   (main branch)      │   │                            │
│         │                      │   │                            │
│         │ • Deploy infra       │   │                            │
│         │ • Generate outputs   │   │                            │
│         └──────────┬───────────┘   │                            │
│                    │                │                            │
│                    ▼                │                            │
│         ┌──────────────────────┐   │                            │
│         │  Notify Customer     │───┘                            │
│         │                      │                                │
│         │ • Success/Failure    │                                │
│         │ • Commit status      │                                │
│         │ • PR comments        │                                │
│         └──────────────────────┘                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Separation of Concerns
- **Customer Repos**: Define WHAT infrastructure they need (variables)
- **Service Provider (Manager Repo)**: Defines HOW infrastructure is created (Terraform)

### 2. Variable-Driven
- Customer repos only provide configuration
- No infrastructure code duplication
- Consistent patterns across all customers

### 3. Feedback Loop
- Real-time status updates via commit statuses
- Terraform plans commented on customer PRs
- Success/failure notifications back to customers

### 4. Security & Access Control
- Service provider credentials only in manager repo
- Customer repos use limited PATs
- GitHub environment protection for approvals
- Per-customer infrastructure isolation

## Workflow States

```
Customer Pull Request Flow:
  infra/ change → trigger → fetch vars → plan → comment → wait for merge

Customer Main Branch Flow:
  infra/ change → trigger → fetch vars → plan → apply → notify → success/fail
```

## State Management

Terraform state is organized by customer repository and environment:
```
s3://service-provider-terraform-state/
  ├── customer-a-monorepo/
  │   ├── staging/
  │   │   └── terraform.tfstate
  │   └── production/
  │       └── terraform.tfstate
  ├── customer-b-app/
  │   └── production/
  │       └── terraform.tfstate
  └── customer-c-services/
      ├── staging/
      └── production/
```

## Service Provider Benefits

✅ **Centralized Control**: All infrastructure patterns in one place  
✅ **Consistent Standards**: Same deployment flow for all customers  
✅ **Security Management**: Credentials managed centrally  
✅ **Audit & Compliance**: All infrastructure changes tracked  
✅ **Scalability**: Easy to onboard new customers  
✅ **Expertise Leverage**: Infrastructure best practices shared across customers

## Customer Benefits

✅ **Simple Interface**: Only provide YAML configuration  
✅ **No Infrastructure Expertise Required**: Service provider handles complexity  
✅ **Real-Time Feedback**: Immediate status updates and notifications  
✅ **Version Control**: Infrastructure changes tracked in their repo  
✅ **Self-Service**: Deploy infrastructure without service provider intervention  
✅ **Transparency**: Full visibility into infrastructure deployments

## Future Enhancements

- [ ] Support for multiple cloud providers (Azure, GCP)
- [ ] Automated drift detection and remediation
- [ ] Cost estimation in customer PR comments
- [ ] Policy-as-code validation (OPA, Sentinel)
- [ ] Multi-region deployments
- [ ] Automated rollback mechanisms
- [ ] Infrastructure testing (Terratest)
- [ ] Customer portal for deployment history
- [ ] SLA monitoring and reporting

