# LUGX Gaming Platform - Complete Deployment Runbook

## 🎯 Project Overview

The LUGX Gaming Platform is a comprehensive cloud-native e-commerce solution built with microservices architecture, featuring real-time analytics and modern DevOps practices.

### Architecture Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Game Service   │    │  Order Service  │
│   (Nginx)       │◄──►│   (Node.js)      │◄──►│   (Node.js)     │
│   Port: 8080    │    │   Port: 3000     │    │   Port: 3001    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        ▼                        ▼
         │              ┌──────────────────┐    ┌─────────────────┐
         │              │   PostgreSQL     │    │   PostgreSQL    │
         │              │   (Game Data)    │    │   (Order Data)  │
         │              │   Port: 5432     │    │   Port: 5432    │
         │              └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐
│ Analytics Service│    │   ClickHouse     │
│   (Node.js)     │◄──►│   (Analytics)    │
│   Port: 3002    │    │   Port: 8123     │
└─────────────────┘    └──────────────────┘
```

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
6. [Production Deployment](#production-deployment)
7. [Testing](#testing)
8. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [Development Workflow](#development-workflow)
11. [Database Management](#database-management)

## Prerequisites

### Required Software
- **Docker Desktop** (v20.10+) with Kubernetes enabled
- **kubectl** (v1.28+)
- **Node.js** (v18+)
- **Git**
- **PowerShell** (for Windows development)

### Development Environment (Windows + Docker Desktop)
- **Primary Development**: Windows machine with Docker Desktop
- **Local Testing**: Test all components locally before cloud deployment
- **Milestone-Based Testing**: Deploy to AWS EC2 at key milestones
- **Final Deployment**: Production deployment on AWS/Cloud

### Required Access
- Container registry access (Docker Hub/GitHub Container Registry)
- Kubernetes cluster admin access
- AWS QuickSight access (for analytics dashboard)

### Docker Hub Account Setup
```powershell
# Create account at hub.docker.com
# Login to Docker Hub
docker login

# Verify installation
docker --version
kubectl version --client
```

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/lugx-gaming-platform.git
cd lugx-gaming-platform
```

### 2. Setup Environment Variables

Create `.env` files for each service:

**Frontend (.env)**
```bash
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_ORDER_SERVICE_URL=http://localhost:3001
REACT_APP_ANALYTICS_URL=http://localhost:3002
```

**Game Service (.env)**
```bash
PORT=3000
DATABASE_URL=postgresql://lugx_admin:lugx_secure_password@localhost:5432/lugx_gaming
NODE_ENV=development
```

**Order Service (.env)**
```bash
PORT=3001
DATABASE_URL=postgresql://lugx_admin:lugx_secure_password@localhost:5432/lugx_gaming
GAME_SERVICE_URL=http://localhost:3000
NODE_ENV=development
```

**Analytics Service (.env)**
```bash
PORT=3002
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_USERNAME=analytics_user
CLICKHOUSE_PASSWORD=analytics_password
NODE_ENV=development
```

### 3. Install Dependencies

```powershell
# Frontend dependencies (if using Node.js frontend)
cd frontend && npm install

# Game Service
cd services/game-service && npm install

# Order Service
cd ../order-service && npm install

# Analytics Service
cd ../analytics-service && npm install
```

### 4. Start Local Services

#### Option A: Full Stack with Docker Compose
```powershell
# Start complete application stack
docker-compose -f docker-compose.production.yml up -d

# Check all services are running
docker-compose -f docker-compose.production.yml ps
```

#### Option B: Individual Service Development
```powershell
# Start databases first
docker-compose -f docker-compose.production.yml up -d postgres clickhouse

# Start services individually for development
cd services/game-service && npm start &
cd ../order-service && npm start &
cd ../analytics-service && npm start &

# Start frontend
cd ../../frontend && docker build -t lugx-frontend . && docker run -p 8080:8080 lugx-frontend
```

### 5. Verify Local Deployment
```powershell
# Test endpoints
curl http://localhost:8080         # Frontend
curl http://localhost:3000/health  # Game Service
curl http://localhost:3001/health  # Order Service
curl http://localhost:3002/health  # Analytics Service

# Test API functionality
curl http://localhost:3000/api/games
curl http://localhost:3001/api/orders
curl http://localhost:3002/api/analytics/dashboard
```

## Docker Deployment

### 1. Build All Images
```powershell
# Build all services
docker-compose -f docker-compose.production.yml build

# Or build individually
cd frontend && docker build -t lugx-frontend:latest .
cd services/game-service && docker build -t lugx-game-service:latest .
cd ../order-service && docker build -t lugx-order-service:latest .
cd ../analytics-service && docker build -t lugx-analytics-service:latest .
```

