-- ClickHouse Analytics Database Schema for LUGX Gaming Platform
-- This schema is optimized for high-volume analytics and real-time reporting

-- 1. User Sessions Table - Track user sessions and page views
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id String,
    user_id Nullable(String),
    ip_address String,
    user_agent String,
    device_type String,
    browser String,
    operating_system String,
    country String,
    city String,
    session_start_time DateTime,
    session_end_time Nullable(DateTime),
    page_views UInt32,
    session_duration_seconds UInt32,
    referrer_source String,
    utm_campaign Nullable(String),
    utm_medium Nullable(String),
    utm_source Nullable(String),
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (session_start_time, session_id)
TTL created_at + INTERVAL 2 YEAR;

-- 2. Page Views Table - Detailed page tracking
CREATE TABLE IF NOT EXISTS page_views (
    event_id String,
    session_id String,
    user_id Nullable(String),
    page_url String,
    page_title String,
    page_category String,
    timestamp DateTime,
    time_on_page_seconds UInt32,
    scroll_depth_percentage UInt8,
    exit_page Bool,
    bounce Bool,
    previous_page Nullable(String),
    referrer String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (timestamp, session_id)
TTL created_at + INTERVAL 1 YEAR;

-- 3. Game Interactions Table - Track game-specific events
CREATE TABLE IF NOT EXISTS game_interactions (
    event_id String,
    session_id String,
    user_id Nullable(String),
    game_id UInt32,
    game_title String,
    game_category String,
    event_type String, -- 'view', 'click', 'add_to_cart', 'purchase', 'share'
    event_data String, -- JSON string for additional event data
    timestamp DateTime,
    page_context String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (timestamp, game_id, event_type)
TTL created_at + INTERVAL 1 YEAR;

-- 4. Purchase Events Table - E-commerce analytics
CREATE TABLE IF NOT EXISTS purchase_events (
    event_id String,
    session_id String,
    user_id Nullable(String),
    order_id String,
    customer_id String,
    game_id UInt32,
    game_title String,
    game_category String,
    quantity UInt16,
    unit_price Decimal(10,2),
    discount_amount Decimal(10,2),
    total_amount Decimal(10,2),
    payment_method String,
    purchase_timestamp DateTime,
    funnel_step String, -- 'view', 'add_to_cart', 'checkout', 'purchase'
    conversion_time_seconds UInt32,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (purchase_timestamp, customer_id, game_id)
TTL created_at + INTERVAL 3 YEAR;

-- 5. Search Events Table - Search analytics
CREATE TABLE IF NOT EXISTS search_events (
    event_id String,
    session_id String,
    user_id Nullable(String),
    search_query String,
    search_category Nullable(String),
    results_count UInt32,
    clicked_result_position Nullable(UInt16),
    clicked_game_id Nullable(UInt32),
    no_results Bool,
    timestamp DateTime,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (timestamp, search_query)
TTL created_at + INTERVAL 1 YEAR;

-- 6. Performance Metrics Table - System performance tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
    metric_id String,
    service_name String, -- 'frontend', 'game-service', 'order-service', 'analytics-service'
    metric_type String, -- 'response_time', 'error_rate', 'throughput', 'cpu_usage', 'memory_usage'
    metric_value Float64,
    unit String,
    endpoint Nullable(String),
    status_code Nullable(UInt16),
    error_message Nullable(String),
    timestamp DateTime,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (timestamp, service_name, metric_type)
TTL created_at + INTERVAL 6 MONTH;

-- 7. User Behavior Flow Table - User journey tracking
CREATE TABLE IF NOT EXISTS user_behavior_flow (
    flow_id String,
    session_id String,
    user_id Nullable(String),
    step_number UInt8,
    page_url String,
    action_type String, -- 'page_view', 'click', 'form_submit', 'purchase', 'exit'
    element_clicked Nullable(String),
    timestamp DateTime,
    time_since_previous_step_seconds UInt32,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (session_id, step_number, timestamp)
TTL created_at + INTERVAL 1 YEAR;

-- 8. Real-time Dashboard Metrics (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics_hourly
ENGINE = SummingMergeTree()
ORDER BY (metric_hour, metric_type)
AS SELECT
    toStartOfHour(timestamp) as metric_hour,
    'hourly_summary' as metric_type,
    count() as total_events,
    uniq(session_id) as unique_sessions,
    uniq(user_id) as unique_users,
    0 as total_revenue,
    avg(time_on_page_seconds) as avg_time_on_page
FROM page_views
GROUP BY metric_hour;

-- Sample Data Insert Statements

-- Insert sample user sessions
INSERT INTO user_sessions VALUES
('sess_001', 'user_123', '192.168.1.100', 'Mozilla/5.0 Chrome', 'desktop', 'Chrome', 'Windows', 'USA', 'New York', '2025-01-15 10:00:00', '2025-01-15 10:45:00', 12, 2700, 'google.com', 'winter_sale', 'organic', 'google', now()),
('sess_002', 'user_456', '192.168.1.101', 'Mozilla/5.0 Safari', 'mobile', 'Safari', 'iOS', 'Canada', 'Toronto', '2025-01-15 11:30:00', '2025-01-15 11:55:00', 8, 1500, 'facebook.com', 'social_promo', 'social', 'facebook', now()),
('sess_003', NULL, '192.168.1.102', 'Mozilla/5.0 Firefox', 'desktop', 'Firefox', 'Linux', 'UK', 'London', '2025-01-15 14:20:00', '2025-01-15 14:35:00', 5, 900, 'direct', NULL, 'direct', 'direct', now());

-- Insert sample page views
INSERT INTO page_views VALUES
('pv_001', 'sess_001', 'user_123', 'https://lugx-gaming.com/', 'LUGX Gaming - Home', 'homepage', '2025-01-15 10:00:00', 180, 85, false, false, NULL, 'google.com', now()),
('pv_002', 'sess_001', 'user_123', 'https://lugx-gaming.com/shop', 'Game Shop', 'shop', '2025-01-15 10:03:00', 420, 60, false, false, 'https://lugx-gaming.com/', 'google.com', now()),
('pv_003', 'sess_001', 'user_123', 'https://lugx-gaming.com/product/cyberpunk-2077', 'Cyberpunk 2077', 'product', '2025-01-15 10:10:00', 300, 90, false, false, 'https://lugx-gaming.com/shop', 'google.com', now());

-- Insert sample game interactions
INSERT INTO game_interactions VALUES
('gi_001', 'sess_001', 'user_123', 1, 'Cyberpunk 2077', 'RPG', 'view', '{"price": 59.99, "discount": 10}', '2025-01-15 10:10:00', 'product_page', now()),
('gi_002', 'sess_001', 'user_123', 1, 'Cyberpunk 2077', 'RPG', 'add_to_cart', '{"quantity": 1, "variant": "standard"}', '2025-01-15 10:12:00', 'product_page', now()),
('gi_003', 'sess_002', 'user_456', 2, 'Red Dead Redemption 2', 'Action', 'view', '{"price": 49.99, "rating": 4.8}', '2025-01-15 11:35:00', 'product_page', now());

-- Insert sample purchase events
INSERT INTO purchase_events VALUES
('pe_001', 'sess_001', 'user_123', 'order_a1b2c3d4', 'CUST001', 1, 'Cyberpunk 2077', 'RPG', 1, 59.99, 6.00, 53.99, 'credit_card', '2025-01-15 10:15:00', 'purchase', 900, now()),
('pe_002', 'sess_004', 'user_789', 'order_e5f6g7h8', 'CUST002', 3, 'The Witcher 3', 'RPG', 1, 39.99, 0.00, 39.99, 'paypal', '2025-01-15 16:30:00', 'purchase', 1200, now());

-- Insert sample search events
INSERT INTO search_events VALUES
('se_001', 'sess_001', 'user_123', 'cyberpunk', 'RPG', 3, 1, 1, false, '2025-01-15 10:08:00', now()),
('se_002', 'sess_002', 'user_456', 'action games', 'Action', 15, 2, 5, false, '2025-01-15 11:33:00', now()),
('se_003', 'sess_003', NULL, 'racing games', 'Sports', 0, NULL, NULL, true, '2025-01-15 14:25:00', now());

-- Insert sample performance metrics
INSERT INTO performance_metrics VALUES
('pm_001', 'game-service', 'response_time', 45.2, 'ms', '/api/games', 200, NULL, '2025-01-15 10:00:00', now()),
('pm_002', 'order-service', 'response_time', 89.7, 'ms', '/api/orders', 200, NULL, '2025-01-15 10:15:00', now()),
('pm_003', 'frontend', 'page_load_time', 1250.0, 'ms', '/', 200, NULL, '2025-01-15 10:00:00', now());

-- Create indexes for better query performance
-- Note: ClickHouse uses different indexing strategies

-- Useful analytical queries for testing:

-- 1. Real-time dashboard metrics
-- SELECT 
--     toStartOfHour(timestamp) as hour,
--     count() as page_views,
--     uniq(session_id) as unique_sessions,
--     uniq(user_id) as unique_users
-- FROM page_views 
-- WHERE timestamp >= now() - INTERVAL 24 HOUR
-- GROUP BY hour
-- ORDER BY hour DESC;

-- 2. Game popularity analysis
-- SELECT 
--     game_title,
--     game_category,
--     count() as interactions,
--     uniq(session_id) as unique_sessions,
--     countIf(event_type = 'purchase') as purchases,
--     sum(total_amount) as revenue
-- FROM game_interactions gi
-- LEFT JOIN purchase_events pe ON gi.game_id = pe.game_id
-- WHERE gi.timestamp >= now() - INTERVAL 7 DAY
-- GROUP BY game_title, game_category
-- ORDER BY interactions DESC;

-- 3. User conversion funnel
-- SELECT 
--     funnel_step,
--     count() as step_count,
--     uniq(session_id) as unique_sessions
-- FROM purchase_events
-- WHERE purchase_timestamp >= now() - INTERVAL 7 DAY
-- GROUP BY funnel_step
-- ORDER BY step_count DESC;
