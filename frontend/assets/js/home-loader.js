/**
 * LUGX Gaming Platform - Home Page Game Loader
 * Loads featured games on the home page
 */

class HomeGameLoader {
    constructor() {
        this.games = [
            {
                id: 'call-of-duty',
                title: 'Call of Duty: Modern Warfare II',
                price: { original: 59.99, sale: 39.99 },
                image: 'assets/images/featured-01.png',
                category: 'Action'
            },
            {
                id: 'fifa-24',
                title: 'FIFA 24',
                price: { original: 69.99, sale: 49.99 },
                image: 'assets/images/featured-02.png',
                category: 'Sports'
            },
            {
                id: 'gta-v',
                title: 'Grand Theft Auto V',
                price: { original: 29.99, sale: 19.99 },
                image: 'assets/images/featured-03.png',
                category: 'Action'
            },
            {
                id: 'forza-horizon',
                title: 'Forza Horizon 5',
                price: { original: 59.99, sale: 34.99 },
                image: 'assets/images/featured-04.png',
                category: 'Racing'
            }
        ];
        
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.loadFeaturedGames();
            this.loadTrendingGames();
            this.setupEventListeners();
        });
    }

    loadFeaturedGames() {
        const featuredContainer = document.querySelector('.most-popular .row');
        if (!featuredContainer) return;

        // Clear existing content but keep the first header column
        const children = Array.from(featuredContainer.children);
        children.forEach((child, index) => {
            if (index > 0) { // Keep the first column with the header
                child.remove();
            }
        });

        // Add featured games
        this.games.forEach((game, index) => {
            const gameElement = this.createFeaturedGameElement(game, index);
            featuredContainer.appendChild(gameElement);
        });
    }

    loadTrendingGames() {
        const trendingItems = document.querySelectorAll('.trending-item h4, .item h4');
        trendingItems.forEach((item, index) => {
            const game = this.games[index % this.games.length];
            item.textContent = game.title;
            
            // Update the parent link if it exists
            const link = item.closest('.item')?.querySelector('a');
            if (link) {
                link.href = `product-details.html?game=${game.id}`;
                
                // Track click
                link.addEventListener('click', () => {
                    if (window.lugxAnalytics) {
                        window.lugxAnalytics.trackEvent('game_click', {
                            game_id: game.id,
                            game_title: game.title,
                            location: 'home_trending'
                        });
                    }
                });
            }
        });
    }

    createFeaturedGameElement(game, index) {
        const isRightAligned = index % 2 === 1;
        const colClass = isRightAligned ? 'col-lg-6 col-md-6 align-self-center mobile-bottom-fix-big' : 'col-lg-6 col-md-6 align-self-center mobile-bottom-fix-big';
        
        const div = document.createElement('div');
        div.className = colClass;
        
        div.innerHTML = `
            <div class="left-content">
                <div class="thumb">
                    <div class="inner-content">
                        <h4>${game.title}</h4>
                        <span>$${game.price.sale}</span>
                        <div class="main-border-button">
                            <a href="product-details.html?game=${game.id}">Purchase Now!</a>
                        </div>
                    </div>
                    <img src="${game.image}" alt="${game.title}">
                </div>
            </div>
        `;

        // Add click tracking
        const purchaseLink = div.querySelector('a');
        purchaseLink.addEventListener('click', () => {
            if (window.lugxAnalytics) {
                window.lugxAnalytics.trackEvent('game_click', {
                    game_id: game.id,
                    game_title: game.title,
                    location: 'home_featured'
                });
            }
        });

        return div;
    }

    setupEventListeners() {
        // Track banner interactions
        const bannerButton = document.querySelector('.main-banner .main-border-button a');
        if (bannerButton) {
            bannerButton.addEventListener('click', () => {
                if (window.lugxAnalytics) {
                    window.lugxAnalytics.trackEvent('banner_click', {
                        location: 'home_banner'
                    });
                }
            });
        }

        // Track category clicks
        const categoryLinks = document.querySelectorAll('.categories .item a');
        categoryLinks.forEach(link => {
            link.addEventListener('click', () => {
                const categoryName = link.querySelector('h4')?.textContent || 'Unknown';
                if (window.lugxAnalytics) {
                    window.lugxAnalytics.trackEvent('category_click', {
                        category: categoryName,
                        location: 'home_categories'
                    });
                }
            });
        });
    }
}

// Initialize the home game loader
new HomeGameLoader();