### 2. Push to Registry (For Cloud Deployment)
```powershell
# Tag images for registry
docker tag lugx-frontend:latest your-dockerhub-username/lugx-frontend:v1.0
docker tag lugx-game-service:latest your-dockerhub-username/lugx-game-service:v1.0
docker tag lugx-order-service:latest your-dockerhub-username/lugx-order-service:v1.0
docker tag lugx-analytics-service:latest your-dockerhub-username/lugx-analytics-service:v1.0

# Push to registry
docker push your-dockerhub-username/lugx-frontend:v1.0
docker push your-dockerhub-username/lugx-game-service:v1.0
docker push your-dockerhub-username/lugx-order-service:v1.0
docker push your-dockerhub-username/lugx-analytics-service:v1.0
```

### 3. Start Production Stack
```powershell
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check deployment status
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs -f
```

## Kubernetes Deployment

### 1. Local Kubernetes Setup
```powershell
# For Docker Desktop (Windows)
# Enable Kubernetes in Docker Desktop settings

# For Minikube
minikube start --cpus=4 --memory=8192
minikube addons enable ingress

# For Kind
kind create cluster --name lugx-gaming
```

### 2. Deploy to Kubernetes
```powershell
# Create namespaces
kubectl apply -f k8s/namespace.yaml

# Deploy databases first
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/clickhouse.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
kubectl wait --for=condition=ready pod -l app=clickhouse --timeout=300s

# Deploy application services
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n lugx-production
kubectl get services -n lugx-production
kubectl get ingress -n lugx-production
```

### 3. Access Application
```powershell
# Port forward for local testing
kubectl port-forward service/lugx-frontend-service 8080:80 -n lugx-production

# Or get ingress URL (for cloud)
kubectl get ingress -n lugx-production

# For minikube
minikube service lugx-frontend --url -n lugx-production
```

## CI/CD Pipeline Setup

### 1. GitHub Actions Setup
```powershell
# Copy workflow files
mkdir -p .github/workflows
cp ci-cd/github_actions/deploy.yml .github/workflows/

# Configure GitHub Secrets:
# - KUBE_CONFIG_STAGING: Base64 encoded kubeconfig for staging
# - KUBE_CONFIG_PROD: Base64 encoded kubeconfig for production
# - DOCKER_HUB_USERNAME: Docker Hub username
# - DOCKER_HUB_ACCESS_TOKEN: Docker Hub access token
```

### 2. Blue-Green Deployment Setup
```powershell
# Make deployment script executable
chmod +x ci-cd/deploy-blue-green.sh

# Deploy initial version
./ci-cd/deploy-blue-green.sh deploy v1.0.0

# Switch traffic to new version
./ci-cd/deploy-blue-green.sh switch v1.0.0

# Cleanup old version
./ci-cd/deploy-blue-green.sh cleanup
```

## Production Deployment

### AWS EC2 Setup
1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS (t3.medium recommended)
   - Configure security groups:
     - SSH (22) from your IP
     - HTTP (80) from anywhere
     - HTTPS (443) from anywhere
     - Custom application ports

2. **Instance Configuration**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install kind (Kubernetes in Docker)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

3. **Deploy Application**
```bash
# Clone repository
git clone <your-repository-url>
cd lugx-gaming-platform

# Pull images from registry
docker login
docker pull your-dockerhub-username/lugx-frontend:v1.0
docker pull your-dockerhub-username/lugx-game-service:v1.0
docker pull your-dockerhub-username/lugx-order-service:v1.0
docker pull your-dockerhub-username/lugx-analytics-service:v1.0

# Deploy with Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Or deploy with Kubernetes
kind create cluster --name lugx-gaming
kubectl apply -f k8s/
```

## Testing

### 1. Unit Tests
```powershell
# Run unit tests for all services
cd services/game-service && npm test
cd ../order-service && npm test  
cd ../analytics-service && npm test
```

### 2. Integration Tests
```powershell
# Run comprehensive integration tests
chmod +x ci-cd/test_scripts/run_tests.sh
./ci-cd/test_scripts/run_tests.sh
```

### 3. End-to-End Testing
```powershell
# Test complete user journey
# Create a game
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Game","price":29.99,"category":"Action"}'

# Create an order
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"customer_001","items":[{"game_id":"game_001","quantity":1}]}'

# Track analytics event
curl -X POST http://localhost:3002/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{"events":[{"event_type":"purchase","game_id":"game_001","user_id":"user_001"}]}'
```

