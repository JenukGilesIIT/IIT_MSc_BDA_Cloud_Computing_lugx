const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Sample analytics data - in production this would come from a database
let analyticsData = {
    userSessions: [
        {
            sessionId: uuidv4(),
            userId: 'user_001',
            startTime: new Date('2025-01-20T10:00:00Z'),
            endTime: new Date('2025-01-20T11:30:00Z'),
            duration: 5400, // seconds
            pagesViewed: ['home', 'shop', 'product-details'],
            gamesViewed: ['game_001', 'game_003'],
            device: 'desktop',
            browser: 'Chrome',
            location: 'Sri Lanka'
        },
        {
            sessionId: uuidv4(),
            userId: 'user_002',
            startTime: new Date('2025-01-20T14:00:00Z'),
            endTime: new Date('2025-01-20T14:45:00Z'),
            duration: 2700,
            pagesViewed: ['home', 'shop'],
            gamesViewed: ['game_002'],
            device: 'mobile',
            browser: 'Safari',
            location: 'India'
        },
        {
            sessionId: uuidv4(),
            userId: 'user_003',
            startTime: new Date('2025-01-20T16:00:00Z'),
            endTime: new Date('2025-01-20T17:15:00Z'),
            duration: 4500,
            pagesViewed: ['home', 'shop', 'product-details', 'contact'],
            gamesViewed: ['game_001', 'game_002', 'game_004'],
            device: 'tablet',
            browser: 'Firefox',
            location: 'Singapore'
        }
    ],
    gameAnalytics: [
        {
            gameId: 'game_001',
            name: 'Fortnite',
            views: 1250,
            purchases: 89,
            conversionRate: 7.12,
            revenue: 4450.00,
            averageSessionTime: 1800,
            popularityRank: 1,
            category: 'Battle Royale',
            lastUpdated: new Date()
        },
        {
            gameId: 'game_002',
            name: 'Assassin\'s Creed',
            views: 980,
            purchases: 67,
            conversionRate: 6.84,
            revenue: 4020.00,
            averageSessionTime: 2100,
            popularityRank: 2,
            category: 'Action',
            lastUpdated: new Date()
        },
        {
            gameId: 'game_003',
            name: 'Call of Duty',
            views: 1100,
            purchases: 72,
            conversionRate: 6.55,
            revenue: 3600.00,
            averageSessionTime: 1650,
            popularityRank: 3,
            category: 'FPS',
            lastUpdated: new Date()
        },
        {
            gameId: 'game_004',
            name: 'FIFA 23',
            views: 750,
            purchases: 45,
            conversionRate: 6.00,
            revenue: 2250.00,
            averageSessionTime: 1200,
            popularityRank: 4,
            category: 'Sports',
            lastUpdated: new Date()
        }
    ],
    salesAnalytics: {
        totalRevenue: 14320.00,
        totalOrders: 273,
        averageOrderValue: 52.45,
        conversionRate: 6.63,
        topSellingCategories: [
            { category: 'Battle Royale', sales: 89, revenue: 4450.00 },
            { category: 'Action', sales: 67, revenue: 4020.00 },
            { category: 'FPS', sales: 72, revenue: 3600.00 },
            { category: 'Sports', sales: 45, revenue: 2250.00 }
        ],
        dailyRevenue: [
            { date: '2025-01-15', revenue: 1200.00, orders: 24 },
            { date: '2025-01-16', revenue: 1450.00, orders: 29 },
            { date: '2025-01-17', revenue: 1680.00, orders: 32 },
            { date: '2025-01-18', revenue: 1890.00, orders: 38 },
            { date: '2025-01-19', revenue: 2100.00, orders: 42 },
            { date: '2025-01-20', revenue: 2300.00, orders: 46 },
            { date: '2025-01-21', revenue: 1950.00, orders: 39 }
        ]
    },
    userBehaviorAnalytics: {
        totalUsers: 1248,
        activeUsers: 892,
        newUsers: 156,
        returningUsers: 736,
        averageSessionDuration: 1650, // seconds
        bounceRate: 23.5, // percentage
        pageViews: 5670,
        mostViewedPages: [
            { page: 'home', views: 1890, percentage: 33.3 },
            { page: 'shop', views: 1567, percentage: 27.6 },
            { page: 'product-details', views: 1345, percentage: 23.7 },
            { page: 'contact', views: 868, percentage: 15.3 }
        ],
        deviceBreakdown: {
            desktop: { users: 561, percentage: 45.0 },
            mobile: { users: 437, percentage: 35.0 },
            tablet: { users: 250, percentage: 20.0 }
        },
        browserBreakdown: {
            Chrome: { users: 674, percentage: 54.0 },
            Safari: { users: 312, percentage: 25.0 },
            Firefox: { users: 187, percentage: 15.0 },
            Edge: { users: 75, percentage: 6.0 }
        }
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'analytics-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Analytics API Routes

// Health check endpoint for analytics API
app.get('/api/analytics/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'analytics-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// 1. Get overall analytics dashboard
app.get('/api/analytics/dashboard', (req, res) => {
    try {
        const dashboard = {
            summary: {
                totalRevenue: analyticsData.salesAnalytics.totalRevenue,
                totalOrders: analyticsData.salesAnalytics.totalOrders,
                totalUsers: analyticsData.userBehaviorAnalytics.totalUsers,
                activeUsers: analyticsData.userBehaviorAnalytics.activeUsers,
                conversionRate: analyticsData.salesAnalytics.conversionRate,
                averageOrderValue: analyticsData.salesAnalytics.averageOrderValue
            },
            topGames: analyticsData.gameAnalytics.slice(0, 3),
            recentRevenue: analyticsData.salesAnalytics.dailyRevenue.slice(-7),
            userGrowth: {
                newUsers: analyticsData.userBehaviorAnalytics.newUsers,
                returningUsers: analyticsData.userBehaviorAnalytics.returningUsers,
                growthRate: '+12.5%' // calculated metric
            }
        };

        res.json({
            success: true,
            data: dashboard,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard analytics',
            message: error.message
        });
    }
});

// 2. Get game performance analytics
app.get('/api/analytics/games', (req, res) => {
    try {
        const { category, sortBy = 'popularity', limit = 10 } = req.query;
        
        let games = [...analyticsData.gameAnalytics];
        
        // Filter by category if specified
        if (category) {
            games = games.filter(game => 
                game.category.toLowerCase() === category.toLowerCase()
            );
        }
        
        // Sort games
        switch (sortBy) {
            case 'revenue':
                games.sort((a, b) => b.revenue - a.revenue);
                break;
            case 'views':
                games.sort((a, b) => b.views - a.views);
                break;
            case 'conversion':
                games.sort((a, b) => b.conversionRate - a.conversionRate);
                break;
            default: // popularity
                games.sort((a, b) => a.popularityRank - b.popularityRank);
        }
        
        // Limit results
        games = games.slice(0, parseInt(limit));
        
        res.json({
            success: true,
            data: {
                games,
                totalGames: analyticsData.gameAnalytics.length,
                filters: { category, sortBy, limit }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game analytics',
            message: error.message
        });
    }
});

// 3. Get individual game analytics
app.get('/api/analytics/games/:gameId', (req, res) => {
    try {
        const { gameId } = req.params;
        const game = analyticsData.gameAnalytics.find(g => g.gameId === gameId);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found',
                gameId
            });
        }
        
        // Calculate additional metrics
        const enhancedGame = {
            ...game,
            metrics: {
                viewsToday: Math.floor(game.views * 0.08), // 8% of total views today
                purchasesToday: Math.floor(game.purchases * 0.05), // 5% of purchases today
                revenueToday: game.revenue * 0.05,
                averageViewTime: game.averageSessionTime,
                popularityTrend: game.popularityRank <= 3 ? 'trending_up' : 'stable'
            }
        };
        
        res.json({
            success: true,
            data: enhancedGame,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game analytics',
            message: error.message
        });
    }
});

// 4. Get sales analytics and reports
app.get('/api/analytics/sales', (req, res) => {
    try {
        const { period = 'week', category } = req.query;
        
        let salesData = { ...analyticsData.salesAnalytics };
        
        // Filter by category if specified
        if (category) {
            const categoryData = salesData.topSellingCategories.find(cat => 
                cat.category.toLowerCase() === category.toLowerCase()
            );
            
            if (categoryData) {
                salesData = {
                    ...salesData,
                    filteredByCategory: category,
                    categoryRevenue: categoryData.revenue,
                    categorySales: categoryData.sales
                };
            }
        }
        
        // Add period-specific data
        if (period === 'week') {
            salesData.periodData = salesData.dailyRevenue.slice(-7);
        } else if (period === 'month') {
            salesData.periodData = salesData.dailyRevenue; // All available data
        }
        
        res.json({
            success: true,
            data: salesData,
            filters: { period, category },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sales analytics',
            message: error.message
        });
    }
});

// 5. Get user behavior analytics
app.get('/api/analytics/users', (req, res) => {
    try {
        const { metric = 'all' } = req.query;
        
        let userData = { ...analyticsData.userBehaviorAnalytics };
        
        // Filter by specific metric if requested
        if (metric !== 'all') {
            switch (metric) {
                case 'sessions':
                    userData = {
                        totalUsers: userData.totalUsers,
                        activeUsers: userData.activeUsers,
                        averageSessionDuration: userData.averageSessionDuration,
                        sessions: analyticsData.userSessions
                    };
                    break;
                case 'devices':
                    userData = {
                        deviceBreakdown: userData.deviceBreakdown,
                        browserBreakdown: userData.browserBreakdown
                    };
                    break;
                case 'pages':
                    userData = {
                        pageViews: userData.pageViews,
                        mostViewedPages: userData.mostViewedPages,
                        bounceRate: userData.bounceRate
                    };
                    break;
            }
        }
        
        res.json({
            success: true,
            data: userData,
            filters: { metric },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user analytics',
            message: error.message
        });
    }
});

// 6. Get real-time analytics
app.get('/api/analytics/realtime', (req, res) => {
    try {
        const currentTime = new Date();
        const realTimeData = {
            activeUsersNow: Math.floor(Math.random() * 150) + 50, // 50-200 active users
            currentSessions: Math.floor(Math.random() * 80) + 30, // 30-110 sessions
            liveOrders: Math.floor(Math.random() * 5) + 1, // 1-6 live orders
            revenueToday: analyticsData.salesAnalytics.dailyRevenue[analyticsData.salesAnalytics.dailyRevenue.length - 1]?.revenue || 0,
            topGameNow: analyticsData.gameAnalytics[0], // Most popular game
            recentActivity: [
                {
                    type: 'purchase',
                    gameId: 'game_001',
                    gameName: 'Fortnite',
                    amount: 50.00,
                    timestamp: new Date(currentTime.getTime() - 2 * 60 * 1000)
                },
                {
                    type: 'view',
                    gameId: 'game_002',
                    gameName: 'Assassin\'s Creed',
                    timestamp: new Date(currentTime.getTime() - 5 * 60 * 1000)
                },
                {
                    type: 'session_start',
                    userId: 'user_' + Math.floor(Math.random() * 1000),
                    device: 'mobile',
                    timestamp: new Date(currentTime.getTime() - 8 * 60 * 1000)
                }
            ],
            serverMetrics: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: '12.5%', // simulated
                responseTime: '145ms' // simulated
            }
        };
        
        res.json({
            success: true,
            data: realTimeData,
            timestamp: currentTime.toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch real-time analytics',
            message: error.message
        });
    }
});

