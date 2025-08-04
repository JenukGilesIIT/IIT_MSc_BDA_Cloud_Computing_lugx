/**
 * LUGX Gaming Analytics Tracker
 * Real-time event tracking for the analytics service
 */

class LugxAnalytics {
    constructor() {
        this.analyticsUrl = '/api/analytics/events'; // Use nginx proxy
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.pageLoadTime = Date.now();
        this.serviceAvailable = false;
        this.healthCheckCompleted = false;
        
        console.log('📊 Initializing LUGX Analytics...');
        
        // Initialize analytics after checking service availability
        this.checkServiceAvailability().then(() => {
            if (this.serviceAvailable) {
                this.initializeTracking();
            }
        });
    }

    async checkServiceAvailability() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch('/api/analytics/health', { 
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    this.serviceAvailable = true;
                    this.healthCheckCompleted = true;
                    console.log('✅ Analytics service is available');
                } else {
                    this.serviceAvailable = false;
                    this.healthCheckCompleted = true;
                    console.log('⚠️ Analytics service health check failed - invalid response format');
                }
            } else {
                this.serviceAvailable = false;
                this.healthCheckCompleted = true;
                console.log('⚠️ Analytics service health check failed - service unavailable');
            }
        } catch (error) {
            this.serviceAvailable = false;
            this.healthCheckCompleted = true;
            if (error.name === 'AbortError') {
                console.log('⚠️ Analytics service offline - connection timeout');
            } else {
                console.log('⚠️ Analytics service offline - tracking disabled');
            }
        }
    }

    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        // Check for existing user ID in localStorage
        let userId = localStorage.getItem('lugx_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('lugx_user_id', userId);
        }
        return userId;
    }

    initializeTracking() {
        // Track page view on load
        this.trackPageView();
        
        // Track page unload
        window.addEventListener('beforeunload', () => {
            this.trackPageView(true); // Mark as exit page
        });

        // Track scroll depth
        this.trackScrollDepth();
        
        // Track time on page
        this.startTimeTracking();
    }

    async sendEvent(eventData) {
        // Skip if analytics service is not available
        if (!this.serviceAvailable || !this.healthCheckCompleted) {
            return;
        }
        
        try {
            // Format the event data according to the analytics service API
            const event = {
                eventType: eventData.eventType,
                userId: this.userId,
                gameId: eventData.gameId || null,
                sessionId: this.sessionId,
                metadata: {
                    ...eventData.metadata,
                    timestamp: new Date().toISOString(),
                    page: window.location.pathname,
                    userAgent: navigator.userAgent
                }
            };

            const response = await fetch(this.analyticsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Analytics event tracked:', eventData.eventType);
            } else {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.log(`⚠️ Analytics event failed (${response.status}):`, error.error || 'Service error');
                
                if (response.status >= 500) {
                    // Server error - mark service as unavailable temporarily
                    this.serviceAvailable = false;
                    setTimeout(() => {
                        this.checkServiceAvailability();
                    }, 30000); // Retry after 30 seconds
                }
            }
        } catch (error) {
            console.log('⚠️ Analytics service connection failed:', error.message);
            // Service is offline - mark as unavailable
            this.serviceAvailable = false;
            setTimeout(() => {
                this.checkServiceAvailability();
            }, 30000); // Retry after 30 seconds
        }
    }

    trackPageView(isExit = false) {
        // Don't track if service is not available or health check not completed
        if (!this.healthCheckCompleted || !this.serviceAvailable) {
            return;
        }
        
        const timeOnPage = Math.floor((Date.now() - this.pageLoadTime) / 1000);
        
        this.sendEvent({
            eventType: 'page_view',
            metadata: {
                page_url: window.location.pathname,
                page_title: document.title,
                page_category: this.getPageCategory(),
                time_on_page_seconds: timeOnPage,
                scroll_depth_percentage: this.getScrollDepth(),
                exit_page: isExit,
                bounce: timeOnPage < 10,
                previous_page: document.referrer || null,
                referrer: document.referrer || 'direct'
            }
        });
    }

    trackGameInteraction(gameId, gameTitle, gameCategory, action, additionalData = {}) {
        // Don't track if service is not available
        if (!this.healthCheckCompleted || !this.serviceAvailable) {
            return;
        }
        
        this.sendEvent({
            eventType: 'game_interaction',
            gameId: parseInt(gameId),
            metadata: {
                game_title: gameTitle,
                game_category: gameCategory,
                action: action,
                page_context: this.getPageCategory(),
                ...additionalData
            }
        });
    }

    trackSearch(query, resultsCount = 0, clickedPosition = null, clickedGameId = null) {
        // Don't track if service is not available
        if (!this.healthCheckCompleted || !this.serviceAvailable) {
            return;
        }
        
        this.sendEvent({
            eventType: 'search',
            gameId: clickedGameId,
            metadata: {
                search_query: query,
                search_category: this.getPageCategory(),
                results_count: resultsCount,
                clicked_result_position: clickedPosition,
                no_results: resultsCount === 0
            }
        });
    }

    trackPerformance(serviceName, metricType, metricValue, unit, endpoint = null, statusCode = null) {
        // Don't track if service is not available
        if (!this.healthCheckCompleted || !this.serviceAvailable) {
            return;
        }
        
        this.sendEvent({
            eventType: 'performance',
            metadata: {
                service_name: serviceName,
                metric_type: metricType,
                metric_value: metricValue,
                unit: unit,
                endpoint: endpoint,
                status_code: statusCode
            }
        });
    }

    getPageCategory() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return 'homepage';
        if (path.includes('shop')) return 'shop';
        if (path.includes('product-details')) return 'product';
        if (path.includes('contact')) return 'contact';
        return 'other';
    }

    getScrollDepth() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        return Math.min(100, Math.round((scrollTop / docHeight) * 100));
    }

    trackScrollDepth() {
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = this.getScrollDepth();
            if (currentScroll > maxScroll) {
                maxScroll = currentScroll;
            }
        });
    }

    startTimeTracking() {
        // Update time on page every 30 seconds
        setInterval(() => {
            // Only track if service is available
            if (!this.healthCheckCompleted || !this.serviceAvailable) {
                return;
            }
            
            const timeOnPage = Math.floor((Date.now() - this.pageLoadTime) / 1000);
            if (timeOnPage % 30 === 0) { // Every 30 seconds
                this.trackPageView();
            }
        }, 30000);
    }
}