### 4. Load Testing
```powershell
# Using kubectl for Kubernetes load testing
kubectl apply -f ci-cd/test_scripts/load-test.yml

# Or using curl for simple load testing
for i in {1..100}; do curl http://localhost:8080/ & done
```

## Monitoring and Troubleshooting

### 1. Health Checks
```powershell
# Check service health
curl http://localhost:8080/health    # Frontend
curl http://localhost:3000/health    # Game Service  
curl http://localhost:3001/health    # Order Service
curl http://localhost:3002/health    # Analytics Service

# Kubernetes health checks
kubectl get pods -n lugx-production
kubectl describe pod <pod-name> -n lugx-production
```

### 2. Logs Analysis
```powershell
# Docker logs
docker-compose -f docker-compose.production.yml logs -f frontend
docker-compose -f docker-compose.production.yml logs -f game-service
docker-compose -f docker-compose.production.yml logs -f order-service
docker-compose -f docker-compose.production.yml logs -f analytics-service

# Kubernetes logs
kubectl logs -f deployment/lugx-frontend -n lugx-production
kubectl logs -f deployment/lugx-game-service -n lugx-production
kubectl logs -f deployment/lugx-order-service -n lugx-production
kubectl logs -f deployment/lugx-analytics-service -n lugx-production
```

### 3. Database Health
```powershell
# PostgreSQL health check
docker exec -it lugx-postgres psql -U lugx_admin -d lugx_gaming -c "SELECT COUNT(*) FROM games;"

# ClickHouse health check
docker exec -it lugx-clickhouse clickhouse-client --query "SELECT COUNT(*) FROM analytics.events;"

# Kubernetes database checks
kubectl exec -it deployment/postgres -n lugx-production -- psql -U lugx_admin -d lugx_gaming -c "\dt"
kubectl exec -it deployment/clickhouse -n lugx-production -- clickhouse-client --query "SHOW TABLES FROM analytics"
```

### 4. Performance Monitoring
```powershell
# Resource usage
docker stats

# Kubernetes resource monitoring
kubectl top pods -n lugx-production
kubectl top nodes

# Get detailed resource information
kubectl describe pod <pod-name> -n lugx-production
```

### 5. Common Issues and Solutions

**Issue: Services not starting**
```powershell
# Check Docker daemon
docker info

# Check container logs
docker-compose -f docker-compose.production.yml logs <service-name>

# Restart services
docker-compose -f docker-compose.production.yml restart <service-name>
```

**Issue: Database connection errors**
```powershell
# Check database containers
docker ps | grep -E "(postgres|clickhouse)"

# Test database connectivity
docker exec -it lugx-postgres pg_isready -U lugx_admin
docker exec -it lugx-clickhouse clickhouse-client --query "SELECT 1"

# Check environment variables
docker-compose -f docker-compose.production.yml config
```

**Issue: Kubernetes pods stuck in Pending**
```powershell
# Check node resources
kubectl describe nodes
kubectl get events --sort-by=.metadata.creationTimestamp

# Check resource requests/limits
kubectl describe pod <pod-name> -n lugx-production
```

## Rollback Procedures

### 1. Docker Rollback
```powershell
# Stop current deployment
docker-compose -f docker-compose.production.yml down

# Deploy previous version
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

### 2. Kubernetes Rollback
```powershell
# Rollback specific deployment
kubectl rollout undo deployment/lugx-frontend -n lugx-production
kubectl rollout undo deployment/lugx-game-service -n lugx-production
kubectl rollout undo deployment/lugx-order-service -n lugx-production
kubectl rollout undo deployment/lugx-analytics-service -n lugx-production

# Check rollback status
kubectl rollout status deployment/lugx-frontend -n lugx-production
```

### 3. Blue-Green Rollback
```powershell
# Rollback using deployment script
./ci-cd/deploy-blue-green.sh rollback

# Verify rollback
curl http://your-domain.com/health
```

### 4. Database Rollback
```powershell
# Restore from backup (PostgreSQL)
docker exec -i lugx-postgres pg_restore -U lugx_admin -d lugx_gaming /backups/latest.dump

