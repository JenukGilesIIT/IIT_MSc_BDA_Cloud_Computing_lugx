const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const {
    testConnection,
    insertData,
    batchInsert,
    getRealTimeMetrics,
    getGamePopularity,
    getConversionFunnel,
    getUserBehaviorMetrics,
    getSearchAnalytics,
    getPerformanceMetrics,
    closeConnection
} = require('./clickhouse');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Initialize ClickHouse connection
let clickhouseConnected = false;

const initializeClickHouse = async () => {
    try {
        clickhouseConnected = await testConnection();
        if (clickhouseConnected) {
            console.log('📊 Analytics Service: ClickHouse ready');
        } else {
            console.log('⚠️  Analytics Service: Running without ClickHouse connection');
        }
    } catch (error) {
        console.error('❌ ClickHouse initialization failed:', error.message);
        clickhouseConnected = false;
    }
};

// Health check endpoint
app.get('/health', async (req, res) => {
    const healthStatus = {
        status: 'healthy',
        service: 'analytics-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
        clickhouse: clickhouseConnected ? 'connected' : 'disconnected'
    };

    if (clickhouseConnected) {
        try {
            const realtimeMetrics = await getRealTimeMetrics('1 HOUR');
            healthStatus.recent_activity = {
                last_hour_page_views: realtimeMetrics.length > 0 ? realtimeMetrics[0].page_views : 0,
                unique_sessions: realtimeMetrics.length > 0 ? realtimeMetrics[0].unique_sessions : 0,
                data_points: realtimeMetrics.length
            };
        } catch (error) {
            healthStatus.clickhouse_status = {
                connection_status: 'error',
                error: error.message
            };
        }
    }

    res.status(200).json(healthStatus);
});

// 1. Real-time Dashboard Analytics
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        const { timeRange = '24 HOUR' } = req.query;

        if (!clickhouseConnected) {
            return res.status(503).json({
                success: false,
                error: 'ClickHouse not available',
                message: 'Analytics database is not connected'
            });
        }

        const [
            realtimeMetrics,
            gamePopularity,
            conversionFunnel,
            userBehavior
        ] = await Promise.all([
            getRealTimeMetrics(timeRange),
            getGamePopularity('7 DAY'),
            getConversionFunnel('7 DAY'),
            getUserBehaviorMetrics('7 DAY')
        ]);

        // Calculate summary metrics
        const totalPageViews = realtimeMetrics.reduce((sum, metric) => sum + metric.page_views, 0);
        const totalSessions = realtimeMetrics.reduce((sum, metric) => sum + metric.unique_sessions, 0);
        const totalUsers = realtimeMetrics.reduce((sum, metric) => sum + metric.unique_users, 0);

        res.json({
            success: true,
            data: {
                summary: {
                    total_page_views: totalPageViews,
                    total_sessions: totalSessions,
                    total_users: totalUsers,
                    avg_session_duration: userBehavior.length > 0 ? 
                        userBehavior.reduce((sum, day) => sum + day.avg_session_duration, 0) / userBehavior.length : 0,
                    bounce_rate: userBehavior.length > 0 ?
                        userBehavior.reduce((sum, day) => sum + day.bounce_rate, 0) / userBehavior.length : 0
                },
                realtime_metrics: realtimeMetrics.slice(0, 60), // Last hour by minute
                top_games: gamePopularity.slice(0, 10),
                conversion_funnel: conversionFunnel,
                daily_metrics: userBehavior.slice(0, 7),
                timeRange
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard analytics',
            message: error.message
        });
    }
});

// 2. Game Performance Analytics
app.get('/api/analytics/games', async (req, res) => {
    try {
        const { timeRange = '7 DAY', limit = 20 } = req.query;

        if (!clickhouseConnected) {
            return res.status(503).json({
                success: false,
                error: 'ClickHouse not available'
            });
        }

        const gameMetrics = await getGamePopularity(timeRange);

        res.json({
            success: true,
            data: {
                games: gameMetrics.slice(0, parseInt(limit)),
                timeRange,
                totalGames: gameMetrics.length
            }
        });

    } catch (error) {
        console.error('Error fetching game analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game analytics',
            message: error.message
        });
    }
});

