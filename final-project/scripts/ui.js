// UI Management and Rendering
class UIManager {
    constructor() {
        this.currentPage = 'home';
        this.currentMoviePage = 1;
        this.currentDiscoverPage = 1;
        this.hasMoreMovies = true;
    }

    // Page Navigation
    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update active nav link
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === pageId) {
                link.classList.add('active');
            }
        });

        this.currentPage = pageId;

        // Load page-specific content
        this.loadPageContent(pageId);
    }

    loadPageContent(pageId) {
        switch (pageId) {
            case 'home':
                this.loadHomePage();
                break;
            case 'discover':
                this.loadDiscoverPage();
                break;
            case 'watchlist':
                this.loadWatchlistPage();
                break;
            case 'profile':
                this.loadProfilePage();
                break;
        }
    }

    // Home Page
    async loadHomePage() {
        await this.loadFeaturedMovies();
        await this.loadRecommendedMovies();
    }

    async loadFeaturedMovies() {
        const container = document.getElementById('featuredMovies');
        if (!container) return;

        this.showLoading(container);

        try {
            const data = await api.getPopularMovies(1);
            this.renderMoviesGrid(container, data.results.slice(0, 6));
        } catch (error) {
            this.showError(container, 'Failed to load featured movies');
        }
    }

    async loadRecommendedMovies() {
        const container = document.getElementById('recommendedMovies');
        if (!container) return;

        this.showLoading(container);

        try {
            const currentUser = storage.getCurrentUser();
            let movies;

            if (currentUser) {
                // In a real app, this would use user preferences
                const preferences = storage.getPreferences(currentUser.username);
                movies = await api.discoverMovies({
                    genres: preferences.favoriteGenres,
                    ratingFrom: preferences.minRating
                });
            } else {
                movies = await api.getPopularMovies(2);
            }

            this.renderMoviesGrid(container, movies.results.slice(0, 8));
        } catch (error) {
            this.showError(container, 'Failed to load recommendations');
        }
    }

    // Discover Page
    async loadDiscoverPage() {
        await this.loadGenreFilters();
        await this.loadDiscoverMovies();
    }

    async loadGenreFilters() {
        const container = document.getElementById('genreFilters');
        if (!container) return;

        try {
            const data = await api.getGenres();
            const genres = data.genres;

            container.innerHTML = genres.map(genre => `
                <label class="filter-option">
                    <input type="checkbox" value="${genre.id}" data-genre="${genre.name}">
                    <span>${genre.name}</span>
                </label>
            `).join('');
        } catch (error) {
            console.error('Failed to load genres:', error);
        }
    }

    async loadDiscoverMovies(filters = {}, reset = true) {
        const container = document.getElementById('discoverMovies');
        if (!container) return;

        if (reset) {
            this.currentDiscoverPage = 1;
            this.hasMoreMovies = true;
            this.showLoading(container);
        }

        try {
            const data = await api.discoverMovies(filters, this.currentDiscoverPage);
            
            if (reset) {
                container.innerHTML = '';
            }

            if (data.results.length === 0) {
                this.showEmptyState(container, 'No movies found matching your criteria');
                this.hasMoreMovies = false;
            } else {
                this.renderMoviesGrid(container, data.results, !reset);
                this.hasMoreMovies = data.results.length === 20; // Assuming 20 per page
            }

            this.updateLoadMoreButton();
        } catch (error) {
            this.showError(container, 'Failed to load movies');
        }
    }

    // Watchlist Page
    async loadWatchlistPage() {
        const container = document.getElementById('watchlistMovies');
        const emptyState = document.getElementById('emptyWatchlist');
        
        if (!container) return;

        const currentUser = storage.getCurrentUser();
        if (!currentUser) {
            this.showEmptyState(container, 'Please login to view your watchlist');
            return;
        }

        const watchlist = storage.getWatchlist(currentUser.username);
        
        if (watchlist.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            container.classList.remove('hidden');
            emptyState.classList.add('hidden');
            this.renderMoviesGrid(container, watchlist);
        }
    }

    // Profile Page
    loadProfilePage() {
        const currentUser = storage.getCurrentUser();
        
        if (!currentUser) {
            // Redirect to home if not logged in
            this.showPage('home');
            return;
        }

        this.updateProfileDisplay(currentUser);
    }

    updateProfileDisplay(user) {
        // Update basic info
        document.getElementById('profileUsername').textContent = user.username;

        // Update stats
        const watchlist = storage.getWatchlist(user.username);
        const history = storage.getHistory(user.username);
        
        document.getElementById('watchedCount').textContent = history.length;
        document.getElementById('watchlistCount').textContent = watchlist.length;
        document.getElementById('reviewsCount').textContent = this.getUserReviewsCount(user.username);

        // Update preferences
        this.updatePreferencesDisplay(user.username);
    }

    getUserReviewsCount(username) {
        // This would need to scan all movies for reviews by this user
        // For simplicity, we'll return a mock count
        return Math.floor(Math.random() * 20);
    }

    updatePreferencesDisplay(username) {
        const preferences = storage.getPreferences(username);
        
        const genresContainer = document.getElementById('favoriteGenres');
        const languagesContainer = document.getElementById('preferredLanguages');

        if (genresContainer) {
            genresContainer.innerHTML = preferences.favoriteGenres.map(genreId => {
                const genreName = this.getGenreName(genreId);
                return `<span class="preference-tag">${genreName}</span>`;
            }).join('') || '<span class="preference-tag">No preferences set</span>';
        }

        if (languagesContainer) {
            const languageNames = {
                'en': 'English',
                'es': 'Spanish',
                'fr': 'French',
                'de': 'German',
                'ja': 'Japanese',
                'ko': 'Korean'
            };
            
            languagesContainer.innerHTML = preferences.preferredLanguages.map(lang => 
                `<span class="preference-tag">${languageNames[lang] || lang}</span>`
            ).join('');
        }
    }

    getGenreName(genreId) {
        const genres = {
            28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
            80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
            14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
            9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
            10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
        };
        return genres[genreId] || 'Unknown';
    }

    // Movie Grid Rendering
    renderMoviesGrid(container, movies, append = false) {
        if (!append) {
            container.innerHTML = '';
        }

        const currentUser = storage.getCurrentUser();
        const watchlist = currentUser ? storage.getWatchlist(currentUser.username) : [];

        movies.forEach(movie => {
            const movieElement = this.createMovieCard(movie, watchlist);
            container.appendChild(movieElement);
        });
    }

    createMovieCard(movie, watchlist = []) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.movieId = movie.id;

        const isInWatchlist = watchlist.some(m => m.id === movie.id);
        const watchlistBtnText = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
        const watchlistBtnIcon = isInWatchlist ? 'fa-check' : 'fa-plus';

        card.innerHTML = `
            <img src="${api.getPosterUrl(movie.poster_path)}" alt="${movie.title}" class="movie-poster" onerror="this.src='./images/placeholder-poster.jpg'">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span class="movie-year">${movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'}</span>
                    <span class="movie-rating">
                        <i class="fas fa-star"></i>
                        ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                    </span>
                </div>
                <p class="movie-overview">${movie.overview || 'No description available.'}</p>
                <div class="movie-actions">
                    <button class="action-btn view-details" data-movie-id="${movie.id}">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button class="action-btn watchlist-btn ${isInWatchlist ? 'in-watchlist' : ''}" data-movie-id="${movie.id}">
                        <i class="fas ${watchlistBtnIcon}"></i> ${watchlistBtnText}
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    // Movie Detail Modal
    async showMovieDetail(movieId) {
        const modal = document.getElementById('movieModal');
        const container = document.getElementById('movieDetail');
        
        if (!modal || !container) return;

        this.showLoading(container);
        modal.classList.remove('hidden');

        try {
            const movie = await api.getMovieDetails(movieId);
            this.renderMovieDetail(container, movie);
            
            // Add to viewing history if user is logged in
            const currentUser = storage.getCurrentUser();
            if (currentUser) {
                storage.addToHistory(currentUser.username, movie);
            }
        } catch (error) {
            this.showError(container, 'Failed to load movie details');
        }
    }

    renderMovieDetail(container, movie) {
        const currentUser = storage.getCurrentUser();
        const isInWatchlist = currentUser ? storage.isInWatchlist(currentUser.username, movie.id) : false;
        const watchlistBtnText = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';

        const genres = movie.genres ? movie.genres.map(g => g.name).join(', ') : 'Unknown';
        const directors = movie.credits ? movie.credits.crew.filter(p => p.job === 'Director').map(p => p.name).join(', ') : 'Unknown';
        const cast = movie.credits ? movie.credits.cast.slice(0, 5).map(p => p.name).join(', ') : 'Unknown';

        container.innerHTML = `
            <div class="movie-detail-header">
                <img src="${api.getPosterUrl(movie.poster_path, 'w500')}" alt="${movie.title}" class="movie-detail-poster" onerror="this.src='./images/placeholder-poster.jpg'">
                <div class="movie-detail-info">
                    <h1>${movie.title}</h1>
                    <div class="movie-detail-meta">
                        <span class="movie-detail-rating">
                            <i class="fas fa-star"></i>
                            ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                        </span>
                        <span>${movie.runtime ? `${movie.runtime} min` : 'N/A'}</span>
                        <span>${movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'}</span>
                        <span>${genres}</span>
                    </div>
                    <p class="movie-detail-overview">${movie.overview || 'No description available.'}</p>
                    
                    <div class="movie-detail-credits">
                        <p><strong>Director:</strong> ${directors}</p>
                        <p><strong>Cast:</strong> ${cast}</p>
                    </div>

                    <div class="movie-detail-actions">
                        <button class="btn btn-primary watch-trailer" data-movie-id="${movie.id}">
                            <i class="fas fa-play"></i> Watch Trailer
                        </button>
                        <button class="btn btn-secondary watchlist-toggle ${isInWatchlist ? 'in-watchlist' : ''}" data-movie-id="${movie.id}">
                            <i class="fas ${isInWatchlist ? 'fa-check' : 'fa-plus'}"></i> ${watchlistBtnText}
                        </button>
                        <button class="btn btn-secondary share-movie" data-movie-id="${movie.id}">
                            <i class="fas fa-share"></i> Share
                        </button>
                    </div>
                </div>
            </div>

            ${movie.similar && movie.similar.results.length > 0 ? `
                <div class="similar-movies">
                    <h2>Similar Movies</h2>
                    <div class="movies-grid" id="similarMovies">
                        ${movie.similar.results.slice(0, 4).map(similarMovie => `
                            <div class="movie-card" data-movie-id="${similarMovie.id}">
                                <img src="${api.getPosterUrl(similarMovie.poster_path)}" alt="${similarMovie.title}" class="movie-poster">
                                <div class="movie-info">
                                    <h3 class="movie-title">${similarMovie.title}</h3>
                                    <div class="movie-meta">
                                        <span class="movie-year">${similarMovie.release_date ? new Date(similarMovie.release_date).getFullYear() : 'TBA'}</span>
                                        <span class="movie-rating">
                                            <i class="fas fa-star"></i>
                                            ${similarMovie.vote_average ? similarMovie.vote_average.toFixed(1) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    // Utility Methods
    showLoading(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    }

    showError(container, message) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${message}</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }

    showEmptyState(container, message) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-film"></i>
                <h3>${message}</h3>
            </div>
        `;
    }

    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMore');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.hasMoreMovies ? 'block' : 'none';
        }
    }

    // Modal Management
    showAuthModal() {
        const modal = document.getElementById('authModal');
        modal.classList.remove('hidden');
    }

    hideAuthModal() {
        const modal = document.getElementById('authModal');
        modal.classList.add('hidden');
    }

    hideMovieModal() {
        const modal = document.getElementById('movieModal');
        modal.classList.add('hidden');
    }

    // Toggle filters on mobile
    toggleFilters() {
        const filters = document.getElementById('filtersSidebar');
        filters.classList.toggle('active');
    }

    // Update user interface based on auth state
    updateAuthUI() {
        const currentUser = storage.getCurrentUser();
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');
        const usernameDisplay = document.getElementById('usernameDisplay');

        if (currentUser) {
            loginBtn.classList.add('hidden');
            registerBtn.classList.add('hidden');
            userMenu.classList.remove('hidden');
            usernameDisplay.textContent = currentUser.username;
        } else {
            loginBtn.classList.remove('hidden');
            registerBtn.classList.remove('hidden');
            userMenu.classList.add('hidden');
        }
    }
}

// Create global instance
const ui = new UIManager();