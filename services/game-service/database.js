const { Pool } = require('pg');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'lugx_gaming_db',
    user: process.env.DB_USER || 'lugx_admin',
    password: process.env.DB_PASSWORD || 'lugx_secure_password_2025',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool error handling
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Database connection test
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        console.log(`📊 Connected to: ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}`);
        client.release();
        return true;
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
        return false;
    }
};

// Generic query function with error handling
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`🔍 Query executed in ${duration}ms:`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        return res;
    } catch (err) {
        console.error('❌ Database query error:', err.message);
        console.error('📝 Query:', text);
        console.error('📋 Params:', params);
        throw err;
    }
};

// Transaction helper
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// Graceful shutdown
const closePool = async () => {
    try {
        await pool.end();
        console.log('📊 Database pool closed');
    } catch (err) {
        console.error('❌ Error closing database pool:', err.message);
    }
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection,
    closePool
};