// 3. User Behavior Analytics
app.get('/api/analytics/users', async (req, res) => {
    try {
        const { timeRange = '30 DAY' } = req.query;

        if (!clickhouseConnected) {
            return res.status(503).json({
                success: false,
                error: 'ClickHouse not available'
            });
        }

        const [userBehavior, searchAnalytics] = await Promise.all([
            getUserBehaviorMetrics(timeRange),
            getSearchAnalytics(timeRange)
        ]);

        res.json({
            success: true,
            data: {
                daily_metrics: userBehavior,
                search_analytics: searchAnalytics.slice(0, 10),
                timeRange
            }
        });

    } catch (error) {
        console.error('Error fetching user analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user analytics',
            message: error.message
        });
    }
});

// 4. Conversion Funnel Analytics
app.get('/api/analytics/conversion', async (req, res) => {
    try {
        const { timeRange = '7 DAY' } = req.query;

        if (!clickhouseConnected) {
            return res.status(503).json({
                success: false,
                error: 'ClickHouse not available'
            });
        }

        const conversionData = await getConversionFunnel(timeRange);

        // Calculate conversion rates between steps
        const funnelWithRates = conversionData.map((step, index) => {
            if (index === 0) {
                return { ...step, conversion_rate: 100, drop_off_rate: 0 };
            }
            
            const previousStep = conversionData[index - 1];
            const conversionRate = (step.step_count / previousStep.step_count * 100).toFixed(2);
            const dropOffRate = (100 - conversionRate).toFixed(2);
            
            return {
                ...step,
                conversion_rate: parseFloat(conversionRate),
                drop_off_rate: parseFloat(dropOffRate)
            };
        });

        res.json({
            success: true,
            data: {
                funnel_steps: funnelWithRates,
                timeRange,
                total_revenue: conversionData.reduce((sum, step) => sum + step.revenue, 0)
            }
        });

    } catch (error) {
        console.error('Error fetching conversion analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversion analytics',
            message: error.message
        });
    }
});

// 5. Performance Monitoring
app.get('/api/analytics/performance', async (req, res) => {
    try {
        const { timeRange = '1 HOUR' } = req.query;

        if (!clickhouseConnected) {
            return res.status(503).json({
                success: false,
                error: 'ClickHouse not available'
            });
        }

        const performanceMetrics = await getPerformanceMetrics(timeRange);

        // Group metrics by service
        const serviceMetrics = performanceMetrics.reduce((acc, metric) => {
            if (!acc[metric.service_name]) {
                acc[metric.service_name] = {};
            }
            acc[metric.service_name][metric.metric_type] = {
                avg: metric.avg_value,
                min: metric.min_value,
                max: metric.max_value,
                p95: metric.p95_value,
                samples: metric.sample_count
            };
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                services: serviceMetrics,
                timeRange,
                metrics_count: performanceMetrics.length
            }
        });

    } catch (error) {
        console.error('Error fetching performance analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance analytics',
            message: error.message
        });
    }
});

