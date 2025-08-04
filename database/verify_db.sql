-- Database verification and setup script
-- Run this if the schema wasn't properly initialized

-- Check if we're connected to the right database
SELECT current_database();

-- Check if tables exist
SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';

-- If no tables exist, we need to run the full schema
-- Check if games table exists specifically
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'games'
);

-- If games table exists, check if it has data
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'games') 
        THEN (SELECT COUNT(*) FROM games)::text || ' games found'
        ELSE 'Games table does not exist'
    END as status;

-- Quick data verification
SELECT 
    'Total tables: ' || COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public';

-- If everything looks empty, run this to see what went wrong:
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_catalog.pg_tables 
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
ORDER BY schemaname, tablename;
