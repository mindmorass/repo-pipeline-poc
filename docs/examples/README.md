# Configuration Examples

This directory contains real-world examples of infrastructure configurations using GitHub Custom Properties.

## Examples

### 1. Terraform Only (Most Common)
**File**: [custom-properties-terraform-only.md](custom-properties-terraform-only.md)

Basic setup with just Terraform via Spacelift.

```yaml
infrastructure_tools: ["terraform"]
terraform_version: "1.6"
spacelift_auto_deploy: false
infrastructure_approval_required: true
```

**Use Case**: Standard infrastructure management for most customers

---

### 2. Multi-Tool (Advanced)
**File**: [custom-properties-multi-tool.md](custom-properties-multi-tool.md)

Advanced setup with Terraform + Ansible for infrastructure provisioning and configuration management.

```yaml
infrastructure_tools: ["terraform", "ansible"]
terraform_version: "1.6"
ansible_inventory_path: "ansible/inventory/"
customer_tier: "enterprise"
```

**Use Case**: Enterprise customers needing both infrastructure provisioning and server configuration

---

### 3. Onboarding Script (Service Providers)
**File**: [onboarding-script.sh](onboarding-script.sh)

Automated bash script for service providers to onboard new customers.

```bash
./onboarding-script.sh customer-app professional terraform
./onboarding-script.sh enterprise-app enterprise terraform,ansible
```

**Use Case**: Service providers onboarding multiple customers efficiently

---

## Quick Comparison

| Pattern | Tools | Complexity | Best For |
|---------|-------|------------|----------|
| **Terraform Only** | Terraform | Low | Most customers, standard infrastructure |
| **Multi-Tool** | Terraform + Ansible | High | Enterprise, complex deployments |
| **Custom** | Any combination | Varies | Special requirements |

## How to Use These Examples

### For Customers:

1. Choose the pattern that matches your needs
2. Copy the custom properties configuration
3. Set properties in your repository (Settings → Custom Properties)
4. Make an infrastructure change to `infra/variables.yml`
5. Watch automatic provisioning!

### For Service Providers:

1. Review examples to understand customer patterns
2. Use onboarding script to streamline customer setup
3. Customize examples for your organization
4. Share relevant example with customers during onboarding

## Adding New Examples

When adding new examples, include:

- ✅ Custom properties configuration
- ✅ Expected behavior description
- ✅ Repository structure
- ✅ Spacelift stack configuration
- ✅ PR comment examples
- ✅ Use case description

## Testing Examples

All examples should be tested before documenting:

```bash
# Set properties
gh api -X PUT repos/org/test-repo/properties/values ...

# Make infra change
echo "test: true" >> infra/variables.yml
git commit -am "test: trigger"
git push

# Verify Spacelift stack created
# Check commit statuses
# Verify workflow blocking behavior
```

## Related Documentation

- [CUSTOM-PROPERTIES.md](../CUSTOM-PROPERTIES.md) - Complete custom properties guide
- [SETUP.md](../SETUP.md) - Setup instructions
- [PATTERNS.md](../PATTERNS.md) - Repository patterns
- [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) - Quick commands

## Support

Questions about examples?
- Service Providers: Review manager repo workflows
- Customers: Contact your service provider
- Both: Check [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) troubleshooting section