# Restore ClickHouse data
docker exec -i lugx-clickhouse clickhouse-client --query "RESTORE TABLE analytics.events FROM '/backups/events_backup'"
```

## Development Workflow

### Milestone-Based Development Strategy

#### 🎯 **Milestone 1: Frontend Deployment** ✅ COMPLETED
- ✅ Frontend working in Docker Desktop
- ✅ Docker image pushes to Docker Hub  
- ✅ Container runs successfully on AWS EC2
- ✅ Website accessible via public IP

#### 🎯 **Milestone 2: Microservices Development** ✅ COMPLETED
- ✅ Game Service API (6 endpoints) - Express.js REST API
- ✅ Order Service API (11 endpoints) - Complete CRUD operations
- ✅ Analytics Service API (8 endpoints) - Real-time analytics
- ✅ All services containerized and pushed to Docker Hub
- ✅ Frontend-backend communication established

#### 🎯 **Milestone 3: Database Integration** ✅ COMPLETED
- ✅ PostgreSQL integration for Game & Order services
- ✅ ClickHouse deployment for Analytics
- ✅ Database schemas and sample data loaded
- ✅ Data persistence verified across all services

#### 🎯 **Milestone 4: Kubernetes Orchestration** ✅ COMPLETED
- ✅ Complete K8s deployment locally and cloud
- ✅ Ingress controller working
- ✅ Health checks and monitoring active
- ✅ Blue-Green deployment implemented

### Daily Development Commands

```powershell
# Quick local test cycle
docker-compose -f docker-compose.production.yml up -d
docker-compose -f docker-compose.production.yml ps

# Kubernetes development cycle  
kubectl apply -f k8s/
kubectl get pods -n lugx-production -w

# Clean up resources
docker-compose -f docker-compose.production.yml down
kubectl delete namespace lugx-production
```

## Database Management

### PostgreSQL Operations
```powershell
# Connect to database
docker exec -it lugx-postgres psql -U lugx_admin -d lugx_gaming

# Load sample data
docker exec -i lugx-postgres psql -U lugx_admin -d lugx_gaming < database/postgres/schema.sql

# Backup database
docker exec lugx-postgres pg_dump -U lugx_admin lugx_gaming > backup_$(date +%Y%m%d).sql

# Monitor performance
docker exec -it lugx-postgres psql -U lugx_admin -d lugx_gaming -c "SELECT * FROM pg_stat_activity;"
```

### ClickHouse Operations
```powershell
# Connect to ClickHouse
docker exec -it lugx-clickhouse clickhouse-client

# Check analytics data
docker exec -it lugx-clickhouse clickhouse-client --query "SELECT COUNT(*) FROM analytics.events"

# Export data for reports
docker exec -it lugx-clickhouse clickhouse-client --query "SELECT * FROM analytics.dashboard_metrics_hourly FORMAT CSV" > analytics_export.csv
```

## Analytics Dashboard Access

### Local Dashboard
- **URL**: http://localhost:8080/analytics-dashboard.html
- **Features**: Real-time metrics, interactive charts, user behavior analytics

### AWS QuickSight Integration
```powershell
# Export data from ClickHouse for QuickSight
kubectl exec -it deployment/clickhouse -n lugx-production -- clickhouse-client --query "SELECT * FROM analytics.dashboard_metrics_hourly FORMAT CSV" > quicksight_data.csv

# Upload to S3 and configure QuickSight data source
aws s3 cp quicksight_data.csv s3://your-bucket/analytics/
```

## Useful Commands Reference

```powershell
# Quick deployment status
kubectl get all -n lugx-production
docker-compose -f docker-compose.production.yml ps

# Scale services
kubectl scale deployment lugx-frontend --replicas=3 -n lugx-production

# Port forward for debugging
kubectl port-forward service/lugx-frontend 8080:80 -n lugx-production

# Execute commands in containers
kubectl exec -it deployment/lugx-frontend -n lugx-production -- /bin/bash
docker-compose -f docker-compose.production.yml exec frontend /bin/bash

# View recent events
kubectl get events --sort-by=.metadata.creationTimestamp -n lugx-production

# Clean up resources
docker system prune -f
kubectl delete namespace lugx-production --grace-period=0
```

## Emergency Contacts

- **DevOps Team**: devops@lugx-gaming.com
- **Database Admin**: dba@lugx-gaming.com  
- **Security Team**: security@lugx-gaming.com
- **On-Call Support**: +1-800-LUGX-HELP

## Security Best Practices

- Never commit sensitive credentials to version control
- Use Kubernetes secrets for sensitive configuration
- Implement proper RBAC for production clusters
- Regular security updates for base images
- Network policies for inter-service communication
- SSL/TLS certificates for production domains

---

**Note**: This runbook should be kept updated with any changes to the deployment process. Test all procedures in a staging environment before applying to production. For the latest updates and troubleshooting guides, refer to the project documentation and team knowledge base.
