#!/bin/bash

# LUGX Gaming Platform - Blue-Green Deployment Script
# This script handles blue-green deployments for zero downtime

set -e

# Configuration
NAMESPACE="lugx-production"
REGISTRY="ghcr.io/your-org/lugx-gaming"
VERSION=${1:-"latest"}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Blue-Green Deployment for LUGX Gaming Platform${NC}"
echo -e "${YELLOW}Version: $VERSION${NC}"
echo -e "${YELLOW}Namespace: $NAMESPACE${NC}"

# Function to check if deployment exists
deployment_exists() {
    kubectl get deployment "$1" -n "$NAMESPACE" >/dev/null 2>&1
}

# Function to get current active environment
get_active_environment() {
    CURRENT=$(kubectl get service lugx-frontend -o jsonpath='{.spec.selector.environment}' -n "$NAMESPACE" 2>/dev/null || echo "none")
    echo "$CURRENT"
}

# Function to determine target environment
get_target_environment() {
    CURRENT=$(get_active_environment)
    if [ "$CURRENT" = "blue" ]; then
        echo "green"
    elif [ "$CURRENT" = "green" ]; then
        echo "blue"
    else
        echo "blue"  # Default to blue for first deployment
    fi
}

# Function to wait for deployment to be ready
wait_for_deployment() {
    local deployment_name="$1"
    echo -e "${YELLOW}⏳ Waiting for deployment $deployment_name to be ready...${NC}"
    kubectl rollout status deployment/"$deployment_name" -n "$NAMESPACE" --timeout=300s
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deployment $deployment_name is ready${NC}"
    else
        echo -e "${RED}❌ Deployment $deployment_name failed to become ready${NC}"
        exit 1
    fi
}

# Function to run health checks
run_health_checks() {
    local environment="$1"
    echo -e "${YELLOW}🏥 Running health checks for $environment environment...${NC}"
    
    # Port forward to test the deployment
    kubectl port-forward service/lugx-frontend-"$environment" 8080:80 -n "$NAMESPACE" >/dev/null 2>&1 &
    PORT_FORWARD_PID=$!
    
    sleep 10
    
    # Basic health checks
    if curl -f http://localhost:8080 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend health check passed${NC}"
    else
        echo -e "${RED}❌ Frontend health check failed${NC}"
        kill $PORT_FORWARD_PID 2>/dev/null
        exit 1
    fi
    
    # Kill port forward
    kill $PORT_FORWARD_PID 2>/dev/null
    
    echo -e "${GREEN}✅ All health checks passed for $environment environment${NC}"
}

# Function to switch traffic
switch_traffic() {
    local target_environment="$1"
    echo -e "${YELLOW}🔄 Switching traffic to $target_environment environment...${NC}"
    
    # Update service selectors
    kubectl patch service lugx-frontend -p '{"spec":{"selector":{"environment":"'$target_environment'"}}}' -n "$NAMESPACE"
    kubectl patch service lugx-game-service -p '{"spec":{"selector":{"environment":"'$target_environment'"}}}' -n "$NAMESPACE"
    kubectl patch service lugx-order-service -p '{"spec":{"selector":{"environment":"'$target_environment'"}}}' -n "$NAMESPACE"
    kubectl patch service lugx-analytics-service -p '{"spec":{"selector":{"environment":"'$target_environment'"}}}' -n "$NAMESPACE"
    
    echo -e "${GREEN}✅ Traffic switched to $target_environment environment${NC}"
}

# Function to cleanup old environment
cleanup_old_environment() {
    local old_environment="$1"
    echo -e "${YELLOW}🧹 Scaling down $old_environment environment...${NC}"
    
    kubectl scale deployment frontend-"$old_environment" --replicas=0 -n "$NAMESPACE" 2>/dev/null || true
    kubectl scale deployment game-service-"$old_environment" --replicas=0 -n "$NAMESPACE" 2>/dev/null || true
    kubectl scale deployment order-service-"$old_environment" --replicas=0 -n "$NAMESPACE" 2>/dev/null || true
    kubectl scale deployment analytics-service-"$old_environment" --replicas=0 -n "$NAMESPACE" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Old environment $old_environment scaled down${NC}"
}

