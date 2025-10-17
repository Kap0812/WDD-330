// Local Storage Management
class StorageManager {
    constructor() {
        this.usersKey = 'moviesphere_users';
        this.currentUserKey = 'moviesphere_current_user';
        this.watchlistKey = 'moviesphere_watchlist_';
        this.historyKey = 'moviesphere_history_';
        this.preferencesKey = 'moviesphere_preferences_';
    }

    // User Management
    getUsers() {
        return JSON.parse(localStorage.getItem(this.usersKey)) || [];
    }

    saveUsers(users) {
        localStorage.setItem(this.usersKey, JSON.stringify(users));
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem(this.currentUserKey));
    }

    setCurrentUser(user) {
        localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    }

    clearCurrentUser() {
        localStorage.removeItem(this.currentUserKey);
    }

    // Watchlist Management
    getWatchlist(username) {
        const key = this.watchlistKey + username;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    addToWatchlist(username, movie) {
        const key = this.watchlistKey + username;
        const watchlist = this.getWatchlist(username);
        
        // Check if movie already exists
        if (!watchlist.find(m => m.id === movie.id)) {
            watchlist.push(movie);
            localStorage.setItem(key, JSON.stringify(watchlist));
            return true;
        }
        return false;
    }

    removeFromWatchlist(username, movieId) {
        const key = this.watchlistKey + username;
        const watchlist = this.getWatchlist(username);
        const updatedWatchlist = watchlist.filter(m => m.id !== movieId);
        localStorage.setItem(key, JSON.stringify(updatedWatchlist));
        return updatedWatchlist;
    }

    isInWatchlist(username, movieId) {
        const watchlist = this.getWatchlist(username);
        return watchlist.some(m => m.id === movieId);
    }

    // Viewing History
    getHistory(username) {
        const key = this.historyKey + username;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    addToHistory(username, movie) {
        const key = this.historyKey + username;
        const history = this.getHistory(username);
        
        // Remove if already exists (to update timestamp)
        const filteredHistory = history.filter(m => m.id !== movie.id);
        
        // Add with current timestamp
        movie.viewedAt = new Date().toISOString();
        filteredHistory.unshift(movie);
        
        // Keep only last 100 entries
        const updatedHistory = filteredHistory.slice(0, 100);
        localStorage.setItem(key, JSON.stringify(updatedHistory));
        
        return updatedHistory;
    }

    // User Preferences
    getPreferences(username) {
        const key = this.preferencesKey + username;
        return JSON.parse(localStorage.getItem(key)) || {
            favoriteGenres: [],
            preferredLanguages: ['en'],
            minRating: 6,
            adultContent: false
        };
    }

    savePreferences(username, preferences) {
        const key = this.preferencesKey + username;
        localStorage.setItem(key, JSON.stringify(preferences));
    }

    // Reviews Management
    getReviews(movieId) {
        const key = `moviesphere_reviews_${movieId}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    addReview(movieId, review) {
        const key = `moviesphere_reviews_${movieId}`;
        const reviews = this.getReviews(movieId);
        
        review.id = Date.now().toString();
        review.createdAt = new Date().toISOString();
        reviews.push(review);
        
        localStorage.setItem(key, JSON.stringify(reviews));
        return review;
    }

    // Cache Management for API responses
    setCache(key, data, ttl = 3600000) { // 1 hour default
        const cache = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(cache));
    }

    getCache(key) {
        const cached = localStorage.getItem(`cache_${key}`);
        if (!cached) return null;

        const cache = JSON.parse(cached);
        const isExpired = Date.now() - cache.timestamp > cache.ttl;

        if (isExpired) {
            localStorage.removeItem(`cache_${key}`);
            return null;
        }

        return cache.data;
    }

    // Clear all data (for testing/debugging)
    clearAll() {
        const keysToKeep = [this.usersKey, this.currentUserKey];
        Object.keys(localStorage).forEach(key => {
            if (!keysToKeep.some(keepKey => key.startsWith(keepKey.replace('_', '')))) {
                localStorage.removeItem(key);
            }
        });
    }
}

// Create global instance
const storage = new StorageManager();