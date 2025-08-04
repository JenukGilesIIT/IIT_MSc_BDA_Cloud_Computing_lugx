# AWS QuickSight Setup Script for Lugx Gaming Platform (PowerShell)

param(
    [Parameter(Mandatory=$false)]
    [string]$S3Bucket = "lugx-gaming-analytics",
    [Parameter(Mandatory=$false)]
    [string]$AWSRegion = "us-west-2",
    [Parameter(Mandatory=$false)]
    [string]$QuickSightUser = "lugx-gaming-admin"
)

$ErrorActionPreference = "Stop"

# Logging functions
function Write-Status {
    param([string]$Message)
    Write-Host "📋 $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

# Function to check AWS CLI
function Test-AWSCli {
    Write-Status "Checking AWS CLI configuration..."
    
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Error "AWS CLI is not installed. Please install it first:"
        Write-Host "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    }
    
    try {
        aws sts get-caller-identity --query Account --output text | Out-Null
        Write-Success "AWS CLI is configured"
        return $true
    } catch {
        Write-Error "AWS CLI is not configured. Please run 'aws configure' first."
        return $false
    }
}

# Function to create S3 bucket
function New-S3AnalyticsBucket {
    Write-Status "Creating S3 bucket: $S3Bucket"
    
    try {
        $bucketExists = aws s3 ls "s3://$S3Bucket" 2>$null
        if ($bucketExists) {
            Write-Success "S3 bucket already exists: $S3Bucket"
        } else {
            aws s3 mb "s3://$S3Bucket" --region $AWSRegion
            Write-Success "Created S3 bucket: $S3Bucket"
        }
        
        # Create folder structure - just create dummy objects to establish structure
        Write-Status "Setting up S3 folder structure..."
        "dummy" | aws s3 cp - "s3://$S3Bucket/exports/page_views/.keep"
        "dummy" | aws s3 cp - "s3://$S3Bucket/exports/game_interactions/.keep"
        "dummy" | aws s3 cp - "s3://$S3Bucket/exports/user_sessions/.keep"
        
    } catch {
        Write-Error "Failed to create S3 bucket: $($_.Exception.Message)"
        return $false
    }
    
    return $true
}

# Function to export ClickHouse data
function Export-ClickHouseData {
    Write-Status "Exporting ClickHouse data to S3..."
    
    $date = Get-Date -Format "yyyy-MM-dd"
    
    # Check if ClickHouse is running
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8123" -TimeoutSec 5 -ErrorAction Stop
    } catch {
        Write-Warning "ClickHouse is not running. Starting with Docker Compose..."
        Set-Location "..\database"
        docker-compose -f clickhouse-compose.yml up -d
        Start-Sleep 15
    }
    
    # Create temp directory
    $tempDir = "$env:TEMP\lugx-analytics-export"
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    try {
        # Export page views data
        Write-Status "📈 Exporting page views data..."
        $pageViewsQuery = @"
SELECT 
    toDate(timestamp) as date,
    page_category,
    COUNT(*) as page_views,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(time_on_page_seconds) as avg_time_on_page,
    AVG(scroll_depth_percentage) as avg_scroll_depth
FROM page_views 
WHERE timestamp >= now() - INTERVAL 30 DAY
GROUP BY date, page_category
ORDER BY date DESC
FORMAT CSV
"@
        
        docker exec lugx-clickhouse clickhouse-client --query $pageViewsQuery > "$tempDir\page_views_$date.csv"
        
        # Export game interactions data
        Write-Status "🎮 Exporting game interactions data..."
        $gameInteractionsQuery = @"
SELECT 
    toDate(timestamp) as date,
    game_id,
    game_title,
    game_category,
    interaction_type,
    COUNT(*) as interactions,
    COUNT(DISTINCT session_id) as unique_sessions,
    SUM(CASE WHEN interaction_type = 'purchase' THEN interaction_value ELSE 0 END) as revenue
FROM game_interactions 
WHERE timestamp >= now() - INTERVAL 30 DAY
GROUP BY date, game_id, game_title, game_category, interaction_type
ORDER BY date DESC, interactions DESC
FORMAT CSV
"@
        
        docker exec lugx-clickhouse clickhouse-client --query $gameInteractionsQuery > "$tempDir\game_interactions_$date.csv"
        
        # Export user sessions data
        Write-Status "👥 Exporting user sessions data..."
        $userSessionsQuery = @"
SELECT 
    toDate(session_start_time) as date,
    device_type,
    browser,
    country,
    COUNT(*) as sessions,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(session_duration_seconds) as avg_session_duration,
    AVG(page_views) as avg_pages_per_session
FROM user_sessions 
WHERE session_start_time >= now() - INTERVAL 30 DAY
GROUP BY date, device_type, browser, country
ORDER BY date DESC
FORMAT CSV
"@
        
        docker exec lugx-clickhouse clickhouse-client --query $userSessionsQuery > "$tempDir\user_sessions_$date.csv"
        
        # Upload to S3
        Write-Status "☁️ Uploading data to S3..."
        aws s3 cp "$tempDir\page_views_$date.csv" "s3://$S3Bucket/exports/page_views/$date/" --region $AWSRegion
        aws s3 cp "$tempDir\game_interactions_$date.csv" "s3://$S3Bucket/exports/game_interactions/$date/" --region $AWSRegion
        aws s3 cp "$tempDir\user_sessions_$date.csv" "s3://$S3Bucket/exports/user_sessions/$date/" --region $AWSRegion
        
        Write-Success "Data export completed successfully"
        
    } catch {
        Write-Error "Failed to export ClickHouse data: $($_.Exception.Message)"
        return $false
    } finally {
        # Clean up
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
    }
    
    return $true
}

