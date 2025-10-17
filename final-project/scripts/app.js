// Main Application Controller
class MovieSphereApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeApp();
    }

    initializeApp() {
        // Check authentication status
        this.currentUser = storage.getCurrentUser();
        
        // Load initial content
        ui.loadHomePage();
        
        // Update UI based on auth state
        ui.updateAuthUI();

        console.log('MovieSphere initialized successfully');
    }

    setupEventListeners() {
        // Navigation
        this.setupNavigation();

        // Search functionality
        this.setupSearch();

        // Movie interactions
        this.setupMovieInteractions();

        // Filters and discovery
        this.setupFilters();

        // Mood-based recommendations
        this.setupMoodButtons();

        // Modal controls
        this.setupModalControls();

        // Mobile menu
        this.setupMobileMenu();
    }

    setupNavigation() {
        // Desktop navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                ui.showPage(page);
            });
        });

        // Mobile navigation
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                ui.showPage(page);
                this.toggleMobileMenu();
            });
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        let searchTimeout;

        // Real-time search with debouncing
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    this.performSearch(query);
                }, 500);
            }
        });

        // Search button click
        searchBtn?.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                this.performSearch(query);
            }
        });

        // Enter key support
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    this.performSearch(query);
                }
            }
        });
    }

    async performSearch(query) {
        // Switch to discover page for search results
        ui.showPage('discover');
        
        // Show loading state
        const container = document.getElementById('discoverMovies');
        ui.showLoading(container);

        try {
            const data = await api.searchMovies(query);
            ui.renderMoviesGrid(container, data.results);
            ui.hasMoreMovies = data.results.length === 20;
            ui.updateLoadMoreButton();
        } catch (error) {
            ui.showError(container, 'Search failed. Please try again.');
        }
    }

    setupMovieInteractions() {
        // Event delegation for movie cards
        document.addEventListener('click', (e) => {
            // View details
            if (e.target.closest('.view-details') || e.target.closest('.movie-card:not(.movie-actions *)')) {
                const movieId = e.target.closest('[data-movie-id]').dataset.movieId;
                ui.showMovieDetail(parseInt(movieId));
            }

            // Watchlist toggle
            if (e.target.closest('.watchlist-btn') || e.target.closest('.watchlist-toggle')) {
                e.stopPropagation();
                const movieId = e.target.closest('[data-movie-id]').dataset.movieId;
                this.toggleWatchlist(parseInt(movieId));
            }

            // Watch trailer
            if (e.target.closest('.watch-trailer')) {
                e.stopPropagation();
                const movieId = e.target.closest('[data-movie-id]').dataset.movieId;
                this.watchTrailer(parseInt(movieId));
            }

            // Share movie
            if (e.target.closest('.share-movie')) {
                e.stopPropagation();
                const movieId = e.target.closest('[data-movie-id]').dataset.movieId;
                this.shareMovie(parseInt(movieId));
            }
        });
    }

    async toggleWatchlist(movieId) {
        const currentUser = storage.getCurrentUser();
        
        if (!currentUser) {
            auth.showAuthModal();
            return;
        }

        try {
            const movie = await api.getMovieDetails(movieId);
            let isInWatchlist = storage.isInWatchlist(currentUser.username, movieId);

            if (isInWatchlist) {
                storage.removeFromWatchlist(currentUser.username, movieId);
                auth.showNotification('Removed from watchlist', 'info');
            } else {
                storage.addToWatchlist(currentUser.username, movie);
                auth.showNotification('Added to watchlist', 'success');
            }

            // Update UI
            this.updateWatchlistUI(movieId, !isInWatchlist);
            
            // Reload watchlist page if active
            if (ui.currentPage === 'watchlist') {
                ui.loadWatchlistPage();
            }

        } catch (error) {
            console.error('Watchlist toggle error:', error);
            auth.showNotification('Failed to update watchlist', 'error');
        }
    }

    updateWatchlistUI(movieId, added) {
        // Update all watchlist buttons for this movie
        const buttons = document.querySelectorAll(`[data-movie-id="${movieId}"] .watchlist-btn, [data-movie-id="${movieId}"] .watchlist-toggle`);
        
        buttons.forEach(button => {
            if (added) {
                button.innerHTML = '<i class="fas fa-check"></i> Remove from Watchlist';
                button.classList.add('in-watchlist');
            } else {
                button.innerHTML = '<i class="fas fa-plus"></i> Add to Watchlist';
                button.classList.remove('in-watchlist');
            }
        });
    }

    async watchTrailer(movieId) {
        try {
            const movie = await api.getMovieDetails(movieId);
            const trailerData = await api.searchTrailer(movie.title);
            
            if (trailerData && trailerData.items && trailerData.items.length > 0) {
                const videoId = trailerData.items[0].id.videoId;
                this.showTrailerModal(videoId);
            } else {
                auth.showNotification('No trailer available for this movie', 'info');
            }
        } catch (error) {
            console.error('Trailer error:', error);
            auth.showNotification('Failed to load trailer', 'error');
        }
    }

    showTrailerModal(videoId) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 2rem;
        `;

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; width: 100%; position: relative;">
                <button class="modal-close" style="position: absolute; top: -40px; right: 0; background: var(--danger);">
                    <i class="fas fa-times"></i>
                </button>
                <div style="position: relative; padding-bottom: 56.25%; height: 0;">
                    <iframe 
                        src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                        allow="autoplay; encrypted-media" 
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close functionality
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    shareMovie(movieId) {
        // Simple share implementation
        if (navigator.share) {
            navigator.share({
                title: 'Check out this movie on MovieSphere!',
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                auth.showNotification('Link copied to clipboard!', 'success');
            });
        }
    }

    setupFilters() {
        const applyFiltersBtn = document.getElementById('applyFilters');
        const resetFiltersBtn = document.getElementById('resetFilters');
        const filterToggle = document.getElementById('filterToggle');

        applyFiltersBtn?.addEventListener('click', () => {
            const filters = this.getCurrentFilters();
            ui.loadDiscoverMovies(filters, true);
            
            // Close filters on mobile
            if (window.innerWidth <= 768) {
                ui.toggleFilters();
            }
        });

        resetFiltersBtn?.addEventListener('click', () => {
            this.resetFilters();
            ui.loadDiscoverMovies({}, true);
        });

        filterToggle?.addEventListener('click', () => {
            ui.toggleFilters();
        });

        // Load more functionality
        const loadMoreBtn = document.getElementById('loadMore');
        loadMoreBtn?.addEventListener('click', () => {
            this.loadMoreMovies();
        });
    }

    getCurrentFilters() {
        const filters = {};

        // Get selected genres
        const genreCheckboxes = document.querySelectorAll('#genreFilters input:checked');
        if (genreCheckboxes.length > 0) {
            filters.genres = Array.from(genreCheckboxes).map(cb => parseInt(cb.value));
        }

        // Get year range
        const yearFrom = document.getElementById('yearFrom').value;
        const yearTo = document.getElementById('yearTo').value;
        if (yearFrom) filters.yearFrom = yearFrom;
        if (yearTo) filters.yearTo = yearTo;

        // Get rating range
        const ratingFrom = document.getElementById('ratingFrom').value;
        const ratingTo = document.getElementById('ratingTo').value;
        if (ratingFrom) filters.ratingFrom = parseFloat(ratingFrom);
        if (ratingTo) filters.ratingTo = parseFloat(ratingTo);

        return filters;
    }

    resetFilters() {
        // Uncheck all genre filters
        document.querySelectorAll('#genreFilters input:checked').forEach(cb => {
            cb.checked = false;
        });

        // Clear range inputs
        document.getElementById('yearFrom').value = '';
        document.getElementById('yearTo').value = '';
        document.getElementById('ratingFrom').value = '';
        document.getElementById('ratingTo').value = '';
    }

    async loadMoreMovies() {
        ui.currentDiscoverPage++;
        const filters = this.getCurrentFilters();
        await ui.loadDiscoverMovies(filters, false);
    }

    setupMoodButtons() {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const mood = e.target.dataset.mood;
                await this.loadMoodBasedMovies(mood);
            });
        });
    }

    async loadMoodBasedMovies(mood) {
        // Switch to discover page
        ui.showPage('discover');
        
        const container = document.getElementById('discoverMovies');
        ui.showLoading(container);

        try {
            let data;
            if (mood === 'surprise') {
                // Get random popular movies
                const randomPage = Math.floor(Math.random() * 10) + 1;
                data = await api.getPopularMovies(randomPage);
            } else {
                data = await api.getMoodBasedMovies(mood);
            }

            ui.renderMoviesGrid(container, data.results);
            ui.hasMoreMovies = false;
            ui.updateLoadMoreButton();

            auth.showNotification(`Showing ${mood} movies!`, 'success');
        } catch (error) {
            ui.showError(container, 'Failed to load mood-based recommendations');
        }
    }

    setupModalControls() {
        // Movie modal close
        document.getElementById('modalClose')?.addEventListener('click', () => {
            ui.hideMovieModal();
        });

        // Auth modal close
        document.getElementById('authModalClose')?.addEventListener('click', () => {
            ui.hideAuthModal();
        });

        // Close modals on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.id === 'movieModal') {
                    ui.hideMovieModal();
                } else if (e.target.id === 'authModal') {
                    ui.hideAuthModal();
                }
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ui.hideMovieModal();
                ui.hideAuthModal();
            }
        });
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');

        mobileMenuBtn?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-menu') && !e.target.closest('.mobile-menu-btn') && mobileMenu && !mobileMenu.classList.contains('hidden')) {
                this.toggleMobileMenu();
            }
        });
    }

    toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        
        if (mobileMenu && mobileMenuBtn) {
            mobileMenu.classList.toggle('hidden');
            
            // Update menu icon
            const icon = mobileMenuBtn.querySelector('i');
            if (mobileMenu.classList.contains('hidden')) {
                icon.className = 'fas fa-bars';
            } else {
                icon.className = 'fas fa-times';
            }
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MovieSphereApp();
});

// Export for global access
window.MovieSphereApp = MovieSphereApp;