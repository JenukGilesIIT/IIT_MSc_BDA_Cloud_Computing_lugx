#!/bin/bash

# AWS QuickSight Setup Script for Lugx Gaming Platform
set -e

# Configuration
S3_BUCKET="lugx-gaming-analytics"
QUICKSIGHT_USER="lugx-gaming-admin"
AWS_REGION="us-west-2"
CLICKHOUSE_HOST="localhost"
CLICKHOUSE_PORT="8123"
DATE=$(date +%Y-%m-%d)

echo "🔄 Setting up AWS QuickSight integration for Lugx Gaming Platform..."

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is not installed. Please install it first:"
        echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    echo "✅ AWS CLI is configured"
}

# Function to create S3 bucket for analytics data
create_s3_bucket() {
    echo "📦 Creating S3 bucket: $S3_BUCKET"
    
    if aws s3 ls "s3://$S3_BUCKET" 2>/dev/null; then
        echo "✅ S3 bucket already exists: $S3_BUCKET"
    else
        aws s3 mb "s3://$S3_BUCKET" --region "$AWS_REGION"
        echo "✅ Created S3 bucket: $S3_BUCKET"
    fi
    
    # Create folder structure
    aws s3 cp /dev/null "s3://$S3_BUCKET/exports/page_views/" --region "$AWS_REGION" || true
    aws s3 cp /dev/null "s3://$S3_BUCKET/exports/game_interactions/" --region "$AWS_REGION" || true
    aws s3 cp /dev/null "s3://$S3_BUCKET/exports/user_sessions/" --region "$AWS_REGION" || true
}

# Function to export ClickHouse data to S3
export_clickhouse_data() {
    echo "📊 Exporting ClickHouse data to S3..."
    
    # Check if ClickHouse is running
    if ! curl -s "http://$CLICKHOUSE_HOST:$CLICKHOUSE_PORT" >/dev/null; then
        echo "⚠️ ClickHouse is not running. Starting with Docker Compose..."
        cd ../database && docker-compose -f clickhouse-compose.yml up -d
        sleep 15
    fi
    
    # Create temp directory
    mkdir -p /tmp/lugx-analytics-export
    
    # Export page views data
    echo "📈 Exporting page views data..."
    docker exec lugx-clickhouse clickhouse-client --query "
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
    " > /tmp/lugx-analytics-export/page_views_${DATE}.csv
    
    # Export game interactions data
    echo "🎮 Exporting game interactions data..."
    docker exec lugx-clickhouse clickhouse-client --query "
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
    " > /tmp/lugx-analytics-export/game_interactions_${DATE}.csv
    
    # Export user sessions data
    echo "👥 Exporting user sessions data..."
    docker exec lugx-clickhouse clickhouse-client --query "
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
    " > /tmp/lugx-analytics-export/user_sessions_${DATE}.csv
    
    # Upload to S3
    echo "☁️ Uploading data to S3..."
    aws s3 cp /tmp/lugx-analytics-export/page_views_${DATE}.csv "s3://$S3_BUCKET/exports/page_views/$DATE/" --region "$AWS_REGION"
    aws s3 cp /tmp/lugx-analytics-export/game_interactions_${DATE}.csv "s3://$S3_BUCKET/exports/game_interactions/$DATE/" --region "$AWS_REGION"
    aws s3 cp /tmp/lugx-analytics-export/user_sessions_${DATE}.csv "s3://$S3_BUCKET/exports/user_sessions/$DATE/" --region "$AWS_REGION"
    
    # Clean up
    rm -rf /tmp/lugx-analytics-export
    
    echo "✅ Data export completed successfully"
}

# Function to create QuickSight data sources
create_quicksight_data_sources() {
    echo "📊 Creating QuickSight data sources..."
    
    # Get AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Create data source for page views
    cat > /tmp/page_views_datasource.json << EOF
{
    "AwsAccountId": "$ACCOUNT_ID",
    "DataSourceId": "lugx-page-views-datasource",
    "Name": "Lugx Gaming - Page Views",
    "Type": "S3",
    "DataSourceParameters": {
        "S3Parameters": {
            "ManifestFileLocation": {
                "Bucket": "$S3_BUCKET",
                "Key": "exports/page_views/"
            }
        }
    },
    "Permissions": [
        {
            "Principal": "arn:aws:quicksight:$AWS_REGION:$ACCOUNT_ID:user/default/$QUICKSIGHT_USER",
            "Actions": [
                "quicksight:UpdateDataSourcePermissions",
                "quicksight:DescribeDataSource",
                "quicksight:DescribeDataSourcePermissions",
                "quicksight:PassDataSource",
                "quicksight:UpdateDataSource",
                "quicksight:DeleteDataSource"
            ]
        }
    ]
}
EOF
    
    # Create data source
    aws quicksight create-data-source --cli-input-json file:///tmp/page_views_datasource.json --region "$AWS_REGION" || echo "⚠️ Data source may already exist"
    
    echo "✅ QuickSight data sources created"
}

