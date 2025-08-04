-- Clean database reset script
-- This will drop all tables and recreate them properly

-- Drop tables in correct order (reverse dependency order)
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS game_reviews CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS game_categories CASCADE;

-- Drop views
DROP VIEW IF EXISTS game_stats CASCADE;
DROP VIEW IF EXISTS customer_order_summary CASCADE;
DROP VIEW IF EXISTS order_details CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS create_order_status_history() CASCADE;

-- Confirmation message
SELECT 'Database cleaned successfully' as status;
