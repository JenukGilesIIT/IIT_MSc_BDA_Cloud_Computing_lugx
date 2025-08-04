// LUGX Gaming - Dynamic Game Loader
// This script fetches games from the Game Service API and displays them on the shop page

class GameLoader {
    filterGames(category) {
        if (!category || category === '*' || category.toLowerCase() === 'all') {
            this.renderGames();
            return;
        }
        // Remove leading dot if present
        const cat = category.replace(/^\./, '');
        // Match by genre or category code
        const filtered = this.games.filter(game => {
            return (game.genre && game.genre.toLowerCase() === cat.toLowerCase()) ||
                   (game.category && game.category.toLowerCase() === cat.toLowerCase());
        });
        this.renderGames(filtered);
    }
    constructor() {
        this.games = [];
        this.fallbackGames = [
            {
                id: 1,
                title: "Call of Duty: Modern Warfare",
                genre: "Action",
                price: 59.99,
                originalPrice: 79.99,
                image: "assets/images/trending-01.jpg",
                category: "adv"
            },
            {
                id: 2,
                title: "FIFA 24",
                genre: "Sports",
                price: 49.99,
                originalPrice: 69.99,
                image: "assets/images/trending-02.jpg",
                category: "str"
            },
            {
                id: 3,
                title: "Grand Theft Auto V",
                genre: "Action",
                price: 29.99,
                originalPrice: 59.99,
                image: "assets/images/trending-03.jpg",
                category: "adv"
            },
            {
                id: 4,
                title: "Forza Horizon 5",
                genre: "Racing",
                price: 39.99,
                originalPrice: 59.99,
                image: "assets/images/trending-04.jpg",
                category: "rac"
            },
            {
                id: 5,
                title: "Cyberpunk 2077",
                genre: "Action",
                price: 34.99,
                originalPrice: 59.99,
                image: "assets/images/trending-01.jpg",
                category: "adv"
            },
            {
                id: 6,
                title: "The Witcher 3",
                genre: "RPG",
                price: 24.99,
                originalPrice: 39.99,
                image: "assets/images/trending-02.jpg",
                category: "str"
            },
            {
                id: 7,
                title: "Red Dead Redemption 2",
                genre: "Action",
                price: 44.99,
                originalPrice: 59.99,
                image: "assets/images/trending-03.jpg",
                category: "adv"
            },
            {
                id: 8,
                title: "Need for Speed Heat",
                genre: "Racing",
                price: 19.99,
                originalPrice: 39.99,
                image: "assets/images/trending-04.jpg",
                category: "rac"
            }
        ];
    }