# Function to create QuickSight datasets
create_quicksight_datasets() {
    echo "📈 Creating QuickSight datasets..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Create dataset for analytics dashboard
    cat > /tmp/analytics_dataset.json << EOF
{
    "AwsAccountId": "$ACCOUNT_ID",
    "DataSetId": "lugx-analytics-dataset",
    "Name": "Lugx Gaming Analytics",
    "PhysicalTableMap": {
        "page-views-table": {
            "S3Source": {
                "DataSourceArn": "arn:aws:quicksight:$AWS_REGION:$ACCOUNT_ID:datasource/lugx-page-views-datasource",
                "InputColumns": [
                    {"Name": "date", "Type": "DATETIME"},
                    {"Name": "page_category", "Type": "STRING"},
                    {"Name": "page_views", "Type": "INTEGER"},
                    {"Name": "unique_sessions", "Type": "INTEGER"},
                    {"Name": "unique_users", "Type": "INTEGER"},
                    {"Name": "avg_time_on_page", "Type": "DECIMAL"},
                    {"Name": "avg_scroll_depth", "Type": "DECIMAL"}
                ]
            }
        }
    },
    "ImportMode": "SPICE",
    "Permissions": [
        {
            "Principal": "arn:aws:quicksight:$AWS_REGION:$ACCOUNT_ID:user/default/$QUICKSIGHT_USER",
            "Actions": [
                "quicksight:UpdateDataSetPermissions",
                "quicksight:DescribeDataSet",
                "quicksight:DescribeDataSetPermissions",
                "quicksight:PassDataSet",
                "quicksight:DescribeIngestion",
                "quicksight:ListIngestions",
                "quicksight:UpdateDataSet",
                "quicksight:DeleteDataSet",
                "quicksight:CreateIngestion",
                "quicksight:CancelIngestion"
            ]
        }
    ]
}
EOF
    
    # Create dataset
    aws quicksight create-data-set --cli-input-json file:///tmp/analytics_dataset.json --region "$AWS_REGION" || echo "⚠️ Dataset may already exist"
    
    # Clean up temp files
    rm -f /tmp/page_views_datasource.json /tmp/analytics_dataset.json
    
    echo "✅ QuickSight datasets created"
}

# Function to create QuickSight dashboard
create_quicksight_dashboard() {
    echo "📊 Creating QuickSight dashboard..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Create analysis first
    cat > /tmp/dashboard_definition.json << EOF
{
    "AwsAccountId": "$ACCOUNT_ID",
    "AnalysisId": "lugx-gaming-analysis",
    "Name": "Lugx Gaming Platform Analytics",
    "Definition": {
        "DataSetIdentifiersDeclarations": [
            {
                "DataSetArn": "arn:aws:quicksight:$AWS_REGION:$ACCOUNT_ID:dataset/lugx-analytics-dataset",
                "Identifier": "lugx-analytics"
            }
        ],
        "Sheets": [
            {
                "SheetId": "overview-sheet",
                "Name": "Platform Overview",
                "Visuals": [
                    {
                        "BarChartVisual": {
                            "VisualId": "page-views-by-category",
                            "Title": {
                                "Visibility": "VISIBLE",
                                "FormatText": {
                                    "PlainText": "Page Views by Category"
                                }
                            },
                            "FieldWells": {
                                "BarChartAggregatedFieldWells": {
                                    "Category": [
                                        {
                                            "CategoricalDimensionField": {
                                                "FieldId": "page_category",
                                                "Column": {
                                                    "DataSetIdentifier": "lugx-analytics",
                                                    "ColumnName": "page_category"
                                                }
                                            }
                                        }
                                    ],
                                    "Values": [
                                        {
                                            "NumericalMeasureField": {
                                                "FieldId": "page_views_sum",
                                                "Column": {
                                                    "DataSetIdentifier": "lugx-analytics",
                                                    "ColumnName": "page_views"
                                                },
                                                "AggregationFunction": {
                                                    "SimpleNumericalAggregation": "SUM"
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    "Permissions": [
        {
            "Principal": "arn:aws:quicksight:$AWS_REGION:$ACCOUNT_ID:user/default/$QUICKSIGHT_USER",
            "Actions": [
                "quicksight:RestoreAnalysis",
                "quicksight:UpdateAnalysisPermissions",
                "quicksight:DeleteAnalysis",
                "quicksight:DescribeAnalysisPermissions",
                "quicksight:QueryAnalysis",
                "quicksight:DescribeAnalysis",
                "quicksight:UpdateAnalysis"
            ]
        }
    ]
}
EOF
    
    # Create analysis
    aws quicksight create-analysis --cli-input-json file:///tmp/dashboard_definition.json --region "$AWS_REGION" || echo "⚠️ Analysis may already exist"
    
    rm -f /tmp/dashboard_definition.json
    
    echo "✅ QuickSight dashboard template created"
}

# Main execution
main() {
    echo "🚀 Starting AWS QuickSight setup for Lugx Gaming Platform"
    echo "=================================================="
    
    check_aws_cli
    create_s3_bucket
    export_clickhouse_data
    create_quicksight_data_sources
    create_quicksight_datasets
    create_quicksight_dashboard
    
    echo ""
    echo "✅ AWS QuickSight setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "=============="
    echo "1. Log in to AWS QuickSight console:"
    echo "   https://quicksight.aws.amazon.com/"
    echo ""
    echo "2. Create visualizations using the datasets:"
    echo "   - lugx-analytics-dataset (Page views and user metrics)"
    echo ""
    echo "3. Set up scheduled data refresh:"
    echo "   - Configure daily data exports from ClickHouse"
    echo "   - Set up QuickSight SPICE refresh schedule"
    echo ""
    echo "4. Dashboard URLs will be available at:"
    echo "   https://quicksight.aws.amazon.com/sn/analyses/lugx-gaming-analysis"
    echo ""
    echo "🔄 To update data regularly, run this script daily or set up a cron job:"
    echo "   0 6 * * * /path/to/quicksight-setup.sh"
}

# Run main function
main "$@"
