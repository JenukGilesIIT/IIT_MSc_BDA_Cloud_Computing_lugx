# LUGX Order Service

## Overview
RESTful API microservice for managing customer orders, order tracking, and order analytics for the LUGX Gaming Platform.

## Features
- **Order Management**: Complete CRUD operations for customer orders
- **Order Tracking**: Status updates and delivery tracking
- **Customer Analytics**: Order history and spending analysis
- **Order Statistics**: Revenue, status breakdowns, and summary reports
- **Status Management**: Order lifecycle from pending to delivered
- **Payment Integration**: Support for multiple payment methods
- **API Endpoints**: RESTful endpoints for frontend and admin integration

## API Endpoints

### Health Check
- `GET /health` - Service health status and metrics

### Order Management
- `GET /api/orders` - Get all orders (with filtering, pagination, sorting)
- `GET /api/orders/:id` - Get specific order by ID
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Cancel order

### Order Status
- `GET /api/orders/status/:status` - Get orders by status (pending, shipped, etc.)

### Customer Orders
- `GET /api/customers/:customerId/orders` - Get all orders for a specific customer

### Analytics & Statistics
- `GET /api/orders/stats/summary` - Order statistics and revenue summary

## Order Status Lifecycle
1. **pending** - Order created, awaiting payment confirmation
2. **confirmed** - Payment confirmed, order being processed
3. **shipped** - Order dispatched for delivery
4. **delivered** - Order successfully delivered
5. **cancelled** - Order cancelled (only before shipping)

## Query Parameters

### GET /api/orders
- `status`: Filter by order status
- `customerId`: Filter by customer ID
- `limit`: Number of results per page (default: 10)
- `offset`: Pagination offset (default: 0)
- `sortBy`: Sort field (orderDate, totalAmount, status)
- `sortOrder`: Sort direction (asc, desc)

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Production Server
```bash
npm start
```

### Docker Development
```bash
# Build image
docker build -t lugx-order-service:latest .

# Run container
docker run -p 3001:3001 lugx-order-service:latest

# Test health check
curl http://localhost:3001/health
```

## Example API Responses

### Create Order
```json
POST /api/orders
{
  "customerId": "customer_123",
  "customerName": "John Smith",
  "customerEmail": "john.smith@email.com",
  "items": [
    {
      "gameId": 1,
      "gameName": "Call of Duty: Modern Warfare III",
      "price": 69.99,
      "quantity": 1
    }
  ],
  "shippingAddress": {
    "street": "123 Gaming St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "country": "USA"
  },
  "paymentMethod": "credit_card"
}
```

### Order Response
```json
{
  "id": "order_12345678",
  "customerId": "customer_123",
  "customerName": "John Smith",
  "items": [...],
  "totalAmount": 69.99,
  "status": "pending",
  "orderDate": "2025-07-27T15:30:00.000Z",
  "estimatedDelivery": "2025-08-01T00:00:00.000Z"
}
```

### Order Statistics
```json
{
  "summary": {
    "totalOrders": 15,
    "totalRevenue": 1249.85,
    "averageOrderValue": 83.32
  },
  "statusBreakdown": {
    "pending": 3,
    "confirmed": 2,
    "shipped": 5,
    "delivered": 4,
    "cancelled": 1
  }
}
```

## Environment Variables
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)

## Testing
```bash
# Run tests
npm test

# Test API endpoints
curl http://localhost:3001/api/orders
curl http://localhost:3001/api/orders/order_001
curl http://localhost:3001/api/orders/stats/summary
curl http://localhost:3001/api/customers/customer_123/orders
```

## Integration with Game Service
The Order Service is designed to work with the Game Service:
- Order items reference `gameId` from Game Service
- Game names and prices can be validated against Game Service API
- Frontend can fetch game details and create orders seamlessly
