terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Backend config provided via init command
    encrypt = true
  }
}

provider "aws" {
  region = local.config.environments[var.environment].region

  default_tags {
    tags = merge(
      local.config.tags,
      {
        Environment  = var.environment
        SourceRepo   = var.source_repo
        ManagedBy    = "manager-repo-terraform"
        LastModified = timestamp()
      }
    )
  }
}

# Load variables from source repo
locals {
  config = yamldecode(file("${path.module}/source-variables.yml"))

  project_name = local.config.project_name
  env_config   = local.config.environments[var.environment]

  name_prefix = "${local.project_name}-${var.environment}"
}