    async loadGames() {
        const container = document.getElementById('games-container');
        if (!container) {
            console.log('ℹ️ Games container not found - probably not on shop page');
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="col-12 text-center">
                <div style="padding: 40px;">
                    <h4>Loading Games...</h4>
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                </div>
            </div>
        `;

        try {
            console.log('🎮 Loading games from Game Service...');
            const response = await fetch('/api/games');
            
            if (response.ok) {
                // Get response text first to check what we actually received
                const responseText = await response.text();
                
                // Check if it looks like JSON (starts with { or [)
                if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
                    try {
                        this.games = JSON.parse(responseText);
                        console.log('✅ Games loaded from API:', this.games);
                    } catch (parseError) {
                        console.log('⚠️ Failed to parse API response as JSON, using fallback games');
                        throw new Error('Invalid JSON response from API');
                    }
                } else {
                    console.log('⚠️ API returned non-JSON response (likely HTML error page), using fallback games');
                    throw new Error('API returned HTML instead of JSON');
                }
            } else {
                console.log(`⚠️ API responded with status ${response.status}, using fallback games`);
                throw new Error(`API not available (status: ${response.status})`);
            }
        } catch (error) {
            // Catch ALL errors including network errors, CORS errors, etc.
            console.log('⚠️ API call failed, using fallback games:', error.message);
            this.games = this.fallbackGames;
        }
        
        // Short delay to show loading state
        setTimeout(() => {
            this.renderGames();
        }, 500);
    }

    renderGames(filteredGames) {
        const container = document.getElementById('games-container');
        if (!container) {
            console.log('❌ Games container not found');
            return;
        }

        console.log('🎨 Rendering games...');
        // Clear existing content
        container.innerHTML = '';

        const gamesToShow = filteredGames !== undefined ? filteredGames : this.games;
        for (let i = 0; i < gamesToShow.length; i++) {
            const gameElement = this.createGameElement(gamesToShow[i]);
            // Add cart button
            const cartBtn = document.createElement('button');
            cartBtn.textContent = 'Add to Cart';
            cartBtn.className = 'btn btn-primary btn-sm';
            cartBtn.style.marginTop = '10px';
            cartBtn.setAttribute('data-game-id', gamesToShow[i].id);
            cartBtn.onclick = () => this.addToCart(gamesToShow[i].id);
            gameElement.querySelector('.down-content').appendChild(cartBtn);
            container.appendChild(gameElement);
        }
        // If last row has fewer than 4 cards, add invisible placeholders
        const remainder = gamesToShow.length % 4;
        if (remainder !== 0) {
            for (let k = 0; k < 4 - remainder; k++) {
                const placeholder = document.createElement('div');
                placeholder.className = 'col-lg-3 col-md-6 align-self-center mb-30 trending-items col-md-6';
                placeholder.style.visibility = 'hidden';
                placeholder.style.minHeight = '370px';
                container.appendChild(placeholder);
            }
        }
        // Add clearfix and extra spacing below grid to push blue section down
        const clearfix = document.createElement('div');
        clearfix.className = 'clearfix';
        container.appendChild(clearfix);
        const spacer = document.createElement('div');
        spacer.style.height = '60px';
        container.appendChild(spacer);

        // Add extra margin to the container itself
        container.style.marginBottom = '20px';

        console.log('✅ Games rendered successfully');
    }
    createGameElement(game) {
        const gameDiv = document.createElement('div');
        gameDiv.className = `col-lg-3 col-md-6 align-self-center mb-30 trending-items col-md-6 ${game.category || 'adv'}`;
        gameDiv.style.minHeight = '370px'; // Enforce minimum height for card

        gameDiv.innerHTML = `
            <div class="item" style="height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
                <div class="thumb">
                    <a href="product-details.html?id=${game.id}" data-game-id="${game.id}" data-category="${game.genre}">
                        <img src="${game.image || 'assets/images/trending-01.jpg'}" alt="${game.title}">
                    </a>
                    <span class="price">
                        ${game.originalPrice ? `<em>$${game.originalPrice}</em>` : ''}
                        $${game.price}
                    </span>
                </div>
                <div class="down-content">
                    <span class="category">${game.genre}</span>
                    <h4>${game.title}</h4>
                    <a href="product-details.html?id=${game.id}" data-game-id="${game.id}" data-category="${game.genre}">
                        <i class="fa fa-shopping-bag"></i>
                    </a>
                </div>
            </div>
        `;

        return gameDiv;
    }

    cart = [];

    loadCart() {
        const cartData = localStorage.getItem('lugx_cart');
        this.cart = cartData ? JSON.parse(cartData) : [];
    }

    saveCart() {
        localStorage.setItem('lugx_cart', JSON.stringify(this.cart));
    }

    addToCart(gameId) {
        const game = this.games.find(g => g.id === gameId) || this.fallbackGames.find(g => g.id === gameId);
        if (game) {
            // Use the same logic as addGameToCart for consistency
            this.addGameToCart(game);
        }
    }

    addGameToCart(game) {
        console.log('🛒 addGameToCart called with:', game);
        
        // Check if game is already in cart
        const existingItemIndex = this.cart.findIndex(item => item.id === game.id);
        if (existingItemIndex !== -1) {
            // Game exists, increase quantity
            if (!this.cart[existingItemIndex].quantity) {
                this.cart[existingItemIndex].quantity = 1;
            }
            this.cart[existingItemIndex].quantity++;
            console.log(`✅ Increased quantity of ${game.title} to ${this.cart[existingItemIndex].quantity}`);
            alert(`${game.title} quantity increased! Now have ${this.cart[existingItemIndex].quantity} in cart.`);
        } else {
            // New game, add with quantity 1
            const gameWithQuantity = { ...game, quantity: 1 };
            this.cart.push(gameWithQuantity);
            console.log('✅ Game added to cart. Cart now has:', this.cart.length, 'items');
            alert(`${game.title} added to cart! ($${game.price})`);
        }
        
        this.saveCart();
        this.updateCartCount();
        
        // Track analytics - DISABLED FOR DEVELOPMENT
        // if (window.lugxAnalytics) {
        //     window.lugxAnalytics.trackGameInteraction(game.id, game.title, game.category, 'add_to_cart', {
        //         price: game.price
        //     });
        // }
    }

    updateCartCount() {
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            // Calculate total quantity of all items
            const totalQuantity = this.cart.reduce((total, item) => {
                return total + (item.quantity || 1);
            }, 0);
            cartCountElement.textContent = totalQuantity;
            console.log(`🛒 Cart count updated to: ${totalQuantity} (${this.cart.length} unique items)`);
        } else {
            console.warn('❌ Cart count element not found');
        }
    }

    showCart() {
        if (this.cart.length === 0) {
            alert('Your cart is empty.');
            return;
        }
        let totalPrice = 0;
        let cartHtml = '<h4>Your Cart</h4><ul style="list-style: none; padding: 0;">';
        this.cart.forEach((item, index) => {
            const quantity = item.quantity || 1;
            const itemTotal = item.price * quantity;
            totalPrice += itemTotal;
            cartHtml += `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <div style="flex: 1;">
                        <div>${item.title} - $${item.price} x ${quantity}</div>
                        <div style="font-size: 12px; color: #666;">Subtotal: $${itemTotal.toFixed(2)}</div>
                    </div>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <button onclick="gameLoader.decreaseQuantity(${index})" style="background: #ffa500; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 12px;">-</button>
                        <button onclick="gameLoader.increaseQuantity(${index})" style="background: #28a745; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 12px;">+</button>
                        <button onclick="gameLoader.removeFromCart(${index})" style="background: #ff4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Remove</button>
                    </div>
                </li>`;
        });
        cartHtml += `</ul><div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #0071f8;"><strong>Total: $${totalPrice.toFixed(2)}</strong></div>`;
        
        const cartDiv = document.createElement('div');
        cartDiv.innerHTML = cartHtml;
        cartDiv.style.position = 'fixed';
        cartDiv.style.top = '80px';
        cartDiv.style.right = '40px';
        cartDiv.style.background = '#fff';
        cartDiv.style.border = '2px solid #0071f8';
        cartDiv.style.padding = '20px';
        cartDiv.style.zIndex = '9999';
        cartDiv.style.borderRadius = '16px';
        cartDiv.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        cartDiv.style.maxWidth = '450px';
        cartDiv.style.maxHeight = '500px';
        cartDiv.style.overflowY = 'auto';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.marginTop = '10px';
        closeBtn.style.marginRight = '10px';
        closeBtn.onclick = () => cartDiv.remove();
        
        const checkoutBtn = document.createElement('button');
        checkoutBtn.textContent = 'Checkout';
        checkoutBtn.style.marginTop = '10px';
        checkoutBtn.style.background = '#0071f8';
        checkoutBtn.style.color = 'white';
        checkoutBtn.style.border = 'none';
        checkoutBtn.style.padding = '8px 16px';
        checkoutBtn.style.borderRadius = '4px';
        checkoutBtn.onclick = () => {
            this.processCheckout(totalPrice);
            cartDiv.remove();
        };
        
        cartDiv.appendChild(closeBtn);
        cartDiv.appendChild(checkoutBtn);
        document.body.appendChild(cartDiv);
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.saveCart();
        this.updateCartCount();
        // Refresh cart display
        document.querySelector('div[style*="position: fixed"]')?.remove();
        if (this.cart.length > 0) {
            this.showCart();
        }
    }

    increaseQuantity(index) {
        if (this.cart[index]) {
            if (!this.cart[index].quantity) {
                this.cart[index].quantity = 1;
            }
            this.cart[index].quantity++;
            this.saveCart();
            this.updateCartCount();
            // Refresh cart display
            document.querySelector('div[style*="position: fixed"]')?.remove();
            this.showCart();
        }
    }

    decreaseQuantity(index) {
        if (this.cart[index]) {
            if (!this.cart[index].quantity) {
                this.cart[index].quantity = 1;
            }
            if (this.cart[index].quantity > 1) {
                this.cart[index].quantity--;
                this.saveCart();
                this.updateCartCount();
                // Refresh cart display
                document.querySelector('div[style*="position: fixed"]')?.remove();
                this.showCart();
            } else {
                // If quantity is 1, remove the item completely
                this.removeFromCart(index);
            }
        }
    }

    async processCheckout(totalPrice) {
        try {
            console.log('🛒 Processing checkout...');
            
            // Show loading message
            const loadingDiv = document.createElement('div');
            loadingDiv.innerHTML = '<div style="text-align: center; padding: 20px; background: white; border: 2px solid #0071f8; border-radius: 16px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000;"><h3>Processing Order...</h3><p>Please wait while we process your order.</p></div>';
            document.body.appendChild(loadingDiv);

            // Prepare order data
            const orderData = {
                customer_id: 'guest_' + Date.now(), // Generate guest customer ID
                items: this.cart.map(item => ({
                    game_id: item.id,
                    game_name: item.title,
                    quantity: item.quantity || 1,
                    unit_price: item.price,
                    discount_price: null,
                    total_price: (item.quantity || 1) * item.price
                })),
                payment_method: 'credit_card',
                order_notes: 'Web checkout order'
            };

            // Create the order via API
            const response = await fetch('http://localhost:3001/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            loadingDiv.remove();

            if (response.ok) {
                const result = await response.json();
                
                // Clear the cart after successful order
                this.cart = [];
                this.saveCart();
                this.updateCartCount();
                
                // Show success message
                alert(`✅ Order placed successfully!\n\nOrder ID: ${result.data.order_id}\nTotal: $${totalPrice.toFixed(2)}\n\nThank you for your purchase!`);
                
                // Track analytics event
                if (window.lugxAnalytics) {
                    window.lugxAnalytics.trackPurchaseEvent(result.data.order_id, totalPrice, this.cart.length);
                }
                
                console.log('✅ Order created successfully:', result);
            } else {
                throw new Error('Failed to create order');
            }
            
        } catch (error) {
            console.error('❌ Checkout failed:', error);
            
            // Remove loading if still present
            document.querySelector('div[style*="Processing Order"]')?.remove();
            
            // Show error message but keep cart intact
            alert(`❌ Checkout failed: ${error.message}\n\nPlease try again or contact support.\nYour cart items have been preserved.`);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Game Loader...');
    // Create global gameLoader instance
    window.gameLoader = new GameLoader();
    window.gameLoader.loadCart();
    window.gameLoader.loadGames();
    
    // Add test function to global scope for debugging
    window.testCart = function() {
        const testGame = {
            id: 999,
            title: "Test Game",
            price: 29.99,
            category: "Test"
        };
        console.log('🧪 Testing cart with:', testGame);
        window.gameLoader.addGameToCart(testGame);
    };
    
    console.log('🧪 Added window.testCart() function - you can test cart in console');
    
    // Add filter click handlers
    document.querySelectorAll('.trending-filter a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.trending-filter a').forEach(l => l.classList.remove('is_active'));
            this.classList.add('is_active');
            const filter = this.getAttribute('data-filter');
            window.gameLoader.filterGames(filter === '*' ? '*' : filter.replace('.', ''));
        });
    });
    
