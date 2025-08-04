#!/bin/bash

# LUGX Gaming Platform - Integration Test Suite
# This script runs comprehensive tests for all services

set -e

echo "🚀 Starting LUGX Gaming Platform Integration Tests..."

# Configuration
FRONTEND_URL="http://localhost:3000"
GAME_SERVICE_URL="http://localhost:3001"
ORDER_SERVICE_URL="http://localhost:3003"
ANALYTICS_SERVICE_URL="http://localhost:3002"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Frontend Tests
echo "🌐 Testing Frontend Service..."
run_test "Frontend Health Check" "curl -f $FRONTEND_URL -o /dev/null -s"
run_test "Frontend Shop Page" "curl -f $FRONTEND_URL/shop.html -o /dev/null -s"
run_test "Frontend Product Details" "curl -f $FRONTEND_URL/product-details.html -o /dev/null -s"
run_test "Frontend Analytics Dashboard" "curl -f $FRONTEND_URL/analytics-dashboard.html -o /dev/null -s"

# Game Service Tests
echo "🎮 Testing Game Service..."
run_test "Game Service Health" "curl -f $GAME_SERVICE_URL/health -o /dev/null -s"
run_test "Game Service - Get All Games" "curl -f $GAME_SERVICE_URL/api/games -o /dev/null -s"
run_test "Game Service - Get Specific Game" "curl -f $GAME_SERVICE_URL/api/games/1 -o /dev/null -s"

# Order Service Tests
echo "🛒 Testing Order Service..."
run_test "Order Service Health" "curl -f $ORDER_SERVICE_URL/health -o /dev/null -s"
run_test "Order Service - Get Orders" "curl -f $ORDER_SERVICE_URL/api/orders -o /dev/null -s"

# Analytics Service Tests
echo "📊 Testing Analytics Service..."
run_test "Analytics Service Health" "curl -f $ANALYTICS_SERVICE_URL/health -o /dev/null -s"
run_test "Analytics Service - Post Event" "curl -f -X POST $ANALYTICS_SERVICE_URL/api/analytics/events -H 'Content-Type: application/json' -d '{\"eventType\":\"test\",\"data\":{\"test\":true}}' -o /dev/null -s"

# API Integration Tests
echo "🔗 Testing API Integration..."

# Test creating an order
ORDER_DATA='{
    "userId": "test-user-123",
    "items": [
        {
            "gameId": 1,
            "title": "Call of Duty: Modern Warfare",
            "price": 59.99,
            "quantity": 1
        }
    ],
    "totalAmount": 59.99
}'

run_test "Create Order Integration" "curl -f -X POST $ORDER_SERVICE_URL/api/orders -H 'Content-Type: application/json' -d '$ORDER_DATA' -o /dev/null -s"

# Test adding a game
GAME_DATA='{
    "title": "Test Game",
    "genre": "Action",
    "price": 29.99,
    "description": "Test game for integration testing"
}'

run_test "Add Game Integration" "curl -f -X POST $GAME_SERVICE_URL/api/games -H 'Content-Type: application/json' -d '$GAME_DATA' -o /dev/null -s"

# Performance Tests
echo "⚡ Running Performance Tests..."

# Test response times
run_test "Frontend Response Time < 2s" "timeout 2s curl -f $FRONTEND_URL -o /dev/null -s"
run_test "Game Service Response Time < 1s" "timeout 1s curl -f $GAME_SERVICE_URL/api/games -o /dev/null -s"

# Load Test (simple)
echo "🔄 Running Basic Load Test..."
run_test "Handle 10 Concurrent Requests" "for i in {1..10}; do curl -f $FRONTEND_URL -o /dev/null -s & done; wait"

# Database Connection Tests
echo "💾 Testing Database Connections..."
run_test "PostgreSQL Connection" "curl -f $GAME_SERVICE_URL/api/health/db -o /dev/null -s"
run_test "ClickHouse Connection" "curl -f $ANALYTICS_SERVICE_URL/api/health/clickhouse -o /dev/null -s"

# Final Results
echo "=============================================="
echo "🏁 Integration Test Results:"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo "=============================================="

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the system before deployment.${NC}"
    exit 1
fi
