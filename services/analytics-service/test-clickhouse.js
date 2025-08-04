const { testConnection } = require('./clickhouse');

console.log('Testing ClickHouse connection...');

testConnection().then(success => {
    if (success) {
        console.log('✅ ClickHouse Connection: SUCCESS');
        console.log('Analytics Service is ready to connect to ClickHouse');
    } else {
        console.log('❌ ClickHouse Connection: FAILED');
        console.log('Make sure ClickHouse is running with: docker-compose -f clickhouse-compose.yml up -d');
    }
    process.exit(0);
}).catch(err => {
    console.log('❌ Error testing ClickHouse connection:', err.message);
    console.log('Possible issues:');
    console.log('1. ClickHouse is not running');
    console.log('2. Wrong connection settings in .env file');
    console.log('3. Missing @clickhouse/client dependency');
    process.exit(1);
});
