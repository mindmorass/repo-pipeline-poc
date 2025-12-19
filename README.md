# Managed Infrastructure Service - Meta Pipeline Template

A **service provider infrastructure management pattern** where a centralized manager repository handles infrastructure deployment for multiple customer repositories using Terraform and GitHub Actions.

## 🎯 What Is This?

This template demonstrates a **managed service pattern** where:

- **Customers** define WHAT infrastructure they need (via simple YAML variables)
- **Service Provider** defines HOW infrastructure is created (via Terraform)
- Changes trigger automated deployments with complete feedback loops

### Key Roles

- **Service Provider**: Manages the `manager_repo` and provides infrastructure-as-a-service
- **Customers**: Own their application repositories and declare infrastructure requirements via `infra/variables.yml`

## 📁 Repository Structure

```
repo-management/
├── docs/                          # 📚 All documentation
│   ├── ARCHITECTURE.md            # System design & diagrams
│   ├── SETUP.md                   # Step-by-step setup guide
│   ├── QUICK-REFERENCE.md         # Commands & troubleshooting
│   └── PATTERNS.md                # Repository patterns comparison
│
├── manager_repo/                  # 🏢 Service Provider Infrastructure Manager
│   ├── .github/workflows/
│   │   ├── infra-deploy.yml       # Main deployment workflow
│   │   └── drift-detection.yml    # Scheduled drift detection
│   ├── terraform/
│   │   ├── main.tf                # Provider configuration
│   │   ├── variables.tf           # Input variables
│   │   ├── outputs.tf             # Infrastructure outputs
│   │   ├── networking.tf          # Example VPC resources
│   │   └── examples/
│   │       └── variables.yml      # Complete example for customers
│   └── README.md
│
├── source_monorepo/               # 👤 Example Customer Repository
│   ├── .github/workflows/
│   │   ├── trigger-infra.yml      # Lightweight trigger to service provider
│   │   └── PULL_REQUEST_TEMPLATE.md
│   ├── app/                       # Customer application code
│   ├── infra/                     # Customer infrastructure requirements
│   │   ├── variables.yml          # Config sent to service provider
│   │   └── README.md
│   └── README.md
│
├── source_app_repo/               # (Future) App-only pattern
├── source_infra_repo/             # (Future) Infra-only pattern
│
└── README.md                      # 👈 You are here
```

## 🚀 Quick Start

### For Service Providers

