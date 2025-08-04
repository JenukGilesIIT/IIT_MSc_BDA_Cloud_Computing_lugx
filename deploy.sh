#!/bin/bash

# LUGX Gaming Platform - Complete Deployment Script
# This script deploys the entire application stack

set -e

echo "🚀 LUGX Gaming Platform Deployment Script"
echo "==========================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Function to deploy with Docker Compose
deploy_docker_compose() {
    echo ""
    echo "🐳 Starting Docker Compose deployment..."
    
    # Build and start all services
    echo "📦 Building and starting services..."
    docker-compose -f docker-compose.production.yml build --no-cache
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be healthy
    echo "⏳ Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    echo "🏥 Checking service health..."
    docker-compose -f docker-compose.production.yml ps
    
    echo ""
    echo "✅ Docker Compose deployment completed!"
    echo ""
    echo "📋 Service URLs:"
    echo "   Frontend:         http://localhost:8080"
    echo "   Game Service:     http://localhost:3000/health"
    echo "   Order Service:    http://localhost:3001/health" 
    echo "   Analytics Service: http://localhost:3002/health"
    echo "   pgAdmin:          http://localhost:5050 (admin@lugx.com / admin123)"
    echo ""
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    echo ""
    echo "☸️ Starting Kubernetes deployment..."
    
    if ! command_exists kubectl; then
        echo "❌ kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if Kubernetes is available
    if ! kubectl cluster-info >/dev/null 2>&1; then
        echo "❌ Kubernetes cluster is not accessible. Please check your kubectl configuration."
        exit 1
    fi
    
    echo "📦 Deploying to Kubernetes..."
    kubectl apply -f k8s/complete-deployment.yaml
    
    echo "⏳ Waiting for deployment to be ready..."
    kubectl wait --for=condition=ready pod -l app=frontend -n lugx-gaming --timeout=300s
    
    echo "🔍 Checking deployment status..."
    kubectl get pods -n lugx-gaming
    kubectl get services -n lugx-gaming
    
    echo ""
    echo "✅ Kubernetes deployment completed!"
    echo ""
    echo "📋 Access your application:"
    echo "   kubectl port-forward svc/frontend 8080:80 -n lugx-gaming"
}

# Function to run tests
run_tests() {
    echo ""
    echo "🧪 Running integration tests..."
    
    # Wait a bit more for services to be fully ready
    sleep 10
    
    # Test Game Service
    echo "Testing Game Service..."
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Game Service is healthy"
    else
        echo "❌ Game Service health check failed"
    fi
    
    # Test Order Service
    echo "Testing Order Service..."
    if curl -f http://localhost:3001/health >/dev/null 2>&1; then
        echo "✅ Order Service is healthy"
    else
        echo "❌ Order Service health check failed"
    fi
    
    # Test Analytics Service
    echo "Testing Analytics Service..."
    if curl -f http://localhost:3002/health >/dev/null 2>&1; then
        echo "✅ Analytics Service is healthy"
    else
        echo "❌ Analytics Service health check failed"
    fi
    
    # Test Frontend
    echo "Testing Frontend..."
    if curl -f http://localhost:8080/ >/dev/null 2>&1; then
        echo "✅ Frontend is accessible"
    else
        echo "❌ Frontend accessibility check failed"
    fi
    
    # Test Analytics Event Tracking
    echo "Testing Analytics Event Tracking..."
    if curl -f -X POST http://localhost:3002/api/analytics/events \
        -H "Content-Type: application/json" \
        -d '{"events": [{"event_type": "page_view", "session_id": "deploy_test", "page_url": "/", "page_title": "Test", "page_category": "test"}]}' >/dev/null 2>&1; then
        echo "✅ Analytics event tracking is working"
    else
        echo "❌ Analytics event tracking test failed"
    fi
}

# Function to show logs
show_logs() {
    echo ""
    echo "📋 Recent service logs:"
    echo ""
    docker-compose -f docker-compose.production.yml logs --tail=10 game-service
    docker-compose -f docker-compose.production.yml logs --tail=10 order-service
    docker-compose -f docker-compose.production.yml logs --tail=10 analytics-service
}

# Function to cleanup
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    docker-compose -f docker-compose.production.yml down -v
    docker system prune -f
    echo "✅ Cleanup completed"
}

# Main deployment logic
case "${1:-docker}" in
    "docker")
        deploy_docker_compose
        run_tests
        ;;
    "k8s"|"kubernetes")
        deploy_kubernetes
        ;;
    "test")
        run_tests
        ;;
    "logs")
        show_logs
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|"-h"|"--help")
        echo ""
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  docker      Deploy using Docker Compose (default)"
        echo "  k8s         Deploy to Kubernetes cluster"
        echo "  test        Run integration tests"
        echo "  logs        Show recent service logs"
        echo "  cleanup     Stop services and cleanup"
        echo "  help        Show this help message"
        echo ""
        ;;
    *)
        echo "❌ Invalid option: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment script completed!"
echo "Visit the runbook for detailed usage instructions: runbook/PRODUCTION_DEPLOYMENT_GUIDE.md"