// 7. Create custom analytics report
app.post('/api/analytics/reports', (req, res) => {
    try {
        const { 
            reportName, 
            metrics = [], 
            dateRange = {}, 
            filters = {} 
        } = req.body;
        
        if (!reportName || metrics.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Report name and metrics are required'
            });
        }
        
        const reportId = uuidv4();
        const report = {
            reportId,
            name: reportName,
            metrics,
            dateRange,
            filters,
            status: 'generated',
            createdAt: new Date(),
            data: {
                // Generate sample report data based on requested metrics
                summary: metrics.includes('sales') ? analyticsData.salesAnalytics : null,
                games: metrics.includes('games') ? analyticsData.gameAnalytics : null,
                users: metrics.includes('users') ? analyticsData.userBehaviorAnalytics : null
            }
        };
        
        res.status(201).json({
            success: true,
            message: 'Custom report generated successfully',
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate custom report',
            message: error.message
        });
    }
});

// 8. Track user event (for real-time analytics)
// Handle GET requests to /api/analytics/events (return info instead of error)
app.get('/api/analytics/events', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Analytics events endpoint',
        info: 'Use POST method to track events',
        usage: 'POST /api/analytics/events with JSON body containing eventType, userId, gameId, sessionId, metadata'
    });
});

app.post('/api/analytics/events', (req, res) => {
    try {
        const { 
            eventType, 
            userId, 
            gameId, 
            sessionId, 
            metadata = {} 
        } = req.body;
        
        if (!eventType) {
            return res.status(400).json({
                success: false,
                error: 'Event type is required'
            });
        }
        
        const event = {
            eventId: uuidv4(),
            eventType,
            userId,
            gameId,
            sessionId,
            metadata,
            timestamp: new Date(),
            processed: true
        };
        
        // In a real application, this would be stored in a database
        // and processed for analytics
        
        res.status(201).json({
            success: true,
            message: 'Event tracked successfully',
            data: { eventId: event.eventId }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to track event',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
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

// Start server
app.listen(PORT, () => {
    console.log(`Analytics Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log('Available endpoints:');
    console.log('  GET  /api/analytics/dashboard      - Overall analytics dashboard');
    console.log('  GET  /api/analytics/games          - Game performance analytics');
    console.log('  GET  /api/analytics/games/:id      - Individual game analytics');
    console.log('  GET  /api/analytics/sales          - Sales analytics and reports');
    console.log('  GET  /api/analytics/users          - User behavior analytics');
    console.log('  GET  /api/analytics/realtime       - Real-time analytics');
    console.log('  POST /api/analytics/reports        - Generate custom reports');
    console.log('  POST /api/analytics/events         - Track user events');
});

module.exports = app;
