# Infrastructure Directory

This directory contains infrastructure-as-code definitions for this application.

Changes to this directory will automatically trigger infrastructure deployment via the manager repo.

## Structure

```
infra/
├── config/          # Environment-specific configurations
├── modules/         # Reusable infrastructure modules
└── variables.yml    # Variables sent to manager repo
```

## Deployment Flow

1. Changes to this directory trigger `.github/workflows/trigger-infra.yml`
2. Workflow sends variables to manager repo
3. Manager repo runs Terraform with provided variables
4. Deployment status is reported back to this repo