# Function to create QuickSight data sources
function New-QuickSightDataSources {
    Write-Status "📊 Creating QuickSight data sources..."
    
    try {
        $accountId = aws sts get-caller-identity --query Account --output text
        
        # Create data source configuration
        $dataSourceConfig = @{
            AwsAccountId = $accountId
            DataSourceId = "lugx-page-views-datasource"
            Name = "Lugx Gaming - Page Views"
            Type = "S3"
            DataSourceParameters = @{
                S3Parameters = @{
                    ManifestFileLocation = @{
                        Bucket = $S3Bucket
                        Key = "exports/page_views/"
                    }
                }
            }
            Permissions = @(
                @{
                    Principal = "arn:aws:quicksight:$AWSRegion:$accountId:user/default/$QuickSightUser"
                    Actions = @(
                        "quicksight:UpdateDataSourcePermissions",
                        "quicksight:DescribeDataSource",
                        "quicksight:DescribeDataSourcePermissions",
                        "quicksight:PassDataSource",
                        "quicksight:UpdateDataSource",
                        "quicksight:DeleteDataSource"
                    )
                }
            )
        }
        
        $dataSourceJson = $dataSourceConfig | ConvertTo-Json -Depth 10
        $tempFile = "$env:TEMP\datasource.json"
        $dataSourceJson | Out-File -FilePath $tempFile -Encoding UTF8
        
        # Create data source
        aws quicksight create-data-source --cli-input-json file://$tempFile --region $AWSRegion 2>$null
        
        Remove-Item $tempFile -Force
        Write-Success "QuickSight data sources created"
        
    } catch {
        Write-Warning "Data source may already exist or failed to create: $($_.Exception.Message)"
    }
}

# Main function
function Main {
    Write-Host "🚀 Starting AWS QuickSight setup for Lugx Gaming Platform" -ForegroundColor Cyan
    Write-Host "===========================================================" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not (Test-AWSCli)) {
        exit 1
    }
    
    if (-not (New-S3AnalyticsBucket)) {
        exit 1
    }
    
    if (-not (Export-ClickHouseData)) {
        exit 1
    }
    
    New-QuickSightDataSources
    
    Write-Host ""
    Write-Success "AWS QuickSight setup completed successfully!"
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "==============" -ForegroundColor Cyan
    Write-Host "1. Log in to AWS QuickSight console:" -ForegroundColor White
    Write-Host "   https://quicksight.aws.amazon.com/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Create visualizations using the data in S3:" -ForegroundColor White
    Write-Host "   - Bucket: $S3Bucket" -ForegroundColor Gray
    Write-Host "   - Folders: exports/page_views/, exports/game_interactions/, exports/user_sessions/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Set up scheduled data refresh:" -ForegroundColor White
    Write-Host "   - Configure daily data exports from ClickHouse" -ForegroundColor Gray
    Write-Host "   - Set up QuickSight SPICE refresh schedule" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔄 To update data regularly, run this script daily:" -ForegroundColor Yellow
    Write-Host "   .\quicksight-setup.ps1" -ForegroundColor Gray
}

# Run main function
Main
