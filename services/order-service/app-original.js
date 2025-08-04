const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for frontend communication
app.use(compression()); // Compress responses
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies

// Sample order data (In production, this would come from a database)
let orders = [
  {
    id: "order_001",
    customerId: "customer_123",
    customerName: "John Smith",
    customerEmail: "john.smith@email.com",
    items: [
      {
        gameId: 1,
        gameName: "Call of Duty: Modern Warfare III",
        price: 69.99,
        quantity: 1
      },
      {
        gameId: 5,
        gameName: "Assassin's Creed Mirage",
        price: 54.99,
        quantity: 1
      }
    ],
    totalAmount: 124.98,
    status: "completed",
    paymentMethod: "credit_card",
    shippingAddress: {
      street: "123 Gaming St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      country: "USA"
    },
    orderDate: "2025-07-25T10:30:00.000Z",
    estimatedDelivery: "2025-07-30T00:00:00.000Z"
  },
  {
    id: "order_002",
    customerId: "customer_456",
    customerName: "Sarah Johnson",
    customerEmail: "sarah.johnson@email.com",
    items: [
      {
        gameId: 2,
        gameName: "Cyberpunk 2077",
        price: 59.99,
        quantity: 2
      }
    ],
    totalAmount: 119.98,
    status: "pending",
    paymentMethod: "paypal",
    shippingAddress: {
      street: "456 Tech Ave",
      city: "Austin",
      state: "TX",
      zipCode: "78701",
      country: "USA"
    },
    orderDate: "2025-07-26T14:15:00.000Z",
    estimatedDelivery: "2025-08-01T00:00:00.000Z"
  },
  {
    id: "order_003",
    customerId: "customer_789",
    customerName: "Mike Wilson",
    customerEmail: "mike.wilson@email.com",
    items: [
      {
        gameId: 3,
        gameName: "The Legend of Zelda: Tears of the Kingdom",
        price: 59.99,
        quantity: 1
      }
    ],
    totalAmount: 59.99,
    status: "shipped",
    paymentMethod: "credit_card",
    shippingAddress: {
      street: "789 Adventure Blvd",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
      country: "USA"
    },
    orderDate: "2025-07-24T09:45:00.000Z",
    estimatedDelivery: "2025-07-29T00:00:00.000Z"
  }
];

// Sample customer data
const customers = [
  {
    id: "customer_123",
    name: "John Smith",
    email: "john.smith@email.com",
    totalOrders: 3,
    totalSpent: 324.97
  },
  {
    id: "customer_456",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    totalOrders: 1,
    totalSpent: 119.98
  },
  {
    id: "customer_789",
    name: "Mike Wilson",
    email: "mike.wilson@email.com",
    totalOrders: 2,
    totalSpent: 159.98
  }
];

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'lugx-order-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    totalOrders: orders.length
  });
});

// Get all orders
app.get('/api/orders', (req, res) => {
  const { status, customerId, limit = 10, offset = 0, sortBy = 'orderDate', sortOrder = 'desc' } = req.query;
  
  let filteredOrders = [...orders];
  
  // Filter by status
  if (status) {
    filteredOrders = filteredOrders.filter(order => 
      order.status.toLowerCase() === status.toLowerCase()
    );
  }
  
  // Filter by customer ID
  if (customerId) {
    filteredOrders = filteredOrders.filter(order => 
      order.customerId === customerId
    );
  }
  
  // Sort orders
  filteredOrders.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'orderDate') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (sortOrder === 'desc') {
      return bValue > aValue ? 1 : -1;
    } else {
      return aValue > bValue ? 1 : -1;
    }
  });
  
  // Pagination
  const total = filteredOrders.length;
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
  
  res.json({
    orders: paginatedOrders,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasNext: endIndex < total,
      hasPrev: startIndex > 0
    },
    filters: {
      status: status || 'all',
      customerId: customerId || 'all'
    }
  });
});

// Get order by ID
app.get('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const order = orders.find(o => o.id === orderId);
  
  if (!order) {
    return res.status(404).json({
      error: 'Order not found',
      orderId
    });
  }
  
  res.json(order);
});

// Create new order
app.post('/api/orders', (req, res) => {
  const { customerId, customerName, customerEmail, items, shippingAddress, paymentMethod } = req.body;
  
  // Validation
  if (!customerId || !customerName || !customerEmail || !items || !items.length) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['customerId', 'customerName', 'customerEmail', 'items']
    });
  }
  
  // Calculate total amount
  const totalAmount = items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  // Create new order
  const newOrder = {
    id: `order_${uuidv4().substr(0, 8)}`,
    customerId,
    customerName,
    customerEmail,
    items,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    status: 'pending',
    paymentMethod: paymentMethod || 'credit_card',
    shippingAddress,
    orderDate: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
  };
  
  orders.unshift(newOrder); // Add to beginning of array
  
  res.status(201).json({
    message: 'Order created successfully',
    order: newOrder
  });
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      validStatuses
    });
  }
  
  const orderIndex = orders.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({
      error: 'Order not found',
      orderId
    });
  }
  
  orders[orderIndex].status = status;
  
  res.json({
    message: 'Order status updated successfully',
    order: orders[orderIndex]
  });
});

// Get orders by status
app.get('/api/orders/status/:status', (req, res) => {
  const status = req.params.status.toLowerCase();
  const statusOrders = orders.filter(order => 
    order.status.toLowerCase() === status
  );
  
  if (statusOrders.length === 0) {
    return res.status(404).json({
      error: 'No orders found for this status',
      status
    });
  }
  
  res.json({
    status,
    orders: statusOrders,
    count: statusOrders.length
  });
});

// Get customer orders
app.get('/api/customers/:customerId/orders', (req, res) => {
  const customerId = req.params.customerId;
  const customerOrders = orders.filter(order => order.customerId === customerId);
  
  if (customerOrders.length === 0) {
    return res.status(404).json({
      error: 'No orders found for this customer',
      customerId
    });
  }
  
  // Calculate customer stats
  const totalSpent = customerOrders.reduce((total, order) => total + order.totalAmount, 0);
  const customer = customers.find(c => c.id === customerId);
  
  res.json({
    customerId,
    customerName: customer ? customer.name : 'Unknown',
    orders: customerOrders,
    stats: {
      totalOrders: customerOrders.length,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      averageOrderValue: parseFloat((totalSpent / customerOrders.length).toFixed(2))
    }
  });
});

// Get order statistics
app.get('/api/orders/stats/summary', (req, res) => {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((total, order) => total + order.totalAmount, 0);
  
  const statusCounts = orders.reduce((counts, order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
    return counts;
  }, {});
  
  const recentOrders = orders
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    .slice(0, 5);
  
  res.json({
    summary: {
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageOrderValue: parseFloat((totalRevenue / totalOrders).toFixed(2))
    },
    statusBreakdown: statusCounts,
    recentOrders
  });
});

// Cancel order
app.delete('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const orderIndex = orders.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({
      error: 'Order not found',
      orderId
    });
  }
  
  const order = orders[orderIndex];
  
  if (order.status === 'shipped' || order.status === 'delivered') {
    return res.status(400).json({
      error: 'Cannot cancel order',
      reason: 'Order has already been shipped or delivered'
    });
  }
  
  orders[orderIndex].status = 'cancelled';
  
  res.json({
    message: 'Order cancelled successfully',
    order: orders[orderIndex]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`📦 LUGX Order Service running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API endpoints: http://localhost:${PORT}/api/orders`);
  console.log(`📊 Order stats: http://localhost:${PORT}/api/orders/stats/summary`);
});

module.exports = app;
