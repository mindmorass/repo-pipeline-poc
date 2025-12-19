output "deployment_info" {
  description = "Deployment information"
  value = {
    environment  = var.environment
    source_repo  = var.source_repo
    project_name = local.project_name
    region       = local.env_config.region
  }
}

output "vpc_id" {
  description = "VPC ID"
  value       = try(aws_vpc.main[0].id, null)
}

output "infrastructure_endpoints" {
  description = "Infrastructure endpoints and URLs"
  value = {
    # Add your infrastructure outputs here
    # Example: load_balancer_dns = aws_lb.main.dns_name
  }
  sensitive = false
}

