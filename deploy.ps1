# LUGX Gaming Platform - Complete Deployment Script (PowerShell)
# This script deploys the entire application stack on Windows

param(
    [string]$Action = "docker"
)

Write-Host "🚀 LUGX Gaming Platform Deployment Script" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

# Function to check if command exists
function Test-CommandExists {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
if (-not (Test-CommandExists "docker")) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandExists "docker-compose")) {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Function to deploy with Docker Compose
function Deploy-DockerCompose {
    Write-Host ""
    Write-Host "🐳 Starting Docker Compose deployment..." -ForegroundColor Blue
    
    # Build and start all services
    Write-Host "📦 Building and starting services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.production.yml build --no-cache
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be healthy
    Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # Check service health
    Write-Host "🏥 Checking service health..." -ForegroundColor Yellow
    docker-compose -f docker-compose.production.yml ps
    
    Write-Host ""
    Write-Host "✅ Docker Compose deployment completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Service URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend:          http://localhost:8080" -ForegroundColor White
    Write-Host "   Game Service:      http://localhost:3000/health" -ForegroundColor White
    Write-Host "   Order Service:     http://localhost:3001/health" -ForegroundColor White
    Write-Host "   Analytics Service: http://localhost:3002/health" -ForegroundColor White
    Write-Host "   pgAdmin:           http://localhost:5050 (admin@lugx.com / admin123)" -ForegroundColor White
    Write-Host ""
}

# Function to deploy to Kubernetes
function Deploy-Kubernetes {
    Write-Host ""
    Write-Host "☸️ Starting Kubernetes deployment..." -ForegroundColor Blue
    
    if (-not (Test-CommandExists "kubectl")) {
        Write-Host "❌ kubectl is not installed. Please install kubectl first." -ForegroundColor Red
        exit 1
    }
    
    # Check if Kubernetes is available
    try {
        kubectl cluster-info | Out-Null
    }
    catch {
        Write-Host "❌ Kubernetes cluster is not accessible. Please check your kubectl configuration." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📦 Deploying to Kubernetes..." -ForegroundColor Yellow
    kubectl apply -f k8s/complete-deployment.yaml
    
    Write-Host "⏳ Waiting for deployment to be ready..." -ForegroundColor Yellow
    kubectl wait --for=condition=ready pod -l app=frontend -n lugx-gaming --timeout=300s
    
    Write-Host "🔍 Checking deployment status..." -ForegroundColor Yellow
    kubectl get pods -n lugx-gaming
    kubectl get services -n lugx-gaming
    
    Write-Host ""
    Write-Host "✅ Kubernetes deployment completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Access your application:" -ForegroundColor Cyan
    Write-Host "   kubectl port-forward svc/frontend 8080:80 -n lugx-gaming" -ForegroundColor White
}

# Function to run tests
function Test-Services {
    Write-Host ""
    Write-Host "🧪 Running integration tests..." -ForegroundColor Blue
    
    # Wait a bit more for services to be fully ready
    Start-Sleep -Seconds 10
    
    # Test Game Service
    Write-Host "Testing Game Service..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5
        Write-Host "✅ Game Service is healthy" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Game Service health check failed" -ForegroundColor Red
    }
    
    # Test Order Service
    Write-Host "Testing Order Service..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
        Write-Host "✅ Order Service is healthy" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Order Service health check failed" -ForegroundColor Red
    }
    
    # Test Analytics Service
    Write-Host "Testing Analytics Service..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3002/health" -Method Get -TimeoutSec 5
        Write-Host "✅ Analytics Service is healthy" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Analytics Service health check failed" -ForegroundColor Red
    }
    
    # Test Frontend
    Write-Host "Testing Frontend..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/" -Method Get -TimeoutSec 5
        Write-Host "✅ Frontend is accessible" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Frontend accessibility check failed" -ForegroundColor Red
    }
    
    # Test Analytics Event Tracking
    Write-Host "Testing Analytics Event Tracking..." -ForegroundColor Yellow
    try {
        $body = @{
            events = @(
                @{
                    event_type = "page_view"
                    session_id = "deploy_test"
                    page_url = "/"
                    page_title = "Test"
                    page_category = "test"
                }
            )
        } | ConvertTo-Json -Depth 3
        
        $response = Invoke-RestMethod -Uri "http://localhost:3002/api/analytics/events" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
        Write-Host "✅ Analytics event tracking is working" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Analytics event tracking test failed" -ForegroundColor Red
    }
}

# Function to show logs
function Show-Logs {
    Write-Host ""
    Write-Host "📋 Recent service logs:" -ForegroundColor Cyan
    Write-Host ""
    docker-compose -f docker-compose.production.yml logs --tail=10 game-service
    docker-compose -f docker-compose.production.yml logs --tail=10 order-service
    docker-compose -f docker-compose.production.yml logs --tail=10 analytics-service
}

# Function to cleanup
function Remove-Services {
    Write-Host ""
    Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
    
    # Clean up Docker Compose services
    Write-Host "Stopping Docker Compose services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.production.yml down -v 2>$null
    
    # Clean up Kubernetes services if kubectl is available
    if (Test-CommandExists "kubectl") {
        Write-Host "Cleaning up Kubernetes resources..." -ForegroundColor Yellow
        kubectl delete namespace lugx-gaming --ignore-not-found=true 2>$null
    }
    
    # Force remove any remaining containers with lugx in the name
    Write-Host "Removing any remaining LUGX containers..." -ForegroundColor Yellow
    $lugxContainers = docker ps -aq --filter "name=lugx"
    if ($lugxContainers) {
        docker stop $lugxContainers 2>$null
        docker rm $lugxContainers 2>$null
    }
    
    # Clean up Docker system
    docker system prune -f 2>$null
    Write-Host "✅ Cleanup completed" -ForegroundColor Green
}

# Function to show help
function Show-Help {
    Write-Host ""
    Write-Host "Usage: .\deploy.ps1 [OPTION]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  docker      Deploy using Docker Compose (default)" -ForegroundColor Gray
    Write-Host "  k8s         Deploy to Kubernetes cluster" -ForegroundColor Gray
    Write-Host "  test        Run integration tests" -ForegroundColor Gray
    Write-Host "  logs        Show recent service logs" -ForegroundColor Gray
    Write-Host "  cleanup     Stop services and cleanup" -ForegroundColor Gray
    Write-Host "  help        Show this help message" -ForegroundColor Gray
    Write-Host ""
}

# Main deployment logic
switch ($Action.ToLower()) {
    "docker" {
        Deploy-DockerCompose
        Test-Services
    }
    "k8s" {
        Deploy-Kubernetes
    }
    "kubernetes" {
        Deploy-Kubernetes
    }
    "test" {
        Test-Services
    }
    "logs" {
        Show-Logs
    }
    "cleanup" {
        Remove-Services
    }
    "help" {
        Show-Help
    }
    default {
        Write-Host "❌ Invalid option: $Action" -ForegroundColor Red
        Write-Host "Use '.\deploy.ps1 help' for usage information" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "🎉 Deployment script completed!" -ForegroundColor Green
Write-Host "Visit the runbook for detailed usage instructions: runbook/PRODUCTION_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
