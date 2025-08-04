const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { query, transaction, testConnection, closePool } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

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
            console.log('🛒 Order Service: Database ready');
        } else {
            console.log('⚠️  Order Service: Running without database connection');
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
        service: 'order-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        database: dbConnected ? 'connected' : 'disconnected'
    };

    if (dbConnected) {
        try {
            const orderCount = await query('SELECT COUNT(*) as order_count FROM orders');
            const customerCount = await query('SELECT COUNT(*) as customer_count FROM customers');
            
            healthStatus.database_stats = {
                total_orders: parseInt(orderCount.rows[0].order_count),
                total_customers: parseInt(customerCount.rows[0].customer_count),
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

// Order API Routes

// 1. Get all orders with filtering and pagination
app.get('/api/orders', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            customerId,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Build WHERE conditions
        if (status) {
            whereConditions.push(`o.order_status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (customerId) {
            whereConditions.push(`o.customer_id = $${paramIndex}`);
            queryParams.push(customerId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Validate sort column
        const validSortColumns = ['created_at', 'total_amount', 'order_status'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        // Main query with customer details
        const ordersQuery = `
            SELECT 
                o.order_id, o.customer_id, o.order_status, o.total_amount,
                o.subtotal, o.tax_amount, o.shipping_cost, o.discount_amount,
                o.payment_method, o.payment_status, o.order_notes,
                o.estimated_delivery, o.actual_delivery, o.tracking_number,
                o.created_at, o.updated_at,
                c.first_name, c.last_name, c.email, c.phone
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            ${whereClause}
            ORDER BY o.${sortColumn} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), offset);

        // Count query for pagination
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM orders o 
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            ${whereClause}
        `;
        const countParams = queryParams.slice(0, -2); // Remove limit and offset

        const [ordersResult, countResult] = await Promise.all([
            query(ordersQuery, queryParams),
            query(countQuery, countParams)
        ]);

        const totalOrders = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalOrders / limit);

        res.json({
            success: true,
            data: {
                orders: ordersResult.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: totalOrders,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                },
                filters: { status, customerId, sortBy, sortOrder }
            }
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders',
            message: error.message
        });
    }
});

// 2. Get order by ID with full details
app.get('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        // Get order with customer details
        const orderQuery = `
            SELECT 
                o.*,
                c.first_name, c.last_name, c.email, c.phone, c.date_of_birth,
                ca_ship.address_line_1 as ship_address_line_1,
                ca_ship.address_line_2 as ship_address_line_2,
                ca_ship.city as ship_city,
                ca_ship.state_province as ship_state,
                ca_ship.postal_code as ship_postal_code,
                ca_ship.country as ship_country,
                ca_bill.address_line_1 as bill_address_line_1,
                ca_bill.city as bill_city,
                ca_bill.state_province as bill_state,
                ca_bill.postal_code as bill_postal_code,
                ca_bill.country as bill_country
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN customer_addresses ca_ship ON o.shipping_address_id = ca_ship.address_id
            LEFT JOIN customer_addresses ca_bill ON o.billing_address_id = ca_bill.address_id
            WHERE o.order_id = $1 OR o.id = $2
        `;

        const orderResult = await query(orderQuery, [id, parseInt(id) || 0]);

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found',
                orderId: id
            });
        }

        // Get order items
        const itemsQuery = `
            SELECT * FROM order_items 
            WHERE order_id = $1
            ORDER BY created_at ASC
        `;

        const itemsResult = await query(itemsQuery, [orderResult.rows[0].order_id]);

        // Get order status history
        const historyQuery = `
            SELECT * FROM order_status_history 
            WHERE order_id = $1
            ORDER BY created_at ASC
        `;

        const historyResult = await query(historyQuery, [orderResult.rows[0].order_id]);

        const orderData = {
            ...orderResult.rows[0],
            items: itemsResult.rows,
            status_history: historyResult.rows
        };

        res.json({
            success: true,
            data: orderData
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order',
            message: error.message
        });
    }
});

// 3. Create new order
app.post('/api/orders', async (req, res) => {
    try {
        const {
            customer_id,
            items,
            shipping_address,
            billing_address,
            payment_method,
            order_notes
        } = req.body;

        // Validation
        if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: customer_id and items array'
            });
        }

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        // Use transaction for order creation
        const result = await transaction(async (client) => {
            // Calculate totals
            let subtotal = 0;
            for (const item of items) {
                if (!item.game_id || !item.unit_price || !item.quantity) {
                    throw new Error('Each item must have game_id, unit_price, and quantity');
                }
                subtotal += (item.unit_price * item.quantity);
            }

            const tax_amount = subtotal * 0.08; // 8% tax
            const shipping_cost = subtotal > 50 ? 0 : 5.99;
            const total_amount = subtotal + tax_amount + shipping_cost;

            // Create order
            const orderQuery = `
                INSERT INTO orders (
                    customer_id, order_status, total_amount, subtotal, 
                    tax_amount, shipping_cost, payment_method, order_notes,
                    estimated_delivery
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const estimatedDelivery = new Date();
            estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

            const orderResult = await client.query(orderQuery, [
                customer_id, 'pending', total_amount, subtotal,
                tax_amount, shipping_cost, payment_method, order_notes,
                estimatedDelivery
            ]);

            const order = orderResult.rows[0];

            // Add order items
            for (const item of items) {
                const itemQuery = `
                    INSERT INTO order_items (
                        order_id, game_id, game_name, quantity, 
                        unit_price, discount_price, total_price
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `;

                const itemTotal = (item.discount_price || item.unit_price) * item.quantity;

                await client.query(itemQuery, [
                    order.order_id,
                    item.game_id,
                    item.game_name,
                    item.quantity,
                    item.unit_price,
                    item.discount_price,
                    itemTotal
                ]);
            }

            return order;
        });

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: {
                order_id: result.order_id,
                total_amount: result.total_amount,
                status: result.order_status,
                estimated_delivery: result.estimated_delivery
            }
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order',
            message: error.message
        });
    }
});