1. **Read the documentation**

   - [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Understand the system design
   - [SETUP.md](docs/SETUP.md) - Service provider setup instructions

2. **Set up manager repository**

   ```bash
   cd manager_repo
   # Configure GitHub secrets and variables (see SETUP.md)
   git init && git add . && git commit -m "Initial service provider setup"
   git remote add origin <your-manager-repo-url>
   git push -u origin main
   ```

3. **Configure infrastructure**
   - Add AWS credentials as secrets
   - Create S3 bucket for Terraform state
   - Set up GitHub environments with approval rules

### For Customers

1. **Contact service provider** for onboarding

2. **Add infrastructure directory**

   ```bash
   mkdir -p infra
   # Copy variables.yml template from service provider
   ```

3. **Configure your repository**

   - Add `MANAGER_REPO_PAT` secret (provided by service provider)
   - Add `MANAGER_REPO_OWNER` and `MANAGER_REPO_NAME` variables
   - Copy trigger workflow from service provider template

4. **Define your infrastructure needs**

   ```bash
   # Edit infra/variables.yml with your requirements
   vim infra/variables.yml
   git add infra/
   git commit -m "infra: initial infrastructure requirements"
   git push
   ```

5. **Watch the magic happen!** ✨
   - Service provider automatically deploys your infrastructure
   - Terraform plans appear as comments on your PRs
   - Status updates posted to your commits

## 🔄 How It Works

```
┌──────────────────┐
│ Customer Repo    │
│                  │
│ infra/ change    │──┐
└──────────────────┘  │
                      │ 1. Trigger with variables
                      │
                      ▼
┌────────────────────────────────────┐
│ Service Provider Manager Repo      │
│                                    │
│ 2. Fetch customer variables        │
│ 3. Terraform plan                  │
│ 4. Terraform apply (if approved)   │
│ 5. Send feedback to customer       │
└────────────┬───────────────────────┘
             │
             │ 6. Status updates
             │    & notifications
             ▼
┌──────────────────┐
│ Customer Repo    │
│                  │
│ ✅ Status        │
│ 💬 Comments      │
└──────────────────┘
```

## ✨ Key Features

### 🎯 NEW: GitHub Custom Properties Integration

**Customers control infrastructure tools via repository properties!**

```yaml
# Simply set properties in GitHub UI
infrastructure_tools: ["terraform", "ansible"]
terraform_version: "1.6"
spacelift_auto_deploy: false
```

**Result**: Service provider automatically provisions Spacelift stacks. No manual configuration needed! 🚀

See [CUSTOM-PROPERTIES.md](docs/CUSTOM-PROPERTIES.md) for complete guide.

### For Service Providers

✅ **Centralized Control** - All infrastructure code in one place  
✅ **Consistent Standards** - Same deployment flow for all customers  
✅ **Security Management** - Credentials managed centrally  
✅ **Audit & Compliance** - All infrastructure changes tracked  
✅ **Scalable** - Easy to onboard new customers  
✅ **Multi-Tenant** - Complete customer isolation via state management  
✅ **Tool Orchestration** - Automatic Spacelift stack provisioning based on customer properties

### For Customers

✅ **Simple Interface** - Only YAML configuration required  
✅ **No Infrastructure Expertise** - Service provider handles complexity  
✅ **Real-Time Feedback** - Immediate status updates and notifications  
✅ **Version Control** - Infrastructure changes tracked in your repo  
✅ **Self-Service Tool Selection** - Choose Terraform, Ansible, Pulumi, etc. via properties  
✅ **Transparent Tooling** - Spacelift stacks auto-provisioned, no manual setup  
✅ **Blocking Workflows** - Other workflows wait until infrastructure is ready

### Variable-Driven Deployment

Customers only provide simple configuration:

```yaml
# source_monorepo/infra/variables.yml
project_name: my-app
environments:
  staging:
    instance_type: t3.micro
  production:
    instance_type: t3.small
```

Service provider handles all the Terraform complexity!

### Automatic Feedback

- ✅ Commit statuses on customer repos
- 💬 Terraform plans in PR comments
- 🚀 Deployment notifications
- 📊 Infrastructure outputs returned

### Path-Based Triggers

Customer workflows only trigger on `infra/` changes:

```yaml
on:
  push:
    paths:
      - "infra/**"
```

## 📚 Documentation

| Document                                                   | Audience         | Purpose                                                  |
| ---------------------------------------------------------- | ---------------- | -------------------------------------------------------- |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**                | Both             | System design, diagrams, and principles                  |
| **[SETUP.md](docs/SETUP.md)**                              | Both             | Step-by-step setup for service providers and customers   |
| **[CUSTOM-PROPERTIES.md](docs/CUSTOM-PROPERTIES.md)**      | Both             | **NEW!** GitHub Custom Properties for tool orchestration |
| **[COMPLIANCE.md](docs/COMPLIANCE.md)**                    | Both             | **NEW!** Compliance scanning & drift detection           |
| **[TESTING.md](docs/TESTING.md)**                          | Both             | **NEW!** Test/dry-run modes for safe testing             |
| **[QUICK-REFERENCE.md](docs/QUICK-REFERENCE.md)**          | Both             | Commands, troubleshooting, and quick lookups             |
| **[PATTERNS.md](docs/PATTERNS.md)**                        | Both             | Repository patterns and when to use them                 |
| **[manager_repo/README.md](manager_repo/README.md)**       | Service Provider | Manager repo details                                     |
| **[source_monorepo/README.md](source_monorepo/README.md)** | Customer         | Example customer repo                                    |

## 🎨 Use Cases

### Managed Infrastructure Provider

Service provider offers infrastructure-as-a-service to multiple customers, handling all Terraform complexity centrally.

### Enterprise Platform Team

Internal platform team provides infrastructure services to multiple application teams within the organization.

### DevOps Consultancy

Consultancy manages infrastructure for multiple clients with consistent patterns and best practices.

### SaaS Platform Provider

Multi-tenant SaaS platform where each customer gets isolated infrastructure managed by the platform provider.

## 🔧 Customization

### Service Providers: Add Infrastructure Modules

Create new files in `manager_repo/terraform/`:

```bash
manager_repo/terraform/
├── compute.tf      # EC2, ECS, Lambda
├── database.tf     # RDS, DynamoDB
├── storage.tf      # S3, EFS
├── monitoring.tf   # CloudWatch, alerts
└── security.tf     # IAM, Security Groups
```

### Customers: Extend Variables

Add to `infra/variables.yml`:

```yaml
database:
  engine: postgres
  instance_class: db.t3.micro

monitoring:
  alerts_enabled: true
```

Service provider's Terraform references these:

```hcl
resource "aws_db_instance" "main" {
  engine         = local.config.database.engine
  instance_class = local.config.database.instance_class
}
```

## 📋 Requirements

### Service Provider

- GitHub account/organization
- AWS account (or other cloud provider)
- S3 bucket for Terraform state
- GitHub Personal Access Token (access customer repos)

### Customers

- GitHub repository
- GitHub Personal Access Token (trigger service provider)
- Infrastructure requirements documented in YAML

## 🔐 Security Model

### Service Provider

- **Manages**: AWS credentials, Terraform state, deployment workflows
- **Accesses**: Customer repo variables (read-only)
- **Controls**: Environment approvals, infrastructure modules

### Customers

- **Manages**: Application code, infrastructure requirements
- **Provides**: Variables file, trigger permission
- **Receives**: Deployment status, infrastructure outputs

See [SETUP.md](docs/SETUP.md) for detailed security configuration.

## 🎯 Benefits Matrix

| Benefit         | Service Provider                   | Customer                       |
| --------------- | ---------------------------------- | ------------------------------ |
| **Centralized** | ✅ One place for all infra code    | ✅ No infra code to maintain   |
| **Consistent**  | ✅ Same patterns for all customers | ✅ Proven best practices       |
| **Secure**      | ✅ Central credential management   | ✅ No credential management    |
| **Auditable**   | ✅ All changes tracked             | ✅ Full deployment visibility  |
| **Flexible**    | ✅ Easy to add customers           | ✅ Simple YAML interface       |
| **Scalable**    | ✅ Automated deployments           | ✅ Self-service infrastructure |

## 🗺️ Roadmap

### Current Features

- [x] Basic monorepo customer pattern
- [x] Terraform integration
- [x] GitHub Actions workflows
- [x] Commit status feedback
- [x] PR comment integration
- [x] Drift detection
- [x] **GitHub Custom Properties integration**
- [x] **Opt-in tool orchestration (Terraform, Ansible, etc.)**
- [x] **Spacelift stack auto-provisioning**
- [x] **Customer self-service tool selection**
- [x] **Compliance scanning & drift detection**
- [x] **Auto-remediation for property drift**
- [x] **External sync with sources of truth**
- [x] **Comprehensive test/dry-run modes**
- [x] **Safe testing without real deployments**

### Planned Features

- [ ] Multi-cloud support (Azure, GCP)
- [ ] Cost estimation in customer PRs
- [ ] Policy-as-code validation (OPA)
- [ ] Customer web portal dashboard
- [ ] Slack/Teams notifications
- [ ] Rollback mechanisms
- [ ] Infrastructure testing (Terratest)
- [ ] Customer usage dashboards
- [ ] SLA monitoring and reporting
- [ ] Additional tool integrations (Pulumi, Crossplane)

## 🤝 Getting Started

### Service Providers

1. Review [ARCHITECTURE.md](docs/ARCHITECTURE.md)
2. Follow [SETUP.md](docs/SETUP.md) - Part 1
3. Customize Terraform modules for your use case
4. Set up customer onboarding process
5. Monitor deployments and iterate

### Customers

1. Contact your service provider for onboarding
2. Follow [SETUP.md](docs/SETUP.md) - Part 2
3. Create `infra/variables.yml` with your requirements
4. Push changes and watch infrastructure deploy
5. Review plans in PRs before merging

## 📞 Support

- **Documentation**: See [docs/](docs/) folder
- **Service Provider Setup**: [SETUP.md](docs/SETUP.md) - Part 1
- **Customer Onboarding**: [SETUP.md](docs/SETUP.md) - Part 2
- **Quick Commands**: [QUICK-REFERENCE.md](docs/QUICK-REFERENCE.md)
- **Architecture Details**: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

**Ready to get started?**

- **Service Providers** → Read [docs/SETUP.md](docs/SETUP.md) Part 1
- **Customers** → Contact your service provider for onboarding

---

## 📝 License

This is a template repository - use it however you like!

## 🌟 Contributing

This is a template for managed infrastructure services. Fork and customize for your organization's needs.
