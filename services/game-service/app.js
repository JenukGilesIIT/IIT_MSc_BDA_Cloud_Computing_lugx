const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const { query, testConnection, closePool } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Initialize database connection
let dbConnected = false;

const initializeDatabase = async () => {
    try {
        dbConnected = await testConnection();
        if (dbConnected) {
            console.log('🎮 Game Service: Database ready');
        } else {
            console.log('⚠️  Game Service: Running without database connection');
        }
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        dbConnected = false;
    }
};

// Health check endpoint
app.get('/health', async (req, res) => {
    const healthStatus = {
        status: 'healthy',
        service: 'game-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        database: dbConnected ? 'connected' : 'disconnected'
    };

    if (dbConnected) {
        try {
            const result = await query('SELECT COUNT(*) as game_count FROM games');
            healthStatus.database_stats = {
                total_games: parseInt(result.rows[0].game_count),
                connection_status: 'active'
            };
        } catch (error) {
            healthStatus.database_stats = {
                connection_status: 'error',
                error: error.message
            };
        }
    }

    res.status(200).json(healthStatus);
});

// Game API Routes

// 1. Get all games with filtering and pagination
app.get('/api/games', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            minPrice,
            maxPrice,
            featured,
            trending,
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Build WHERE conditions
        if (category) {
            whereConditions.push(`category ILIKE $${paramIndex}`);
            queryParams.push(`%${category}%`);
            paramIndex++;
        }

        if (minPrice) {
            whereConditions.push(`price >= $${paramIndex}`);
            queryParams.push(parseFloat(minPrice));
            paramIndex++;
        }

        if (maxPrice) {
            whereConditions.push(`price <= $${paramIndex}`);
            queryParams.push(parseFloat(maxPrice));
            paramIndex++;
        }

        if (featured === 'true') {
            whereConditions.push(`is_featured = true`);
        }

        if (trending === 'true') {
            whereConditions.push(`is_trending = true`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Validate sort column
        const validSortColumns = ['name', 'price', 'rating', 'release_date', 'created_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
        const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Main query
        const gamesQuery = `
            SELECT 
                game_id, name, description, price, discount_price, category, 
                tags, image_url, release_date, rating, is_featured, is_trending,
                stock_quantity, developer, publisher, platform, created_at
            FROM games 
            ${whereClause}
            ORDER BY ${sortColumn} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), offset);

        // Count query for pagination
        const countQuery = `SELECT COUNT(*) as total FROM games ${whereClause}`;
        const countParams = queryParams.slice(0, -2); // Remove limit and offset

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const [gamesResult, countResult] = await Promise.all([
            query(gamesQuery, queryParams),
            query(countQuery, countParams)
        ]);

        const totalGames = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalGames / limit);

        res.json({
            success: true,
            data: {
                games: gamesResult.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: totalGames,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                },
                filters: { category, minPrice, maxPrice, featured, trending, sortBy, sortOrder }
            }
        });

    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch games',
            message: error.message
        });
    }
});

// 2. Search games
app.get('/api/games/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query parameter "q" is required'
            });
        }

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const searchQuery = `
            SELECT 
                game_id, name, description, price, discount_price, category,
                image_url, rating, is_featured, developer, publisher
            FROM games
            WHERE 
                to_tsvector('english', name || ' ' || description || ' ' || array_to_string(tags, ' ')) 
                @@ plainto_tsquery('english', $1)
                OR name ILIKE $2
                OR description ILIKE $2
                OR category ILIKE $2
            ORDER BY 
                CASE WHEN name ILIKE $2 THEN 1 ELSE 2 END,
                rating DESC
            LIMIT $3
        `;

        const result = await query(searchQuery, [q, `%${q}%`, parseInt(limit)]);

        res.json({
            success: true,
            data: {
                games: result.rows,
                searchTerm: q,
                resultCount: result.rows.length
            }
        });

    } catch (error) {
        console.error('Error searching games:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search games',
            message: error.message
        });
    }
});

// 3. Get featured games
app.get('/api/games/featured', async (req, res) => {
    try {
        const { limit = 4 } = req.query;

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const featuredQuery = `
            SELECT 
                game_id, name, description, price, discount_price, 
                category, image_url, rating, developer, publisher
            FROM games
            WHERE is_featured = true
            ORDER BY rating DESC, created_at DESC
            LIMIT $1
        `;

        const result = await query(featuredQuery, [parseInt(limit)]);

        res.json({
            success: true,
            data: {
                games: result.rows,
                featured: true
            }
        });

    } catch (error) {
        console.error('Error fetching featured games:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured games',
            message: error.message
        });
    }
});

// 4. Get trending games
app.get('/api/games/trending', async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const trendingQuery = `
            SELECT 
                g.game_id, g.name, g.description, g.price, g.discount_price,
                g.category, g.image_url, g.rating, g.developer, g.publisher,
                COALESCE(gs.total_sold, 0) as total_sold
            FROM games g
            LEFT JOIN game_stats gs ON g.game_id = gs.game_id
            WHERE g.is_trending = true
            ORDER BY gs.total_sold DESC NULLS LAST, g.rating DESC
            LIMIT $1
        `;

        const result = await query(trendingQuery, [parseInt(limit)]);

        res.json({
            success: true,
            data: {
                games: result.rows,
                trending: true
            }
        });

    } catch (error) {
        console.error('Error fetching trending games:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trending games',
            message: error.message
        });
    }
});

// 5. Get games by category
app.get('/api/games/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 10, page = 1 } = req.query;
        const offset = (page - 1) * limit;

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const categoryQuery = `
            SELECT 
                game_id, name, description, price, discount_price,
                category, image_url, rating, is_featured, developer, publisher
            FROM games
            WHERE category ILIKE $1
            ORDER BY rating DESC, name ASC
            LIMIT $2 OFFSET $3
        `;

        const countQuery = `
            SELECT COUNT(*) as total FROM games WHERE category ILIKE $1
        `;

        const [gamesResult, countResult] = await Promise.all([
            query(categoryQuery, [`%${category}%`, parseInt(limit), offset]),
            query(countQuery, [`%${category}%`])
        ]);

        const totalGames = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                games: gamesResult.rows,
                category,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalGames / limit),
                    totalItems: totalGames,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching games by category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch games by category',
            message: error.message
        });
    }
});

// 6. Get game statistics
app.get('/api/games/stats/summary', async (req, res) => {
    try {
        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const statsQuery = `
            SELECT 
                COUNT(*) as total_games,
                COUNT(CASE WHEN is_featured THEN 1 END) as featured_games,
                COUNT(CASE WHEN is_trending THEN 1 END) as trending_games,
                ROUND(AVG(price), 2) as average_price,
                COUNT(DISTINCT category) as total_categories,
                ROUND(AVG(rating), 2) as average_rating
            FROM games
        `;

        const categoryStatsQuery = `
            SELECT 
                category,
                COUNT(*) as game_count,
                ROUND(AVG(price), 2) as avg_price,
                ROUND(AVG(rating), 2) as avg_rating
            FROM games
            GROUP BY category
            ORDER BY game_count DESC
        `;

        const [statsResult, categoryResult] = await Promise.all([
            query(statsQuery),
            query(categoryStatsQuery)
        ]);

        res.json({
            success: true,
            data: {
                overall: statsResult.rows[0],
                by_category: categoryResult.rows
            }
        });

    } catch (error) {
        console.error('Error fetching game statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game statistics',
            message: error.message
        });
    }
});

// 8. Get game by ID (MUST be last among /api/games routes)
app.get('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const gameQuery = `
            SELECT 
                g.*, 
                ROUND(AVG(r.rating), 2) as average_rating,
                COUNT(r.id) as review_count
            FROM games g
            LEFT JOIN game_reviews r ON g.game_id = r.game_id
            WHERE g.game_id = $1 OR g.id = $2
            GROUP BY g.id
        `;

        const result = await query(gameQuery, [id, parseInt(id) || 0]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Game not found',
                gameId: id
            });
        }

        // Get recent reviews for this game
        const reviewsQuery = `
            SELECT r.*, c.first_name, c.last_name 
            FROM game_reviews r
            LEFT JOIN customers c ON r.user_id = c.customer_id
            WHERE r.game_id = $1
            ORDER BY r.created_at DESC
            LIMIT 5
        `;

        const reviewsResult = await query(reviewsQuery, [result.rows[0].game_id]);

        const gameData = {
            ...result.rows[0],
            reviews: reviewsResult.rows
        };

        res.json({
            success: true,
            data: gameData
        });

    } catch (error) {
        console.error('Error fetching game:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game',
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

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    await closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    await closePool();
    process.exit(0);
});

// Start server
const startServer = async () => {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`🎮 Game Service running on port ${PORT}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        console.log(`📊 Database status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
        console.log('Available endpoints:');
        console.log('  GET  /api/games                    - Get all games with filtering');
        console.log('  GET  /api/games/:id                - Get specific game');
        console.log('  GET  /api/games/search?q=query     - Search games');
        console.log('  GET  /api/games/featured           - Get featured games');
        console.log('  GET  /api/games/trending           - Get trending games');
        console.log('  GET  /api/games/category/:category - Get games by category');
        console.log('  GET  /api/games/stats/summary      - Get game statistics');
    });
};

startServer().catch(console.error);

module.exports = app;
