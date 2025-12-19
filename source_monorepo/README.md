# Source Monorepo

This is a monorepo containing both application code and infrastructure definitions.

## Structure

- `app/` - Application code
- `infra/` - Infrastructure-as-code definitions
- `.github/workflows/` - CI/CD workflows

## Workflow

### Infrastructure Changes

When changes are made to the `infra/` directory:

1. The `trigger-infra.yml` workflow activates
2. Variables are sent to the manager repo
3. Manager repo handles infrastructure deployment via Terraform
4. Deployment status is reported back

### Application Changes

Changes to the `app/` directory trigger application-specific workflows (build, test, deploy).

## Required Secrets & Variables

### Repository Secrets

- `MANAGER_REPO_PAT` - Personal Access Token with `repo` and `workflow` permissions to trigger manager repo workflows

### Repository Variables

- `MANAGER_REPO_OWNER` - GitHub owner/org of the manager repo
- `MANAGER_REPO_NAME` - Name of the manager repo