# Main deployment logic
main() {
    # Get current and target environments
    CURRENT_ENV=$(get_active_environment)
    TARGET_ENV=$(get_target_environment)
    
    echo -e "${BLUE}Current active environment: $CURRENT_ENV${NC}"
    echo -e "${BLUE}Target deployment environment: $TARGET_ENV${NC}"
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy to target environment
    echo -e "${YELLOW}📦 Deploying to $TARGET_ENV environment...${NC}"
    
    # Update deployment manifests with target environment and version
    sed -e "s/ENVIRONMENT_PLACEHOLDER/$TARGET_ENV/g" \
        -e "s/VERSION_PLACEHOLDER/$VERSION/g" \
        k8s/deployment-template.yaml | kubectl apply -n "$NAMESPACE" -f -
    
    # Wait for all deployments to be ready
    wait_for_deployment "frontend-$TARGET_ENV"
    wait_for_deployment "game-service-$TARGET_ENV"
    wait_for_deployment "order-service-$TARGET_ENV"
    wait_for_deployment "analytics-service-$TARGET_ENV"
    
    # Run health checks on target environment
    run_health_checks "$TARGET_ENV"
    
    # Switch traffic to target environment
    switch_traffic "$TARGET_ENV"
    
    # Wait a bit for traffic to stabilize
    echo -e "${YELLOW}⏳ Waiting for traffic to stabilize...${NC}"
    sleep 30
    
    # Run post-deployment integration tests
    echo -e "${YELLOW}🧪 Running post-deployment tests...${NC}"
    if [ -f "ci-cd/test_scripts/run_tests.sh" ]; then
        chmod +x ci-cd/test_scripts/run_tests.sh
        ./ci-cd/test_scripts/run_tests.sh
    fi
    
    # Cleanup old environment if deployment was successful
    if [ "$CURRENT_ENV" != "none" ] && [ "$CURRENT_ENV" != "$TARGET_ENV" ]; then
        cleanup_old_environment "$CURRENT_ENV"
    fi
    
    echo -e "${GREEN}🎉 Blue-Green deployment completed successfully!${NC}"
    echo -e "${GREEN}Active environment: $TARGET_ENV${NC}"
    echo -e "${GREEN}Application is live at: https://lugx-gaming.com${NC}"
}

# Rollback function
rollback() {
    echo -e "${RED}🔄 Rolling back deployment...${NC}"
    
    CURRENT_ENV=$(get_active_environment)
    if [ "$CURRENT_ENV" = "blue" ]; then
        ROLLBACK_TO="green"
    else
        ROLLBACK_TO="blue"
    fi
    
    echo -e "${YELLOW}Rolling back from $CURRENT_ENV to $ROLLBACK_TO${NC}"
    
    # Scale up previous environment
    kubectl scale deployment frontend-"$ROLLBACK_TO" --replicas=2 -n "$NAMESPACE"
    kubectl scale deployment game-service-"$ROLLBACK_TO" --replicas=2 -n "$NAMESPACE"
    kubectl scale deployment order-service-"$ROLLBACK_TO" --replicas=2 -n "$NAMESPACE"
    kubectl scale deployment analytics-service-"$ROLLBACK_TO" --replicas=2 -n "$NAMESPACE"
    
    # Wait for rollback deployments
    wait_for_deployment "frontend-$ROLLBACK_TO"
    wait_for_deployment "game-service-$ROLLBACK_TO"
    wait_for_deployment "order-service-$ROLLBACK_TO"
    wait_for_deployment "analytics-service-$ROLLBACK_TO"
    
    # Switch traffic back
    switch_traffic "$ROLLBACK_TO"
    
    echo -e "${GREEN}✅ Rollback completed. Traffic switched to $ROLLBACK_TO environment${NC}"
}

# Check command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    *)
        echo "Usage: $0 [deploy|rollback] [version]"
        echo "  deploy   - Deploy new version using blue-green strategy (default)"
        echo "  rollback - Rollback to previous environment"
        echo "  version  - Docker image version to deploy (default: latest)"
        exit 1
        ;;
esac
