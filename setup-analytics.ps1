# LUGX Gaming Analytics Stack Setup Script (PowerShell)
# This script sets up the complete analytics infrastructure with ClickHouse

Write-Host "🚀 Setting up LUGX Gaming Analytics Stack..." -ForegroundColor Blue

function Print-Status($message) {
    Write-Host "[INFO] $message" -ForegroundColor Blue
}

function Print-Success($message) {
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
}

function Print-Warning($message) {
    Write-Host "[WARNING] $message" -ForegroundColor Yellow
}

function Print-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# Check if Docker is running
try {
    docker info | Out-Null
    Print-Success "Docker is running"
} catch {
    Print-Error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
}

# Step 1: Stop existing services
Print-Status "Stopping existing services..."
Set-Location database
docker-compose -f docker-compose.yml down 2>$null
docker-compose -f clickhouse-compose.yml down 2>$null

# Step 2: Create network if it doesn't exist
Print-Status "Creating Docker network..."
docker network create lugx-network 2>$null
if ($LASTEXITCODE -ne 0) {
    Print-Warning "Network lugx-network already exists"
}

# Step 3: Start PostgreSQL
Print-Status "Starting PostgreSQL database..."
docker-compose -f docker-compose.yml up -d

# Wait for PostgreSQL to be ready
Print-Status "Waiting for PostgreSQL to be ready..."
Start-Sleep 10

# Test PostgreSQL connection
try {
    docker exec lugx-postgres pg_isready -U lugx_admin -d lugx_gaming | Out-Null
    Print-Success "PostgreSQL is ready"
} catch {
    Print-Warning "PostgreSQL may not be fully ready yet, continuing..."
}

# Step 4: Start ClickHouse
Print-Status "Starting ClickHouse analytics database..."
docker-compose -f clickhouse-compose.yml up -d

# Wait for ClickHouse to be ready
Print-Status "Waiting for ClickHouse to be ready..."
Start-Sleep 15

# Test ClickHouse connection
$maxAttempts = 30
$attempt = 1
$clickhouseReady = $false

while ($attempt -le $maxAttempts) {
    try {
        docker exec lugx-clickhouse clickhouse-client --query "SELECT 1" | Out-Null
        Print-Success "ClickHouse is ready"
        $clickhouseReady = $true
        break
    } catch {
        Print-Status "Waiting for ClickHouse... (attempt $attempt/$maxAttempts)"
        Start-Sleep 5
        $attempt++
    }
}

if (-not $clickhouseReady) {
    Print-Error "ClickHouse failed to start properly"
    exit 1
}

# Step 5: Install Analytics Service dependencies
Print-Status "Installing Analytics Service dependencies..."
Set-Location ..\services\analytics-service
npm install

# Step 6: Test Analytics Service ClickHouse connection
Print-Status "Testing Analytics Service ClickHouse integration..."
$testScript = @"
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
"@

try {
    node -e $testScript
    Print-Success "Analytics Service ClickHouse integration working"
} catch {
    Print-Warning "Analytics Service ClickHouse connection test failed, but continuing..."
}

# Step 7: Display service status
Print-Status "Checking service status..."
Set-Location ..\..\database

Write-Host ""
Write-Host "📊 Analytics Stack Status:" -ForegroundColor Cyan
Write-Host "=========================="

# PostgreSQL status
try {
    docker exec lugx-postgres pg_isready -U lugx_admin -d lugx_gaming | Out-Null
    Print-Success "PostgreSQL: Running on port 5432"
    Write-Host "  📊 pgAdmin: http://localhost:5050 (admin@lugx.com / admin123)" -ForegroundColor Gray
} catch {
    Print-Error "PostgreSQL: Not responding"
}

# ClickHouse status
try {
    docker exec lugx-clickhouse clickhouse-client --query "SELECT 1" | Out-Null
    Print-Success "ClickHouse: Running on ports 8123 (HTTP) and 9000 (TCP)"
    Write-Host "  📈 HTTP Interface: http://localhost:8123" -ForegroundColor Gray
    Write-Host "  🔍 Database: lugx_analytics" -ForegroundColor Gray
    Write-Host "  👤 User: lugx_analytics_user" -ForegroundColor Gray
} catch {
    Print-Error "ClickHouse: Not responding"
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "=============="
Write-Host "1. Start Analytics Service:" -ForegroundColor White
Write-Host "   cd services\analytics-service" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test Analytics API:" -ForegroundColor White
Write-Host "   curl http://localhost:3002/health" -ForegroundColor Gray
Write-Host "   curl http://localhost:3002/api/analytics/dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start other services:" -ForegroundColor White
Write-Host "   # Game Service (Terminal 1)" -ForegroundColor Gray
Write-Host "   cd services\game-service; npm start" -ForegroundColor Gray
Write-Host "   " -ForegroundColor Gray
Write-Host "   # Order Service (Terminal 2)" -ForegroundColor Gray
Write-Host "   cd services\order-service; node app-database.js" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Access Analytics Dashboard:" -ForegroundColor White
Write-Host "   curl http://localhost:3002/api/analytics/dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Send test analytics events:" -ForegroundColor White
Write-Host "   curl -X POST http://localhost:3002/api/analytics/events \\" -ForegroundColor Gray
Write-Host "   -H 'Content-Type: application/json' \\" -ForegroundColor Gray
Write-Host "   -d '{`"events`": [{`"event_type`": `"page_view`", `"session_id`": `"test_session`", `"page_url`": `"/`", `"page_title`": `"Home`"}]}'" -ForegroundColor Gray

Write-Host ""
Print-Success "Analytics stack setup complete! 🎉"
Write-Host ""
Write-Host "📋 Service URLs:" -ForegroundColor Cyan
Write-Host "  🎮 Game Service:      http://localhost:3000/health" -ForegroundColor Gray
Write-Host "  🛒 Order Service:     http://localhost:3001/health" -ForegroundColor Gray
Write-Host "  📊 Analytics Service: http://localhost:3002/health" -ForegroundColor Gray
Write-Host "  🐘 PostgreSQL:       localhost:5432" -ForegroundColor Gray
Write-Host "  📈 ClickHouse:        localhost:8123" -ForegroundColor Gray
Write-Host "  🖥️  pgAdmin:          http://localhost:5050" -ForegroundColor Gray
