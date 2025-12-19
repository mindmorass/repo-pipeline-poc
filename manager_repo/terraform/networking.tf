# Example infrastructure - VPC and networking
# This is a placeholder showing how variables from source repo are used

resource "aws_vpc" "main" {
  count = try(local.config.networking, null) != null ? 1 : 0

  cidr_block           = local.config.networking.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "public" {
  count = try(local.config.networking.availability_zones, 0)

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = cidrsubnet(local.config.networking.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${count.index + 1}"
    Type = "public"
  }
}

resource "aws_subnet" "private" {
  count = try(local.config.networking.availability_zones, 0)

  vpc_id            = aws_vpc.main[0].id
  cidr_block        = cidrsubnet(local.config.networking.vpc_cidr, 8, count.index + 100)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${local.name_prefix}-private-${count.index + 1}"
    Type = "private"
  }
}

resource "aws_internet_gateway" "main" {
  count = try(local.config.networking, null) != null ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_route_table" "public" {
  count = try(local.config.networking, null) != null ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = try(local.config.networking.availability_zones, 0)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

