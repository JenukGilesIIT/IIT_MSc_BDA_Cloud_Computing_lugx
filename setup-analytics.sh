#!/bin/bash

# LUGX Gaming Analytics Stack Setup Script
# This script sets up the complete analytics infrastructure with ClickHouse

echo "🚀 Setting up LUGX Gaming Analytics Stack..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_success "Docker is running"

# Step 1: Stop existing services
print_status "Stopping existing services..."
cd database
docker-compose -f docker-compose.yml down 2>/dev/null || true
docker-compose -f clickhouse-compose.yml down 2>/dev/null || true

# Step 2: Create network if it doesn't exist
print_status "Creating Docker network..."
docker network create lugx-network 2>/dev/null || print_warning "Network lugx-network already exists"

# Step 3: Start PostgreSQL (if not already running)
print_status "Starting PostgreSQL database..."
docker-compose -f docker-compose.yml up -d

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to be ready..."
sleep 10

# Test PostgreSQL connection
if docker exec lugx-postgres pg_isready -U lugx_admin -d lugx_gaming; then
    print_success "PostgreSQL is ready"
else
    print_warning "PostgreSQL may not be fully ready yet, continuing..."
fi

# Step 4: Start ClickHouse
print_status "Starting ClickHouse analytics database..."
docker-compose -f clickhouse-compose.yml up -d

# Wait for ClickHouse to be ready
print_status "Waiting for ClickHouse to be ready..."
sleep 15

# Test ClickHouse connection
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker exec lugx-clickhouse clickhouse-client --query "SELECT 1" > /dev/null 2>&1; then
        print_success "ClickHouse is ready"
        break
    else
        print_status "Waiting for ClickHouse... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    print_error "ClickHouse failed to start properly"
    exit 1
fi

# Step 5: Install Analytics Service dependencies
print_status "Installing Analytics Service dependencies..."
cd ../services/analytics-service
npm install

# Step 6: Test Analytics Service ClickHouse connection
print_status "Testing Analytics Service ClickHouse integration..."
if node -e "
const { testConnection } = require('./clickhouse');
testConnection().then(success => {
    if (success) {
        console.log('✅ Analytics Service ClickHouse connection successful');
        process.exit(0);
    } else {
        console.log('❌ Analytics Service ClickHouse connection failed');
        process.exit(1);
    }
}).catch(err => {
    console.log('❌ Error testing connection:', err.message);
    process.exit(1);
});
"; then
    print_success "Analytics Service ClickHouse integration working"
else
    print_warning "Analytics Service ClickHouse connection test failed, but continuing..."
fi

# Step 7: Display service status
print_status "Checking service status..."
cd ../../database

echo ""
echo "📊 Analytics Stack Status:"
echo "=========================="

# PostgreSQL status
if docker exec lugx-postgres pg_isready -U lugx_admin -d lugx_gaming > /dev/null 2>&1; then
    print_success "PostgreSQL: Running on port 5432"
    echo "  📊 pgAdmin: http://localhost:5050 (admin@lugx.com / admin123)"
else
    print_error "PostgreSQL: Not responding"
fi

# ClickHouse status
if docker exec lugx-clickhouse clickhouse-client --query "SELECT 1" > /dev/null 2>&1; then
    print_success "ClickHouse: Running on ports 8123 (HTTP) and 9000 (TCP)"
    echo "  📈 HTTP Interface: http://localhost:8123"
    echo "  🔍 Database: lugx_analytics"
    echo "  👤 User: lugx_analytics_user"
else
    print_error "ClickHouse: Not responding"
fi

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Start Analytics Service:"
echo "   cd services/analytics-service"
echo "   npm start"
echo ""
echo "2. Test Analytics API:"
echo "   curl http://localhost:3002/health"
echo "   curl http://localhost:3002/api/analytics/dashboard"
echo ""
echo "3. Start other services:"
echo "   # Game Service (Terminal 1)"
echo "   cd services/game-service && npm start"
echo "   "
echo "   # Order Service (Terminal 2)"  
echo "   cd services/order-service && node app-database.js"
echo ""
echo "4. Access Analytics Dashboard:"
echo "   curl http://localhost:3002/api/analytics/dashboard"
echo ""
echo "5. Send test analytics events:"
echo "   curl -X POST http://localhost:3002/api/analytics/events \\"
echo "   -H 'Content-Type: application/json' \\"
echo "   -d '{\"events\": [{\"event_type\": \"page_view\", \"session_id\": \"test_session\", \"page_url\": \"/\", \"page_title\": \"Home\"}]}'"

echo ""
print_success "Analytics stack setup complete! 🎉"
echo ""
echo "📋 Service URLs:"
echo "  🎮 Game Service:      http://localhost:3000/health"
echo "  🛒 Order Service:     http://localhost:3001/health"
echo "  📊 Analytics Service: http://localhost:3002/health"
echo "  🐘 PostgreSQL:       localhost:5432"
echo "  📈 ClickHouse:        localhost:8123"
echo "  🖥️  pgAdmin:          http://localhost:5050"
