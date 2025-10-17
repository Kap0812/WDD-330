// API Management for TMDb and YouTube
class APIManager {
    constructor() {
        
        this.tmdbApiKey = '54ff588b8a822c11305ff0a423473cc5'; 
        this.youtubeApiKey = 'YOUR_YOUTUBE_API_KEY'; 
        
        this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
        this.youtubeBaseUrl = 'https://www.googleapis.com/youtube/v3';
        this.imageBaseUrl = 'https://image.tmdb.org/t/p';
    }

    // Generic API request handler
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // TMDb API Methods
    async getPopularMovies(page = 1) {
        const cacheKey = `popular_movies_${page}`;
        const cached = storage.getCache(cacheKey);
        if (cached) return cached;

        const url = `${this.tmdbBaseUrl}/movie/popular?api_key=${this.tmdbApiKey}&page=${page}`;
        const data = await this.makeRequest(url);
        
        storage.setCache(cacheKey, data);
        return data;
    }

    async searchMovies(query, page = 1) {
        const cacheKey = `search_${query}_${page}`;
        const cached = storage.getCache(cacheKey);
        if (cached) return cached;

        const url = `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(query)}&page=${page}`;
        const data = await this.makeRequest(url);
        
        storage.setCache(cacheKey, data, 300000); // 5 minutes cache for search
        return data;
    }

    async getMovieDetails(movieId) {
        const cacheKey = `movie_${movieId}`;
        const cached = storage.getCache(cacheKey);
        if (cached) return cached;

        const url = `${this.tmdbBaseUrl}/movie/${movieId}?api_key=${this.tmdbApiKey}&append_to_response=credits,similar,videos`;
        const data = await this.makeRequest(url);
        
        storage.setCache(cacheKey, data);
        return data;
    }

    async getMoviesByGenre(genreId, page = 1) {
        const cacheKey = `genre_${genreId}_${page}`;
        const cached = storage.getCache(cacheKey);
        if (cached) return cached;

        const url = `${this.tmdbBaseUrl}/discover/movie?api_key=${this.tmdbApiKey}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`;
        const data = await this.makeRequest(url);
        
        storage.setCache(cacheKey, data);
        return data;
    }

    async getGenres() {
        const cacheKey = 'genres';
        const cached = storage.getCache(cacheKey);
        if (cached) return cached;

        const url = `${this.tmdbBaseUrl}/genre/movie/list?api_key=${this.tmdbApiKey}`;
        const data = await this.makeRequest(url);
        
        storage.setCache(cacheKey, data);
        return data;
    }

    // YouTube API Methods
    async searchTrailer(movieTitle) {
        const cacheKey = `trailer_${movieTitle}`;
        const cached = storage.getCache(cacheKey);
        if (cached) return cached;

        const query = `${movieTitle} official trailer`;
        const url = `${this.youtubeBaseUrl}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoEmbeddable=true&maxResults=1&key=${this.youtubeApiKey}`;
        
        try {
            const data = await this.makeRequest(url);
            storage.setCache(cacheKey, data, 86400000); // 24 hours cache
            return data;
        } catch (error) {
            console.error('YouTube API error:', error);
            return null;
        }
    }

    // Image URL helpers
    getPosterUrl(path, size = 'w500') {
        if (!path) return './images/placeholder-poster.jpg';
        return `${this.imageBaseUrl}/${size}${path}`;
    }

    getBackdropUrl(path, size = 'w1280') {
        if (!path) return './images/placeholder-backdrop.jpg';
        return `${this.imageBaseUrl}/${size}${path}`;
    }

    // Mock data for demo purposes (when API keys are not available)
    getMockMovies() {
        return {
            results: [
                {
                    id: 1,
                    title: "The Shawshank Redemption",
                    overview: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
                    poster_path: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
                    backdrop_path: "/iNh3BivHyg5sQRPP1KOkzguEX0H.jpg",
                    release_date: "1994-09-23",
                    vote_average: 9.3,
                    genre_ids: [18, 80]
                },
                {
                    id: 2,
                    title: "The Godfather",
                    overview: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
                    poster_path: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
                    backdrop_path: "/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
                    release_date: "1972-03-14",
                    vote_average: 9.2,
                    genre_ids: [18, 80]
                },
                {
                    id: 3,
                    title: "The Dark Knight",
                    overview: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.",
                    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
                    backdrop_path: "/hqkIcbrOHL86UncnHIsHVcVmzue.jpg",
                    release_date: "2008-07-18",
                    vote_average: 9.0,
                    genre_ids: [28, 80, 18]
                }
            ]
        };
    }

    // Enhanced movie search with filters
    async discoverMovies(filters = {}, page = 1) {
        const { genres, yearFrom, yearTo, ratingFrom, ratingTo } = filters;
        
        let url = `${this.tmdbBaseUrl}/discover/movie?api_key=${this.tmdbApiKey}&page=${page}&sort_by=popularity.desc`;
        
        if (genres && genres.length > 0) {
            url += `&with_genres=${genres.join(',')}`;
        }
        
        if (yearFrom) {
            url += `&primary_release_date.gte=${yearFrom}-01-01`;
        }
        
        if (yearTo) {
            url += `&primary_release_date.lte=${yearTo}-12-31`;
        }
        
        if (ratingFrom) {
            url += `&vote_average.gte=${ratingFrom}`;
        }
        
        if (ratingTo) {
            url += `&vote_average.lte=${ratingTo}`;
        }

        const cacheKey = `discover_${btoa(url)}`;
        const cached = storage.getCache(cacheKey);
        if (cached) return cached;

        try {
            const data = await this.makeRequest(url);
            storage.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Discover movies error:', error);
            // Return mock data for demo
            return this.getMockMovies();
        }
    }

    // Get recommendations based on mood
    async getMoodBasedMovies(mood) {
        const moodConfigs = {
            adventurous: { with_genres: '12,28,14', sort_by: 'popularity.desc' },
            romantic: { with_genres: '10749', sort_by: 'popularity.desc' },
            thrilling: { with_genres: '53,80,9648', sort_by: 'vote_average.desc' },
            thoughtful: { with_genres: '18,36', sort_by: 'vote_average.desc' },
            funny: { with_genres: '35', sort_by: 'popularity.desc' }
        };

        const config = moodConfigs[mood] || { sort_by: 'popularity.desc' };
        
        let url = `${this.tmdbBaseUrl}/discover/movie?api_key=${this.tmdbApiKey}&page=1`;
        
        Object.keys(config).forEach(key => {
            url += `&${key}=${config[key]}`;
        });

        const cacheKey = `mood_${mood}`;
        const cached = storage.getCache(cacheKey);
        if (cached) return cached;

        try {
            const data = await this.makeRequest(url);
            storage.setCache(cacheKey, data, 1800000); // 30 minutes cache for mood
            return data;
        } catch (error) {
            console.error('Mood-based movies error:', error);
            return this.getMockMovies();
        }
    }
}

// Create global instance
const api = new APIManager();