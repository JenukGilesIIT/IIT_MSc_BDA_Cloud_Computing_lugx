-- ClickHouse Analytics Database Schema
-- For real-time analytics and data warehousing

-- User activity events
CREATE TABLE user_events (
    timestamp DateTime,
    user_id UInt32,
    event_type String,
    page_url String,
    session_id String,
    ip_address String,
    user_agent String,
    metadata String
) ENGINE = MergeTree()
ORDER BY (timestamp, user_id)
TTL timestamp + INTERVAL 1 YEAR;

-- Game interaction events
CREATE TABLE game_events (
    timestamp DateTime,
    user_id UInt32,
    game_id UInt32,
    event_type String, -- 'view', 'click', 'purchase', 'download'
    metadata String
) ENGINE = MergeTree()
ORDER BY (timestamp, game_id, user_id)
TTL timestamp + INTERVAL 2 YEARS;

-- Purchase events
CREATE TABLE purchase_events (
    timestamp DateTime,
    user_id UInt32,
    order_id UInt32,
    game_id UInt32,
    amount Decimal(10,2),
    currency String,
    payment_method String,
    status String
) ENGINE = MergeTree()
ORDER BY (timestamp, user_id)
TTL timestamp + INTERVAL 7 YEARS;

-- Performance metrics
CREATE TABLE performance_metrics (
    timestamp DateTime,
    service_name String,
    endpoint String,
    response_time UInt32,
    status_code UInt16,
    error_message String
) ENGINE = MergeTree()
ORDER BY (timestamp, service_name)
TTL timestamp + INTERVAL 30 DAY;

-- Materialized views for real-time analytics

-- Daily active users
CREATE MATERIALIZED VIEW daily_active_users
ENGINE = SummingMergeTree()
ORDER BY (date, game_id)
AS SELECT
    toDate(timestamp) as date,
    game_id,
    uniqState(user_id) as unique_users
FROM game_events
WHERE event_type = 'view'
GROUP BY date, game_id;

-- Hourly sales summary
CREATE MATERIALIZED VIEW hourly_sales
ENGINE = SummingMergeTree()
ORDER BY (hour, game_id)
AS SELECT
    toStartOfHour(timestamp) as hour,
    game_id,
    sum(amount) as total_revenue,
    count() as total_orders
FROM purchase_events
WHERE status = 'completed'
GROUP BY hour, game_id;
