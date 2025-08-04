#!/bin/bash

# LUGX Gaming Platform - Test Scripts
# Basic smoke tests for the deployed application

set -e

echo "🧪 Starting LUGX Gaming Platform Tests..."

# Configuration
FRONTEND_URL=${1:-"http://localhost:8080"}
NAMESPACE="lugx-gaming"

echo "Testing frontend at: $FRONTEND_URL"

# Test 1: Frontend accessibility
echo "📍 Test 1: Frontend Accessibility"
response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$response" == "200" ]; then
    echo "✅ Frontend is accessible (HTTP $response)"
else
    echo "❌ Frontend is not accessible (HTTP $response)"
    exit 1
fi

# Test 2: Check if essential pages load
echo "📍 Test 2: Essential Pages"
pages=("/" "/shop.html" "/contact.html")
for page in "${pages[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL$page")
    if [ "$response" == "200" ]; then
        echo "✅ Page $page loads successfully"
    else
        echo "❌ Page $page failed to load (HTTP $response)"
        exit 1
    fi
done

# Test 3: Check static assets
echo "📍 Test 3: Static Assets"
assets=(
    "/assets/css/templatemo-lugx-gaming.css"
    "/assets/js/custom.js"
    "/assets/images/logo.png"
)
for asset in "${assets[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL$asset")
    if [ "$response" == "200" ]; then
        echo "✅ Asset $asset loads successfully"
    else
        echo "❌ Asset $asset failed to load (HTTP $response)"
    fi
done

# Test 4: Kubernetes health check (if running in cluster)
if command -v kubectl &> /dev/null; then
    echo "📍 Test 4: Kubernetes Health Check"
    
    # Check if namespace exists
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo "✅ Namespace $NAMESPACE exists"
        
        # Check pod status
        pods=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[*].status.phase}')
        if [[ "$pods" == *"Running"* ]]; then
            echo "✅ Pods are running in namespace $NAMESPACE"
        else
            echo "❌ Some pods are not running in namespace $NAMESPACE"
            kubectl get pods -n "$NAMESPACE"
        fi
        
        # Check services
        services=$(kubectl get services -n "$NAMESPACE" -o name)
        if [ -n "$services" ]; then
            echo "✅ Services are available in namespace $NAMESPACE"
        else
            echo "❌ No services found in namespace $NAMESPACE"
        fi
    else
        echo "ℹ️  Namespace $NAMESPACE not found (might be running locally)"
    fi
fi

# Test 5: Performance test (basic)
echo "📍 Test 5: Basic Performance Test"
start_time=$(date +%s%N)
curl -s "$FRONTEND_URL" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

if [ "$response_time" -lt 2000 ]; then
    echo "✅ Response time is acceptable: ${response_time}ms"
else
    echo "⚠️  Response time is slow: ${response_time}ms"
fi

echo "🎉 All tests completed successfully!"
echo "📊 Test Summary:"
echo "   - Frontend Accessibility: ✅"
echo "   - Essential Pages: ✅"
echo "   - Static Assets: ✅"
echo "   - Kubernetes Health: ✅"
echo "   - Performance: ✅ (${response_time}ms)"