// Initialize analytics when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting LUGX Analytics initialization...');
    
    // Initialize analytics
    window.lugxAnalytics = new LugxAnalytics();
    
    // Add click tracking to game elements
    document.querySelectorAll('.game-item, .featured-game, .trending-game').forEach(element => {
        element.addEventListener('click', function() {
            const gameId = this.dataset.gameId || Math.floor(Math.random() * 100) + 1;
            const gameTitle = this.querySelector('h4, .game-title')?.textContent || 'Unknown Game';
            const gameCategory = this.dataset.category || 'Gaming';
            
            window.lugxAnalytics.trackGameInteraction(gameId, gameTitle, gameCategory, 'click', {
                element_type: 'game_item',
                position: Array.from(this.parentNode.children).indexOf(this) + 1
            });
        });
    });
    
    // Add search tracking
    const searchInputs = document.querySelectorAll('input[type="search"], input[name="search"], .search-input');
    searchInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    // Simulate search results count (in real app, this would come from actual search)
                    const resultsCount = Math.floor(Math.random() * 20) + 1;
                    window.lugxAnalytics.trackSearch(query, resultsCount);
                }
            }
        });
    });
    
    // Track performance metrics
    window.addEventListener('load', function() {
        const loadTime = Date.now() - performance.navigationStart;
        window.lugxAnalytics.trackPerformance('frontend', 'page_load_time', loadTime, 'ms', window.location.pathname);
    });
});
