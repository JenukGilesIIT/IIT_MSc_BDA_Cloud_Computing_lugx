# LUGX Analytics Service

A comprehensive analytics and reporting microservice for the LUGX Gaming Platform. This service provides real-time analytics, user behavior tracking, sales reporting, and game performance metrics.

## Features

### 📊 **Analytics Dashboard**
- Overall platform performance metrics
- Revenue and sales analytics
- User engagement statistics
- Real-time monitoring

### 🎮 **Game Analytics**
- Individual game performance metrics
- Category-based analysis
- Conversion rate tracking
- Popularity rankings

### 💰 **Sales Analytics**
- Revenue tracking and reporting
- Order analytics
- Category performance
- Daily/weekly/monthly reports

### 👥 **User Behavior Analytics**
- User session tracking
- Device and browser analytics
- Page view statistics
- User engagement metrics

### ⚡ **Real-time Analytics**
- Live user activity
- Current session monitoring
- Recent activity feed
- Server performance metrics

### 📈 **Custom Reporting**
- Generate custom analytics reports
- Configurable metrics and filters
- Event tracking system
- Data export capabilities

## API Endpoints

### Core Analytics
- `GET /health` - Service health check
- `GET /api/analytics/dashboard` - Overall analytics dashboard
- `GET /api/analytics/realtime` - Real-time analytics

### Game Analytics
- `GET /api/analytics/games` - Game performance analytics
- `GET /api/analytics/games/:gameId` - Individual game analytics

### Sales & Revenue
- `GET /api/analytics/sales` - Sales analytics and reports

### User Analytics
- `GET /api/analytics/users` - User behavior analytics

### Reporting & Events
- `POST /api/analytics/reports` - Generate custom reports
- `POST /api/analytics/events` - Track user events

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the service:**
   ```bash
   npm start
   ```

3. **Development mode with auto-reload:**
   ```bash
   npm run dev
   ```

4. **Access the service:**
   - Service: http://localhost:3002
   - Health Check: http://localhost:3002/health

### Docker Deployment

1. **Build the Docker image:**
   ```bash
   docker build -t lugx-analytics-service .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3002:3002 lugx-analytics-service
   ```

3. **Verify deployment:**
   ```bash
   curl http://localhost:3002/health
   ```

## API Usage Examples

### Get Analytics Dashboard
```bash
curl -X GET http://localhost:3002/api/analytics/dashboard
```

### Get Game Analytics
```bash
# All games
curl -X GET http://localhost:3002/api/analytics/games

# Filter by category
curl -X GET "http://localhost:3002/api/analytics/games?category=Action&sortBy=revenue"

# Individual game
curl -X GET http://localhost:3002/api/analytics/games/game_001
```

### Get Sales Analytics
```bash
# Weekly sales report
curl -X GET "http://localhost:3002/api/analytics/sales?period=week"

# Category-specific sales
curl -X GET "http://localhost:3002/api/analytics/sales?category=Battle%20Royale"
```

### Get User Analytics
```bash
# All user metrics
curl -X GET http://localhost:3002/api/analytics/users

# Device breakdown only
curl -X GET "http://localhost:3002/api/analytics/users?metric=devices"
```

### Real-time Analytics
```bash
curl -X GET http://localhost:3002/api/analytics/realtime
```

### Generate Custom Report
```bash
curl -X POST http://localhost:3002/api/analytics/reports \
  -H "Content-Type: application/json" \
  -d '{
    "reportName": "Weekly Gaming Report",
    "metrics": ["games", "sales", "users"],
    "dateRange": {
      "start": "2025-01-15",
      "end": "2025-01-21"
    },
    "filters": {
      "category": "Action"
    }
  }'
```

### Track User Event
```bash
curl -X POST http://localhost:3002/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "game_view",
    "userId": "user_123",
    "gameId": "game_001",
    "sessionId": "session_456",
    "metadata": {
      "page": "product-details",
      "duration": 120,
      "device": "desktop"
    }
  }'
```

## Sample Response Formats

### Dashboard Analytics
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 14320.00,
      "totalOrders": 273,
      "totalUsers": 1248,
      "activeUsers": 892,
      "conversionRate": 6.63,
      "averageOrderValue": 52.45
    },
    "topGames": [...],
    "recentRevenue": [...],
    "userGrowth": {...}
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### Game Analytics
```json
{
  "success": true,
  "data": {
    "gameId": "game_001",
    "name": "Fortnite",
    "views": 1250,
    "purchases": 89,
    "conversionRate": 7.12,
    "revenue": 4450.00,
    "averageSessionTime": 1800,
    "popularityRank": 1,
    "category": "Battle Royale",
    "metrics": {
      "viewsToday": 100,
      "purchasesToday": 4,
      "revenueToday": 222.50,
      "popularityTrend": "trending_up"
    }
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3002` |
| `NODE_ENV` | Environment | `development` |

## Technology Stack

- **Runtime**: Node.js 18+ (Alpine Linux)
- **Framework**: Express.js
- **Security**: Helmet.js, CORS
- **Performance**: Compression, Morgan logging
- **Utilities**: UUID for unique IDs

## Architecture

The Analytics Service is designed as a stateless microservice that:

1. **Collects** user behavior and system metrics
2. **Processes** analytics data in real-time
3. **Aggregates** statistics for reporting
4. **Provides** RESTful API endpoints
5. **Generates** custom reports and insights

## Security Features

- Non-root user execution in containers
- CORS protection for cross-origin requests
- Helmet.js for security headers
- Input validation and sanitization
- Health check monitoring

## Monitoring & Health

- Health check endpoint: `/health`
- Process uptime tracking
- Memory and performance metrics
- Error handling and logging
- Docker health check integration

## Integration

This service integrates with:
- **Game Service**: Game performance data
- **Order Service**: Sales and revenue analytics
- **Frontend**: Analytics dashboard and reporting
- **Monitoring Systems**: Prometheus/Grafana metrics

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for containerization)

### Project Structure
```
analytics-service/
├── app.js              # Main application file
├── package.json        # Dependencies and scripts
├── Dockerfile          # Container configuration
└── README.md          # This file
```

### Contributing
1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure Docker builds successfully

## License

MIT License - Part of LUGX Gaming Platform