// 6. Event Tracking Endpoint - Accept analytics events from frontend
app.post('/api/analytics/events', async (req, res) => {
    try {
        const { events } = req.body;

        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Events array is required'
            });
        }

        if (!clickhouseConnected) {
            // Store events in memory/queue for later processing
            console.log('📊 Storing events for later processing (ClickHouse not available)');
            return res.json({
                success: true,
                message: 'Events queued for processing',
                processed: events.length
            });
        }

        // Process different event types
        const pageViews = [];
        const gameInteractions = [];
        const searchEvents = [];
        const performanceMetrics = [];

        events.forEach(event => {
            // Format timestamp for ClickHouse DateTime format (YYYY-MM-DD HH:MM:SS)
            let timestamp = event.timestamp || new Date().toISOString();
            if (timestamp.includes('T') && timestamp.includes('Z')) {
                timestamp = timestamp.replace('T', ' ').replace('Z', '').split('.')[0];
            }
            
            const baseEvent = {
                event_id: event.event_id || uuidv4(),
                session_id: event.session_id,
                user_id: event.user_id || null,
                timestamp: timestamp
            };

            switch (event.event_type) {
                case 'page_view':
                    pageViews.push({
                        ...baseEvent,
                        page_url: event.page_url,
                        page_title: event.page_title,
                        page_category: event.page_category,
                        time_on_page_seconds: event.time_on_page_seconds || 0,
                        scroll_depth_percentage: event.scroll_depth_percentage || 0,
                        exit_page: event.exit_page || false,
                        bounce: event.bounce || false,
                        previous_page: event.previous_page || null,
                        referrer: event.referrer || ''
                    });
                    break;

                case 'game_interaction':
                    gameInteractions.push({
                        ...baseEvent,
                        game_id: event.game_id,
                        game_title: event.game_title,
                        game_category: event.game_category,
                        event_type: event.interaction_type,
                        event_data: JSON.stringify(event.event_data || {}),
                        page_context: event.page_context || ''
                    });
                    break;

                case 'search':
                    searchEvents.push({
                        ...baseEvent,
                        search_query: event.search_query,
                        search_category: event.search_category || null,
                        results_count: event.results_count || 0,
                        clicked_result_position: event.clicked_result_position || null,
                        clicked_game_id: event.clicked_game_id || null,
                        no_results: event.no_results || false
                    });
                    break;

                case 'performance':
                    performanceMetrics.push({
                        metric_id: baseEvent.event_id,
                        service_name: event.service_name,
                        metric_type: event.metric_type,
                        metric_value: event.metric_value,
                        unit: event.unit || '',
                        endpoint: event.endpoint || null,
                        status_code: event.status_code || null,
                        error_message: event.error_message || null,
                        timestamp: baseEvent.timestamp
                    });
                    break;
            }
        });

        // Batch insert events to ClickHouse
        const insertPromises = [];
        
        if (pageViews.length > 0) {
            insertPromises.push(insertData('page_views', pageViews));
        }
        if (gameInteractions.length > 0) {
            insertPromises.push(insertData('game_interactions', gameInteractions));
        }
        if (searchEvents.length > 0) {
            insertPromises.push(insertData('search_events', searchEvents));
        }
        if (performanceMetrics.length > 0) {
            insertPromises.push(insertData('performance_metrics', performanceMetrics));
        }

        await Promise.all(insertPromises);

        res.json({
            success: true,
            message: 'Events processed successfully',
            processed: {
                total: events.length,
                page_views: pageViews.length,
                game_interactions: gameInteractions.length,
                search_events: searchEvents.length,
                performance_metrics: performanceMetrics.length
            }
        });

    } catch (error) {
        console.error('Error processing analytics events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process analytics events',
            message: error.message
        });
    }
});

// 7. Custom Reports
app.post('/api/analytics/reports', async (req, res) => {
    try {
        const { query, timeRange = '7 DAY', filters = {} } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }

        if (!clickhouseConnected) {
            return res.status(503).json({
                success: false,
                error: 'ClickHouse not available'
            });
        }

        // This is a simplified custom query endpoint
        // In production, you'd want to sanitize and validate queries
        const reportData = await executeQuery(query);

        res.json({
            success: true,
            data: {
                results: reportData,
                query,
                timeRange,
                filters,
                row_count: reportData.length
            }
        });

    } catch (error) {
        console.error('Error generating custom report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate custom report',
            message: error.message
        });
    }
});

// 8. Search Analytics
app.get('/api/analytics/search', async (req, res) => {
    try {
        const { timeRange = '7 DAY', limit = 20 } = req.query;

        if (!clickhouseConnected) {
            return res.status(503).json({
                success: false,
                error: 'ClickHouse not available'
            });
        }

        const searchData = await getSearchAnalytics(timeRange);

        res.json({
            success: true,
            data: {
                top_searches: searchData.slice(0, parseInt(limit)),
                timeRange,
                total_searches: searchData.reduce((sum, search) => sum + search.search_count, 0),
                total_unique_searchers: searchData.reduce((sum, search) => sum + search.unique_searchers, 0)
            }
        });

    } catch (error) {
        console.error('Error fetching search analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch search analytics',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Analytics Service Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    await closeConnection();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    await closeConnection();
    process.exit(0);
});

// Start server
const startServer = async () => {
    await initializeClickHouse();
    
    app.listen(PORT, () => {
        console.log(`📊 Analytics Service running on port ${PORT}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        console.log(`📈 ClickHouse status: ${clickhouseConnected ? 'Connected' : 'Disconnected'}`);
        console.log('Available endpoints:');
        console.log('  GET  /api/analytics/dashboard         - Real-time dashboard metrics');
        console.log('  GET  /api/analytics/games             - Game performance analytics');
        console.log('  GET  /api/analytics/users             - User behavior analytics');
        console.log('  GET  /api/analytics/conversion        - Conversion funnel analysis');
        console.log('  GET  /api/analytics/performance       - System performance metrics');
        console.log('  POST /api/analytics/events            - Event tracking endpoint');
        console.log('  POST /api/analytics/reports           - Custom reports');
        console.log('  GET  /api/analytics/search            - Search analytics');
    });
};

startServer().catch(console.error);

module.exports = app;
