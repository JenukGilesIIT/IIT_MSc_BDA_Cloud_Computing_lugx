const { createClient } = require('@clickhouse/client');
require('dotenv').config();

// ClickHouse connection configuration
const clickhouseConfig = {
    host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'lugx_analytics_user',
    password: process.env.CLICKHOUSE_PASSWORD || 'lugx_analytics_secure',
    database: process.env.CLICKHOUSE_DB || 'lugx_analytics',
    clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
    },
};

// Create ClickHouse client
const clickhouse = createClient(clickhouseConfig);

// Test ClickHouse connection
const testConnection = async () => {
    try {
        const result = await clickhouse.query({
            query: 'SELECT 1 as test',
            format: 'JSONEachRow',
        });
        
        const data = await result.json();
        console.log('✅ ClickHouse connection successful');
        return true;
    } catch (error) {
        console.error('❌ ClickHouse connection failed:', error.message);
        return false;
    }
};

// Execute query with proper error handling
const executeQuery = async (query, params = {}) => {
    try {
        const result = await clickhouse.query({
            query,
            query_params: params,
            format: 'JSONEachRow',
        });
        
        return await result.json();
    } catch (error) {
        console.error('ClickHouse query error:', error);
        throw error;
    }
};

// Insert data with batch support
const insertData = async (table, data) => {
    try {
        if (Array.isArray(data) && data.length === 0) {
            return { success: true, inserted: 0 };
        }

        const dataToInsert = Array.isArray(data) ? data : [data];
        
        await clickhouse.insert({
            table,
            values: dataToInsert,
            format: 'JSONEachRow',
        });

        console.log(`✅ Inserted ${dataToInsert.length} records into ${table}`);
        return { success: true, inserted: dataToInsert.length };
    } catch (error) {
        console.error(`❌ Insert failed for table ${table}:`, error);
        throw error;
    }
};

// Batch insert for high-volume data
const batchInsert = async (table, dataArray, batchSize = 1000) => {
    try {
        if (!Array.isArray(dataArray) || dataArray.length === 0) {
            return { success: true, totalInserted: 0, batches: 0 };
        }

        let totalInserted = 0;
        let batchCount = 0;

        for (let i = 0; i < dataArray.length; i += batchSize) {
            const batch = dataArray.slice(i, i + batchSize);
            await insertData(table, batch);
            totalInserted += batch.length;
            batchCount++;
            
            // Small delay between batches to prevent overwhelming the server
            if (i + batchSize < dataArray.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`✅ Batch insert completed: ${totalInserted} records in ${batchCount} batches`);
        return { success: true, totalInserted, batches: batchCount };
    } catch (error) {
        console.error('❌ Batch insert failed:', error);
        throw error;
    }
};

// Get real-time analytics data
const getRealTimeMetrics = async (timeRange = '1 HOUR') => {
    const query = `
        SELECT 
            toStartOfMinute(timestamp) as minute,
            count() as page_views,
            uniq(session_id) as unique_sessions,
            uniq(user_id) as unique_users,
            avg(time_on_page_seconds) as avg_time_on_page
        FROM page_views 
        WHERE timestamp >= now() - INTERVAL ${timeRange}
        GROUP BY minute
        ORDER BY minute DESC
        LIMIT 60
    `;
    
    return await executeQuery(query);
};

// Get game popularity metrics
const getGamePopularity = async (timeRange = '7 DAY') => {
    const query = `
        SELECT 
            gi.game_title,
            gi.game_category,
            count() as total_interactions,
            uniq(gi.session_id) as unique_sessions,
            countIf(gi.event_type = 'view') as views,
            countIf(gi.event_type = 'add_to_cart') as cart_additions,
            countIf(gi.event_type = 'purchase') as purchases,
            round(countIf(gi.event_type = 'purchase') / countIf(gi.event_type = 'view') * 100, 2) as conversion_rate
        FROM game_interactions gi
        WHERE gi.timestamp >= now() - INTERVAL ${timeRange}
        GROUP BY gi.game_title, gi.game_category
        ORDER BY total_interactions DESC
        LIMIT 20
    `;
    
    return await executeQuery(query);
};

// Get conversion funnel data
const getConversionFunnel = async (timeRange = '7 DAY') => {
    const query = `
        SELECT 
            funnel_step,
            count() as step_count,
            uniq(session_id) as unique_sessions,
            sum(total_amount) as revenue
        FROM purchase_events
        WHERE purchase_timestamp >= now() - INTERVAL ${timeRange}
        GROUP BY funnel_step
        ORDER BY 
            CASE funnel_step
                WHEN 'view' THEN 1
                WHEN 'add_to_cart' THEN 2
                WHEN 'checkout' THEN 3
                WHEN 'purchase' THEN 4
                ELSE 5
            END
    `;
    
    return await executeQuery(query);
};

// Get user behavior analytics
const getUserBehaviorMetrics = async (timeRange = '7 DAY') => {
    const query = `
        SELECT 
            toStartOfDay(session_start_time) as date,
            count() as total_sessions,
            uniq(user_id) as unique_users,
            avg(session_duration_seconds) as avg_session_duration,
            avg(page_views) as avg_pages_per_session,
            countIf(page_views = 1) as bounce_sessions,
            round(countIf(page_views = 1) / count() * 100, 2) as bounce_rate
        FROM user_sessions
        WHERE session_start_time >= now() - INTERVAL ${timeRange}
        GROUP BY date
        ORDER BY date DESC
    `;
    
    return await executeQuery(query);
};

// Get search analytics
const getSearchAnalytics = async (timeRange = '7 DAY') => {
    const query = `
        SELECT 
            search_query,
            count() as search_count,
            uniq(session_id) as unique_searchers,
            avg(results_count) as avg_results,
            countIf(no_results = true) as no_results_count,
            countIf(clicked_result_position IS NOT NULL) as clicks,
            round(countIf(clicked_result_position IS NOT NULL) / count() * 100, 2) as click_through_rate
        FROM search_events
        WHERE timestamp >= now() - INTERVAL ${timeRange}
        GROUP BY search_query
        ORDER BY search_count DESC
        LIMIT 20
    `;
    
    return await executeQuery(query);
};

// Get performance metrics
const getPerformanceMetrics = async (timeRange = '1 HOUR') => {
    const query = `
        SELECT 
            service_name,
            metric_type,
            avg(metric_value) as avg_value,
            min(metric_value) as min_value,
            max(metric_value) as max_value,
            quantile(0.95)(metric_value) as p95_value,
            count() as sample_count
        FROM performance_metrics
        WHERE timestamp >= now() - INTERVAL ${timeRange}
        GROUP BY service_name, metric_type
        ORDER BY service_name, metric_type
    `;
    
    return await executeQuery(query);
};

// Close connection
const closeConnection = async () => {
    try {
        await clickhouse.close();
        console.log('🔌 ClickHouse connection closed');
    } catch (error) {
        console.error('Error closing ClickHouse connection:', error);
    }
};

module.exports = {
    clickhouse,
    testConnection,
    executeQuery,
    insertData,
    batchInsert,
    getRealTimeMetrics,
    getGamePopularity,
    getConversionFunnel,
    getUserBehaviorMetrics,
    getSearchAnalytics,
    getPerformanceMetrics,
    closeConnection
};
