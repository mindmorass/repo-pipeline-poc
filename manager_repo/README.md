# Manager Repository

This repository serves as a **meta infrastructure pipeline** that handles infrastructure deployment for multiple source repositories using Terraform.

## Purpose

- **Centralized Infrastructure Management**: All infrastructure operations are handled here
- **Variable-Driven**: Source repos only send variables; all logic lives here
- **Feedback Loop**: Status and results are sent back to source repos

## How It Works

### 1. Trigger Flow
```
Source Repo (infra/ change) 
  → Lightweight workflow 
  → Triggers manager repo 
  → Manager fetches variables 
  → Terraform plan/apply 
  → Feedback to source repo
```

### 2. Variables from Source Repos
Source repositories provide a `variables.yml` file with:
- Project configuration
- Environment-specific settings
- Resource specifications
- Tags and metadata

### 3. Terraform Execution
- **Init**: State backend configured per source repo and environment
- **Plan**: Generate plan with source variables
- **Apply**: Deploy infrastructure (only on main branch)
- **Outputs**: Send results back to source repo

### 4. Feedback Mechanisms
- **Commit Statuses**: Real-time status on source repo commits
- **PR Comments**: Terraform plans commented on pull requests
- **Notifications**: Success/failure notifications posted to source repo

## Repository Structure

```
manager_repo/
├── .github/
│   └── workflows/
│       └── infra-deploy.yml        # Main deployment workflow
├── terraform/
│   ├── main.tf                     # Provider and config
│   ├── variables.tf                # Input variables
│   ├── outputs.tf                  # Terraform outputs
│   ├── networking.tf               # Example: VPC resources
│   └── .gitignore                  # Terraform ignores
└── README.md
```

## Required Secrets & Variables

### Repository Secrets
- `AWS_ACCESS_KEY_ID` - AWS credentials for Terraform
- `AWS_SECRET_ACCESS_KEY` - AWS credentials for Terraform
- `SOURCE_REPOS_PAT` - Personal Access Token to access and post to source repos

### Repository Variables
- `TF_STATE_BUCKET` - S3 bucket for Terraform state storage

## Environment Protection

GitHub environments are used for approval gates:
- `staging-plan` - Automatic
- `staging-apply` - Automatic (main branch only)
- `production-plan` - Automatic
- `production-apply` - Requires manual approval

## Supported Source Repository Patterns

### Monorepo
- App and infra in one repo
- Workflow watches `infra/` path
- Contains `infra/variables.yml`

### Separate Repos (future)
- Dedicated infrastructure repos
- App repos can trigger infra changes
- Same workflow pattern

## Adding a New Source Repository

1. Source repo adds lightweight workflow (see `source_monorepo` example)
2. Source repo creates `infra/variables.yml` with configuration
3. Source repo configures secrets:
   - `MANAGER_REPO_PAT`
4. Source repo configures variables:
   - `MANAGER_REPO_OWNER`
   - `MANAGER_REPO_NAME`
5. Manager repo `SOURCE_REPOS_PAT` needs access to new source repo

## Extending Infrastructure

Add new Terraform modules in `terraform/`:
```
terraform/
├── networking.tf      # VPC, subnets, etc.
├── compute.tf         # EC2, ECS, Lambda, etc.
├── database.tf        # RDS, DynamoDB, etc.
├── storage.tf         # S3, EFS, etc.
└── monitoring.tf      # CloudWatch, alerting
```

All modules read from `local.config` which is loaded from source repo's `variables.yml`.

## Benefits

✅ **Centralized Logic**: All infrastructure code in one place  
✅ **Consistent Patterns**: Same deployment flow for all repos  
✅ **Security**: Credentials only in manager repo  
✅ **Auditability**: All infrastructure changes tracked here  
✅ **Flexibility**: Source repos only provide variables  
✅ **Feedback**: Source repos get real-time status updates

