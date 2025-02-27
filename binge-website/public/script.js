// Secure API configuration
const API_CONFIG = {
    KEY: '32a587c90ada63aac4f51132ba8d4234',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE: 'https://image.tmdb.org/t/p/w500'
};

// Secure API request handler
const fetchMovies = async (endpoint) => {
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${endpoint}?api_key=${API_CONFIG.KEY}`
        );
        
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
        
    } catch (error) {
        console.error('API Error:', error);
        return { results: [] }; // Fail gracefully
    }
};

// Example usage in initialization
document.addEventListener('DOMContentLoaded', async () => {
    const trending = await fetchMovies('/trending/movie/week');
    displayMovies(trending.results, 'movies');
    
    // Add error handling for all API calls
    try {
        const categories = [
            { id: 'topratedmovies', endpoint: '/movie/top_rated' },
            { id: 'series', endpoint: '/tv/on_the_air' },
            { id: 'seriestr', endpoint: '/tv/top_rated' }
        ];

        await Promise.all(categories.map(async ({ id, endpoint }) => {
            const data = await fetchMovies(endpoint);
            displayMovies(data.results, id);
        }));
        
    } catch (error) {
        showErrorToUser('Content loading failed. Please try again later.');
    }
});

// Rate limiting implementation
let lastRequest = 0;
const API_DELAY = 1000; // 1 second between requests

const safeFetch = async (endpoint) => {
    const now = Date.now();
    if (now - lastRequest < API_DELAY) {
        await new Promise(resolve => setTimeout(resolve, API_DELAY - (now - lastRequest)));
    }
    lastRequest = Date.now();
    return fetchMovies(endpoint);
};