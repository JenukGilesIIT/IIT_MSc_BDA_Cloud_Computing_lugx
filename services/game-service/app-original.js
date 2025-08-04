const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for frontend communication
app.use(compression()); // Compress responses
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies

// Sample game data (In production, this would come from a database)
const games = [
  {
    id: 1,
    name: "Call of Duty: Modern Warfare III",
    category: "Action",
    price: 69.99,
    image: "/assets/images/featured-01.png",
    description: "The latest installment in the iconic Call of Duty franchise.",
    inStock: true,
    stockCount: 150,
    tags: ["fps", "multiplayer", "action"]
  },
  {
    id: 2,
    name: "Cyberpunk 2077",
    category: "RPG",
    price: 59.99,
    image: "/assets/images/featured-02.png",
    description: "Open-world RPG set in the dystopian Night City.",
    inStock: true,
    stockCount: 75,
    tags: ["rpg", "open-world", "cyberpunk"]
  },
  {
    id: 3,
    name: "The Legend of Zelda: Tears of the Kingdom",
    category: "Adventure",
    price: 59.99,
    image: "/assets/images/featured-03.png",
    description: "Epic adventure in the kingdom of Hyrule.",
    inStock: true,
    stockCount: 200,
    tags: ["adventure", "nintendo", "open-world"]
  },
  {
    id: 4,
    name: "FIFA 24",
    category: "Sports",
    price: 49.99,
    image: "/assets/images/featured-04.png",
    description: "The world's most popular football simulation game.",
    inStock: false,
    stockCount: 0,
    tags: ["sports", "football", "simulation"]
  },
  {
    id: 5,
    name: "Assassin's Creed Mirage",
    category: "Action",
    price: 54.99,
    image: "/assets/images/top-game-01.jpg",
    description: "Return to the roots of the Assassin's Creed franchise.",
    inStock: true,
    stockCount: 120,
    tags: ["action", "stealth", "historical"]
  },
  {
    id: 6,
    name: "Spider-Man 2",
    category: "Action",
    price: 69.99,
    image: "/assets/images/top-game-02.jpg",
    description: "Swing through New York as Spider-Man in this epic adventure.",
    inStock: true,
    stockCount: 95,
    tags: ["action", "superhero", "adventure"]
  }
];

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'lugx-game-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Search games (MUST come before /:id route to avoid conflicts)
app.get('/api/games/search', (req, res) => {
  const { q: query, category, minPrice, maxPrice } = req.query;
  
  if (!query) {
    return res.status(400).json({
      error: 'Query parameter "q" is required'
    });
  }
  
  let results = games.filter(game => 
    game.name.toLowerCase().includes(query.toLowerCase()) ||
    game.description.toLowerCase().includes(query.toLowerCase()) ||
    game.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
  );
  
  // Additional filters
  if (category) {
    results = results.filter(game => 
      game.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  if (minPrice) {
    results = results.filter(game => game.price >= parseFloat(minPrice));
  }
  
  if (maxPrice) {
    results = results.filter(game => game.price <= parseFloat(maxPrice));
  }
  
  res.json({
    query,
    results,
    count: results.length
  });
});

// Get featured games (top 4)
app.get('/api/games/featured', (req, res) => {
  const featuredGames = games
    .filter(game => game.inStock)
    .sort((a, b) => b.stockCount - a.stockCount)
    .slice(0, 4);
  
  res.json({
    featured: featuredGames,
    count: featuredGames.length
  });
});

// Get trending games (based on category popularity)
app.get('/api/games/trending', (req, res) => {
  const trendingGames = games
    .filter(game => game.inStock)
    .filter(game => game.category === 'Action' || game.category === 'RPG')
    .slice(0, 4);
  
  res.json({
    trending: trendingGames,
    count: trendingGames.length
  });
});

// Get games by category
app.get('/api/games/category/:category', (req, res) => {
  const category = req.params.category;
  const categoryGames = games.filter(game => 
    game.category.toLowerCase() === category.toLowerCase()
  );
  
  if (categoryGames.length === 0) {
    return res.status(404).json({
      error: 'No games found for this category',
      category
    });
  }
  
  res.json({
    category,
    games: categoryGames,
    count: categoryGames.length
  });
});

// Get all games
app.get('/api/games', (req, res) => {
  const { category, inStock, limit = 10, offset = 0 } = req.query;
  
  let filteredGames = [...games];
  
  // Filter by category
  if (category) {
    filteredGames = filteredGames.filter(game => 
      game.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Filter by stock status
  if (inStock !== undefined) {
    const stockFilter = inStock === 'true';
    filteredGames = filteredGames.filter(game => game.inStock === stockFilter);
  }
  
  // Pagination
  const total = filteredGames.length;
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedGames = filteredGames.slice(startIndex, endIndex);
  
  res.json({
    games: paginatedGames,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasNext: endIndex < total,
      hasPrev: startIndex > 0
    }
  });
});

// Get game by ID (MUST come after specific routes to avoid conflicts)
app.get('/api/games/:id', (req, res) => {
  const gameId = parseInt(req.params.id);
  const game = games.find(g => g.id === gameId);
  
  if (!game) {
    return res.status(404).json({
      error: 'Game not found',
      gameId
    });
  }
  
  res.json(game);
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
  console.log(`🎮 LUGX Game Service running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API endpoints: http://localhost:${PORT}/api/games`);
});

module.exports = app;
