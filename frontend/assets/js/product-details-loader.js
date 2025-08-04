// LUGX Gaming - Product Details Loader
// This script loads specific game details based on URL parameters

class ProductDetailsLoader {
    constructor() {
        this.gameDetails = {
            1: {
                title: "Call of Duty: Modern Warfare",
                genre: "Action",
                price: 59.99,
                originalPrice: 79.99,
                description: "Experience the ultimate online playground with classic multiplayer, or squad-up and play cooperatively in a collection of elite operations accessible to all skill levels.",
                features: ["Multiplayer", "Campaign", "Cross-platform", "4K Support"],
                rating: 4.5,
                image: "assets/images/single-game.jpg"
            },
            2: {
                title: "FIFA 24",
                genre: "Sports",
                price: 49.99,
                originalPrice: 69.99,
                description: "FIFA 24 brings The World's Game to the pitch, with HyperMotionV technology that delivers the most realistic gameplay experience.",
                features: ["Ultimate Team", "Career Mode", "Online Seasons", "Volta Football"],
                rating: 4.2,
                image: "assets/images/single-game.jpg"
            },
            3: {
                title: "Grand Theft Auto V",
                genre: "Action",
                price: 29.99,
                originalPrice: 59.99,
                description: "Experience Rockstar Games' critically acclaimed open world game, Grand Theft Auto V. Play as three unique criminals in the city of Los Santos.",
                features: ["Open World", "Online Mode", "Heists", "Custom Characters"],
                rating: 4.8,
                image: "assets/images/single-game.jpg"
            },
            4: {
                title: "Forza Horizon 5",
                genre: "Racing",
                price: 39.99,
                originalPrice: 59.99,
                description: "Your greatest Horizon Adventure awaits! Explore the vibrant and ever-evolving open world landscapes of Mexico with limitless, fun driving action.",
                features: ["Open World Racing", "Online Co-op", "Car Customization", "Dynamic Weather"],
                rating: 4.6,
                image: "assets/images/single-game.jpg"
            }
        };
    }

    loadProductDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('id') || '1';
        
        const game = this.gameDetails[gameId] || this.gameDetails['1'];
        
        console.log(`🎮 Loading details for game ${gameId}:`, game.title);
        
        // Update page elements
        this.updatePageContent(game);
    }

    updatePageContent(game) {
        // Update breadcrumb
        const breadcrumbElement = document.getElementById('breadcrumb-game');
        if (breadcrumbElement) {
            breadcrumbElement.textContent = game.title;
        }

        // Update title using ID
        const titleElement = document.getElementById('game-title');
        if (titleElement) {
            titleElement.textContent = game.title;
        }

        // Update description using ID
        const descElement = document.getElementById('game-description');
        if (descElement) {
            descElement.textContent = game.description;
        }

        // Update Game ID
        const gameIdElement = document.getElementById('game-id');
        if (gameIdElement) {
            gameIdElement.textContent = game.title.substring(0, 3).toUpperCase() + game.genre.substring(0, 2).toUpperCase() + String(game.price).replace('.', '');
        }

        // Update Genre
        const genreElement = document.getElementById('game-genre');
        if (genreElement) {
            genreElement.textContent = game.genre;
        }

        // Update multi-tags
        const tagsElement = document.getElementById('game-tags');
        if (tagsElement) {
            tagsElement.textContent = game.features.join(', ');
        }

        // Update price
        const priceElements = document.querySelectorAll('.price em, .price');
        priceElements.forEach(el => {
            if (el.tagName === 'EM') {
                el.textContent = `$${game.originalPrice}`;
            } else if (el.classList.contains('price')) {
                el.innerHTML = game.originalPrice ? 
                    `<em>$${game.originalPrice}</em>$${game.price}` : 
                    `$${game.price}`;
            }
        });

        // Update category elements
        const categoryElements = document.querySelectorAll('.category');
        categoryElements.forEach(el => {
            el.textContent = game.genre;
        });

        // Update ADD TO CART button data
        const addToCartBtn = document.getElementById('add-to-cart-product');
        if (addToCartBtn) {
            addToCartBtn.setAttribute('data-game-id', gameId);
            addToCartBtn.setAttribute('data-game-title', game.title);
            addToCartBtn.setAttribute('data-game-price', game.price);
            console.log('✅ ADD TO CART button updated with game data');
        }

        console.log('✅ Product details updated');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Product Details Loader...');
    const productLoader = new ProductDetailsLoader();
    productLoader.loadProductDetails();
});
