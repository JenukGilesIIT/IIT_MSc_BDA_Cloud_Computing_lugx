# Database Setup Instructions for LUGX Gaming Platform

## Quick Start

### 1. Start PostgreSQL Database
```bash
cd database
docker-compose up -d
```

This will:
- Start PostgreSQL on port 5432
- Create the `lugx_gaming_db` database
- Run the schema.sql file to create all tables
- Start pgAdmin on port 5050 (optional GUI)

### 2. Database Access Details
- **PostgreSQL Connection**:
  - Host: localhost
  - Port: 5432
  - Database: lugx_gaming_db
  - Username: lugx_admin
  - Password: lugx_secure_password_2025

- **pgAdmin Access** (Optional):
  - URL: http://localhost:5050
  - Email: admin@lugxgaming.com
  - Password: admin123

### 3. Test Game Service with Database
```bash
cd services/game-service
npm install
npm start
```

### 4. Test Database Integration
```bash
# Health check with database stats
curl http://localhost:3000/health

# Get all games from database
curl http://localhost:3000/api/games

# Search games
curl "http://localhost:3000/api/games/search?q=action"

# Get featured games
curl http://localhost:3000/api/games/featured

# Get game statistics
curl http://localhost:3000/api/games/stats/summary
```

## Database Schema Overview

### Game Service Tables:
- `games` - Main game catalog
- `game_categories` - Game categories
- `game_reviews` - User reviews and ratings
- `game_stats` - View for game statistics

### Order Service Tables:
- `customers` - Customer information
- `customer_addresses` - Shipping/billing addresses
- `orders` - Order information
- `order_items` - Items in each order
- `order_status_history` - Order status tracking

### Features:
- ✅ Full ACID compliance with PostgreSQL
- ✅ Proper indexing for performance
- ✅ Foreign key constraints for data integrity
- ✅ Automatic timestamp updates
- ✅ Sample data for testing
- ✅ Views for common queries
- ✅ UUID generation for orders
- ✅ Full-text search capabilities

## Next Steps

1. **Test Game Service**: Start and test the updated Game Service
2. **Update Order Service**: Integrate Order Service with PostgreSQL
3. **Frontend Integration**: Connect frontend to database-backed APIs
4. **Performance Testing**: Test with larger datasets

## Troubleshooting

### Database Connection Issues:
```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Reset Database:
```bash
# Stop and remove all data
docker-compose down -v

# Start fresh
docker-compose up -d
```