    // Setup cart view button click handler - check for both IDs
    const cartViewBtn = document.getElementById('view-cart-btn') || document.getElementById('cart-button');
    if (cartViewBtn) {
        cartViewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🛒 Cart button clicked');
            window.gameLoader.showCart();
        });
        
        // Update cart count display
        window.gameLoader.updateCartCount();
    } else {
        console.log('❌ Cart button not found');
    }
    
    // Also look for any "Add to Cart" buttons and set up their handlers
    function setupCartButtons() {
        console.log('🛒 Setting up cart buttons...');
        
        // Handle traditional Add to Cart buttons
        document.querySelectorAll('button').forEach(btn => {
            if (btn.textContent === 'Add to Cart') {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const gameId = this.getAttribute('data-game-id');
                    if (gameId) {
                        window.gameLoader.addToCart(parseInt(gameId));
                    }
                });
            }
        });
        
        // Handle shopping bag icon buttons
        const cartButtons = document.querySelectorAll('.add-to-cart-btn');
        console.log(`🛒 Found ${cartButtons.length} cart buttons`);
        
        // Also handle product details page button
        const productCartBtn = document.getElementById('add-to-cart-product');
        if (productCartBtn) {
            console.log('🛒 Found product details cart button');
            productCartBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🛒 Product details cart button clicked!');
                
                const gameId = this.getAttribute('data-game-id');
                const gameTitle = this.getAttribute('data-game-title');
                const gamePrice = parseFloat(this.getAttribute('data-game-price'));
                
                console.log(`🎮 Product Game data: ID=${gameId}, Title=${gameTitle}, Price=${gamePrice}`);
                
                if (gameId && gameTitle && gamePrice) {
                    const game = {
                        id: parseInt(gameId),
                        title: gameTitle,
                        price: gamePrice,
                        category: document.getElementById('game-genre')?.textContent || 'Unknown'
                    };
                    
                    console.log('🛒 About to add product game to cart:', game);
                    window.gameLoader.addGameToCart(game);
                    console.log(`✅ Finished adding ${gameTitle} from product page`);
                } else {
                    console.error('❌ Missing product game data attributes:', {gameId, gameTitle, gamePrice});
                }
            });
        }
        
        cartButtons.forEach((btn, index) => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log(`🛒 Shopping bag button ${index + 1} clicked!`);
                
                const gameId = this.getAttribute('data-game-id');
                const gameTitle = this.getAttribute('data-game-title');
                const gamePrice = parseFloat(this.getAttribute('data-game-price'));
                
                console.log(`🎮 Game data: ID=${gameId}, Title=${gameTitle}, Price=${gamePrice}`);
                
                if (gameId && gameTitle && gamePrice) {
                    // Create a game object for cart
                    const game = {
                        id: parseInt(gameId),
                        title: gameTitle,
                        price: gamePrice,
                        category: this.closest('.down-content').querySelector('.category').textContent
                    };
                    
                    console.log('🛒 About to add game to cart:', game);
                    
                    // Add to cart using the game object
                    window.gameLoader.addGameToCart(game);
                    console.log(`✅ Finished adding ${gameTitle} to cart for $${gamePrice}`);
                } else {
                    console.error('❌ Missing game data attributes:', {gameId, gameTitle, gamePrice});
                }
            });
        });
        
        console.log(`✅ Set up ${cartButtons.length} cart buttons`);
    }
    
    // Set up buttons immediately
    setupCartButtons();
    
    // Also set up buttons again after a short delay to catch any dynamically loaded content
    setTimeout(setupCartButtons, 500);
});
