variable "source_repo" {
  description = "Name of the source repository triggering this deployment"
  type        = string
}

variable "environment" {
  description = "Target environment (staging, production)"
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production"
  }
}

# All other variables come from source-variables.yml
# This keeps the manager repo truly meta/variable-driven

