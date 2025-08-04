-- LUGX Gaming Platform Database Schema
-- PostgreSQL database schema for Game Service and Order Service

-- Create the main database (run this first)
-- CREATE DATABASE lugx_gaming_db;

-- Connect to the database and run the following:
-- \c lugx_gaming_db;

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- GAME SERVICE TABLES
-- =====================================================

-- Games table
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2),
    category VARCHAR(100) NOT NULL,
    tags TEXT[], -- PostgreSQL array for tags
    image_url VARCHAR(500),
    release_date DATE,
    rating DECIMAL(3, 2) DEFAULT 0.0, -- Rating out of 5.0
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    stock_quantity INTEGER DEFAULT 0,
    developer VARCHAR(200),
    publisher VARCHAR(200),
    platform VARCHAR(100) DEFAULT 'PC',
    system_requirements JSONB, -- Store as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game categories table for normalization
CREATE TABLE game_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game reviews table
CREATE TABLE game_reviews (
    id SERIAL PRIMARY KEY,
    review_id UUID DEFAULT uuid_generate_v4(),
    game_id VARCHAR(50) REFERENCES games(game_id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ORDER SERVICE TABLES
-- =====================================================

-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer addresses table
CREATE TABLE customer_addresses (
    id SERIAL PRIMARY KEY,
    address_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    customer_id VARCHAR(100) REFERENCES customers(customer_id) ON DELETE CASCADE,
    address_type VARCHAR(20) CHECK (address_type IN ('billing', 'shipping')) DEFAULT 'shipping',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(200),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Sri Lanka',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    customer_id VARCHAR(100) REFERENCES customers(customer_id) ON DELETE SET NULL,
    order_status VARCHAR(20) CHECK (order_status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    shipping_cost DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'debit_card', 'paypal', 'bank_transfer')),
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
    shipping_address_id UUID,
    billing_address_id UUID,
    order_notes TEXT,
    estimated_delivery DATE,
    actual_delivery DATE,
    tracking_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table (cart items for each order)
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE,
    game_id VARCHAR(50), -- Reference to games table
    game_name VARCHAR(255) NOT NULL, -- Denormalized for performance
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order status history table for tracking
CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    status_reason TEXT,
    changed_by VARCHAR(100), -- Could be user_id or 'system'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints for orders table
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_shipping_address 
FOREIGN KEY (shipping_address_id) REFERENCES customer_addresses(address_id);

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_billing_address 
FOREIGN KEY (billing_address_id) REFERENCES customer_addresses(address_id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Game Service indexes
CREATE INDEX idx_games_category ON games(category);
CREATE INDEX idx_games_price ON games(price);
CREATE INDEX idx_games_featured ON games(is_featured);
CREATE INDEX idx_games_trending ON games(is_trending);
CREATE INDEX idx_games_name_search ON games USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_game_reviews_game_id ON game_reviews(game_id);
CREATE INDEX idx_game_reviews_rating ON game_reviews(rating);

-- Order Service indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_total_amount ON orders(total_amount);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_game_id ON order_items(game_id);
CREATE INDEX idx_customers_email ON customers(email);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert game categories
INSERT INTO game_categories (name, description) VALUES
('Action', 'Fast-paced games with combat and adventure'),
('RPG', 'Role-playing games with character development'),
('Sports', 'Sports simulation and arcade games'),
('Strategy', 'Strategic thinking and planning games'),
('Battle Royale', 'Last-player-standing competitive games'),
('FPS', 'First-person shooter games'),
('Adventure', 'Story-driven exploration games'),
('Racing', 'Vehicle racing and simulation games');

-- Insert sample games
INSERT INTO games (game_id, name, description, price, discount_price, category, tags, image_url, release_date, rating, is_featured, is_trending, stock_quantity, developer, publisher, platform, system_requirements) VALUES
('game_001', 'Call of Duty: Modern Warfare', 'Intense first-person shooter with realistic combat scenarios and multiplayer modes.', 59.99, 49.99, 'FPS', ARRAY['fps', 'multiplayer', 'action', 'war'], '/assets/images/featured-01.png', '2023-10-27', 4.5, true, true, 100, 'Infinity Ward', 'Activision', 'PC', '{"minimum": {"os": "Windows 10", "processor": "Intel Core i3-6100", "memory": "8 GB RAM", "graphics": "NVIDIA GTX 960"}, "recommended": {"os": "Windows 11", "processor": "Intel Core i5-8400", "memory": "16 GB RAM", "graphics": "NVIDIA RTX 3060"}}'),

('game_002', 'Cyberpunk 2077', 'Open-world RPG set in a dystopian future with advanced customization and branching storylines.', 49.99, 29.99, 'RPG', ARRAY['rpg', 'open-world', 'cyberpunk', 'story'], '/assets/images/featured-02.png', '2020-12-10', 4.2, true, false, 75, 'CD Projekt RED', 'CD Projekt', 'PC', '{"minimum": {"os": "Windows 10", "processor": "Intel Core i5-3570K", "memory": "8 GB RAM", "graphics": "NVIDIA GTX 780"}, "recommended": {"os": "Windows 10", "processor": "Intel Core i7-4790", "memory": "12 GB RAM", "graphics": "NVIDIA RTX 2060"}}'),

('game_003', 'The Legend of Zelda: Breath of the Wild', 'Adventure game with vast open world exploration and puzzle-solving elements.', 59.99, null, 'Adventure', ARRAY['adventure', 'open-world', 'puzzle', 'nintendo'], '/assets/images/featured-03.png', '2017-03-03', 4.8, true, false, 50, 'Nintendo EPD', 'Nintendo', 'Switch', '{"minimum": {"console": "Nintendo Switch", "storage": "13.4 GB"}}'),

('game_004', 'FIFA 23', 'Latest football simulation with realistic gameplay and updated team rosters.', 69.99, 59.99, 'Sports', ARRAY['sports', 'football', 'simulation', 'multiplayer'], '/assets/images/featured-04.png', '2022-09-30', 4.1, false, true, 120, 'EA Vancouver', 'EA Sports', 'PC', '{"minimum": {"os": "Windows 10", "processor": "Intel Core i3-6100", "memory": "8 GB RAM", "graphics": "NVIDIA GTX 660"}, "recommended": {"os": "Windows 10", "processor": "Intel Core i5-3550", "memory": "8 GB RAM", "graphics": "NVIDIA GTX 670"}}'),

('game_005', 'Assassin''s Creed Valhalla', 'Historical action-adventure game set in the Viking age with stealth and combat mechanics.', 39.99, 24.99, 'Action', ARRAY['action', 'adventure', 'stealth', 'historical'], '/assets/images/top-game-01.jpg', '2020-11-10', 4.3, false, true, 80, 'Ubisoft Montreal', 'Ubisoft', 'PC', '{"minimum": {"os": "Windows 10", "processor": "Intel Core i5-4460", "memory": "8 GB RAM", "graphics": "NVIDIA GTX 960"}, "recommended": {"os": "Windows 10", "processor": "Intel Core i7-6700HQ", "memory": "16 GB RAM", "graphics": "NVIDIA GTX 1080"}}'),

('game_006', 'Spider-Man: Miles Morales', 'Superhero action game featuring web-slinging mechanics and combat in New York City.', 49.99, 39.99, 'Action', ARRAY['action', 'superhero', 'open-world', 'adventure'], '/assets/images/top-game-02.jpg', '2020-11-12', 4.6, false, false, 60, 'Insomniac Games', 'Sony Interactive Entertainment', 'PC', '{"minimum": {"os": "Windows 10", "processor": "Intel Core i3-4160", "memory": "8 GB RAM", "graphics": "NVIDIA GTX 950"}, "recommended": {"os": "Windows 10", "processor": "Intel Core i5-4670", "memory": "16 GB RAM", "graphics": "NVIDIA GTX 1060"}}');

-- Insert sample customers
INSERT INTO customers (customer_id, first_name, last_name, email, phone, date_of_birth) VALUES
('customer_001', 'John', 'Doe', 'john.doe@email.com', '+94771234567', '1990-05-15'),
('customer_002', 'Jane', 'Smith', 'jane.smith@email.com', '+94771234568', '1985-08-22'),
('customer_003', 'Mike', 'Johnson', 'mike.johnson@email.com', '+94771234569', '1992-12-03');

-- Insert sample addresses
INSERT INTO customer_addresses (customer_id, address_type, first_name, last_name, address_line_1, city, postal_code, country, is_default) VALUES
('customer_001', 'shipping', 'John', 'Doe', '123 Main Street', 'Colombo', '00100', 'Sri Lanka', true),
('customer_001', 'billing', 'John', 'Doe', '123 Main Street', 'Colombo', '00100', 'Sri Lanka', true),
('customer_002', 'shipping', 'Jane', 'Smith', '456 Oak Avenue', 'Kandy', '20000', 'Sri Lanka', true),
('customer_003', 'shipping', 'Mike', 'Johnson', '789 Pine Road', 'Galle', '80000', 'Sri Lanka', true);

-- Insert sample orders
INSERT INTO orders (customer_id, order_status, total_amount, subtotal, tax_amount, shipping_cost, payment_method, payment_status, order_notes, estimated_delivery) VALUES
('customer_001', 'delivered', 109.98, 99.98, 8.00, 2.00, 'credit_card', 'paid', 'Please deliver during business hours', '2025-01-25'),
('customer_002', 'shipped', 29.99, 29.99, 2.40, 0.00, 'paypal', 'paid', 'Gift for my son', '2025-01-28'),
('customer_003', 'pending', 199.97, 189.97, 15.00, 5.00, 'credit_card', 'pending', 'Rush delivery please', '2025-01-30');

-- Insert sample order items
INSERT INTO order_items (order_id, game_id, game_name, quantity, unit_price, discount_price, total_price) VALUES
((SELECT order_id FROM orders WHERE customer_id = 'customer_001' LIMIT 1), 'game_001', 'Call of Duty: Modern Warfare', 1, 59.99, 49.99, 49.99),
((SELECT order_id FROM orders WHERE customer_id = 'customer_001' LIMIT 1), 'game_004', 'FIFA 23', 1, 69.99, 59.99, 59.99),
((SELECT order_id FROM orders WHERE customer_id = 'customer_002' LIMIT 1), 'game_002', 'Cyberpunk 2077', 1, 49.99, 29.99, 29.99),
((SELECT order_id FROM orders WHERE customer_id = 'customer_003' LIMIT 1), 'game_003', 'The Legend of Zelda: Breath of the Wild', 1, 59.99, null, 59.99),
((SELECT order_id FROM orders WHERE customer_id = 'customer_003' LIMIT 1), 'game_005', 'Assassin''s Creed Valhalla', 1, 39.99, 24.99, 24.99),
((SELECT order_id FROM orders WHERE customer_id = 'customer_003' LIMIT 1), 'game_006', 'Spider-Man: Miles Morales', 1, 49.99, 39.99, 39.99);

-- Insert sample game reviews
INSERT INTO game_reviews (game_id, user_id, rating, review_text, is_verified_purchase) VALUES
('game_001', 'customer_001', 5, 'Amazing graphics and gameplay! Best FPS game I have played.', true),
('game_001', 'customer_002', 4, 'Great game but can be challenging for beginners.', false),
('game_002', 'customer_002', 4, 'Fantastic story and world-building. Some bugs but overall excellent.', true),
('game_003', 'customer_003', 5, 'Masterpiece! Best adventure game ever created.', true),
('game_004', 'customer_001', 4, 'Good football simulation with realistic gameplay.', true),
('game_005', 'customer_003', 4, 'Love the Viking setting and combat system.', true);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for game statistics
CREATE VIEW game_stats AS
SELECT 
    g.game_id,
    g.name,
    g.category,
    g.price,
    g.discount_price,
    ROUND(AVG(r.rating), 2) as average_rating,
    COUNT(r.id) as review_count,
    SUM(oi.quantity) as total_sold,
    SUM(oi.total_price) as total_revenue
FROM games g
LEFT JOIN game_reviews r ON g.game_id = r.game_id
LEFT JOIN order_items oi ON g.game_id = oi.game_id
GROUP BY g.game_id, g.name, g.category, g.price, g.discount_price;

-- View for customer order summary
CREATE VIEW customer_order_summary AS
SELECT 
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    COUNT(o.id) as total_orders,
    SUM(o.total_amount) as total_spent,
    AVG(o.total_amount) as average_order_value,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name, c.email;

-- View for order details with customer info
CREATE VIEW order_details AS
SELECT 
    o.order_id,
    o.order_status,
    o.total_amount,
    o.payment_method,
    o.payment_status,
    o.created_at as order_date,
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    ca_ship.address_line_1 as shipping_address,
    ca_ship.city as shipping_city,
    ca_ship.country as shipping_country
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN customer_addresses ca_ship ON o.shipping_address_id = ca_ship.address_id;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON customer_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_reviews_updated_at BEFORE UPDATE ON game_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create order status history
CREATE OR REPLACE FUNCTION create_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
        INSERT INTO order_status_history (order_id, previous_status, new_status, status_reason, changed_by)
        VALUES (NEW.order_id, OLD.order_status, NEW.order_status, 'Status updated', 'system');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for order status history
CREATE TRIGGER order_status_history_trigger 
    AFTER UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION create_order_status_history();

-- =====================================================
-- ANALYTICS QUERIES FOR TESTING
-- =====================================================

-- Top selling games
-- SELECT * FROM game_stats ORDER BY total_sold DESC NULLS LAST LIMIT 5;

-- Customer spending analysis
-- SELECT * FROM customer_order_summary ORDER BY total_spent DESC;

-- Monthly sales report
-- SELECT 
--     DATE_TRUNC('month', created_at) as month,
--     COUNT(*) as orders_count,
--     SUM(total_amount) as total_revenue,
--     AVG(total_amount) as average_order_value
-- FROM orders 
-- GROUP BY DATE_TRUNC('month', created_at) 
-- ORDER BY month DESC;

-- Game category performance
-- SELECT 
--     category,
--     COUNT(*) as games_count,
--     AVG(price) as average_price,
--     SUM(COALESCE(gs.total_sold, 0)) as total_sold,
--     SUM(COALESCE(gs.total_revenue, 0)) as total_revenue
-- FROM games g
-- LEFT JOIN game_stats gs ON g.game_id = gs.game_id
-- GROUP BY category
-- ORDER BY total_revenue DESC NULLS LAST;