// 4. Update order status
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status',
                validStatuses
            });
        }

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const updateQuery = `
            UPDATE orders 
            SET order_status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE order_id = $2 OR id = $3
            RETURNING *
        `;

        const result = await query(updateQuery, [status, id, parseInt(id) || 0]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order status updated successfully',
            data: {
                order_id: result.rows[0].order_id,
                new_status: result.rows[0].order_status,
                updated_at: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status',
            message: error.message
        });
    }
});

// 5. Get customer orders
app.get('/api/customers/:customerId/orders', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { limit = 10, page = 1 } = req.query;
        const offset = (page - 1) * limit;

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const ordersQuery = `
            SELECT 
                o.order_id, o.order_status, o.total_amount,
                o.payment_method, o.payment_status, o.created_at,
                o.estimated_delivery, o.tracking_number
            FROM orders o
            WHERE o.customer_id = $1
            ORDER BY o.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const countQuery = `
            SELECT COUNT(*) as total FROM orders WHERE customer_id = $1
        `;

        const [ordersResult, countResult] = await Promise.all([
            query(ordersQuery, [customerId, parseInt(limit), offset]),
            query(countQuery, [customerId])
        ]);

        const totalOrders = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                customer_id: customerId,
                orders: ordersResult.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalOrders / limit),
                    totalItems: totalOrders,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching customer orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer orders',
            message: error.message
        });
    }
});

// 6. Get order statistics
app.get('/api/orders/stats/summary', async (req, res) => {
    try {
        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const statsQuery = `
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN order_status = 'pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN order_status = 'completed' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN order_status = 'shipped' THEN 1 END) as shipped_orders,
                ROUND(AVG(total_amount), 2) as average_order_value,
                SUM(total_amount) as total_revenue,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM orders
        `;

        const dailyStatsQuery = `
            SELECT 
                DATE(created_at) as order_date,
                COUNT(*) as orders_count,
                SUM(total_amount) as daily_revenue
            FROM orders
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY order_date DESC
        `;

        const [statsResult, dailyResult] = await Promise.all([
            query(statsQuery),
            query(dailyStatsQuery)
        ]);

        res.json({
            success: true,
            data: {
                overall: statsResult.rows[0],
                daily_stats: dailyResult.rows
            }
        });

    } catch (error) {
        console.error('Error fetching order statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order statistics',
            message: error.message
        });
    }
});

// Customer Management Routes

// 7. Create new customer
app.post('/api/customers', async (req, res) => {
    try {
        const {
            customer_id,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth
        } = req.body;

        // Validation
        if (!customer_id || !first_name || !last_name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: customer_id, first_name, last_name, email'
            });
        }

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const customerQuery = `
            INSERT INTO customers (customer_id, first_name, last_name, email, phone, date_of_birth)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await query(customerQuery, [
            customer_id, first_name, last_name, email, phone, date_of_birth
        ]);

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating customer:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({
                success: false,
                error: 'Customer with this ID or email already exists'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to create customer',
                message: error.message
            });
        }
    }
});

// 8. Get customer by ID
app.get('/api/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!dbConnected) {
            throw new Error('Database not connected');
        }

        const customerQuery = `
            SELECT * FROM customers 
            WHERE customer_id = $1
        `;

        const result = await query(customerQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer',
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
        console.log(`🛒 Order Service running on port ${PORT}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        console.log(`📊 Database status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
        console.log('Available endpoints:');
        console.log('  GET  /api/orders                     - Get all orders with filtering');
        console.log('  GET  /api/orders/:id                 - Get specific order with details');
        console.log('  POST /api/orders                     - Create new order');
        console.log('  PUT  /api/orders/:id/status          - Update order status');
        console.log('  GET  /api/customers/:id/orders       - Get customer orders');
        console.log('  GET  /api/orders/stats/summary       - Get order statistics');
        console.log('  POST /api/customers                  - Create new customer');
        console.log('  GET  /api/customers/:id              - Get customer details');
    });
};

startServer().catch(console.error);

module.exports = app;
