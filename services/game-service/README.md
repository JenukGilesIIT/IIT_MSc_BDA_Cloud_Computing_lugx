# LUGX Game Service

## Overview
RESTful API microservice for managing gaming products, inventory, and catalog data for the LUGX Gaming Platform.

## Features
- **Product Catalog**: Complete game information with categories, pricing, and descriptions
- **Inventory Management**: Stock tracking and availability status
- **Search & Filtering**: Advanced search by name, category, price range, and tags
- **API Endpoints**: RESTful endpoints for frontend integration
- **Health Monitoring**: Built-in health check endpoints
- **Security**: Helmet.js security headers and CORS support

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Games API
- `GET /api/games` - Get all games (with pagination and filters)
- `GET /api/games/:id` - Get specific game by ID
- `GET /api/games/category/:category` - Get games by category
- `GET /api/games/search?q=query` - Search games
- `GET /api/games/featured` - Get featured games
- `GET /api/games/trending` - Get trending games

### Query Parameters
- `category`: Filter by game category (Action, RPG, Sports, Adventure)
- `inStock`: Filter by availability (true/false)
- `limit`: Number of results per page (default: 10)
- `offset`: Pagination offset (default: 0)
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter

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
docker build -t lugx-game-service:latest .

# Run container
docker run -p 3000:3000 lugx-game-service:latest

# Test health check
curl http://localhost:3000/health
```

## Example API Responses

### Get All Games
```json
{
  "games": [
    {
      "id": 1,
      "name": "Call of Duty: Modern Warfare III",
      "category": "Action",
      "price": 69.99,
      "image": "/assets/images/featured-01.png",
      "description": "The latest installment in the iconic Call of Duty franchise.",
      "inStock": true,
      "stockCount": 150,
      "tags": ["fps", "multiplayer", "action"]
    }
  ],
  "pagination": {
    "total": 6,
    "limit": 10,
    "offset": 0,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Search Games
```json
{
  "query": "action",
  "results": [
    {
      "id": 1,
      "name": "Call of Duty: Modern Warfare III",
      "category": "Action",
      "price": 69.99
    }
  ],
  "count": 3
}
```

## Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## Testing
```bash
# Run tests
npm test

# Test API endpoints
curl http://localhost:3000/api/games
curl http://localhost:3000/api/games/1
curl http://localhost:3000/api/games/search?q=action
```
