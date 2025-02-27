document.addEventListener('DOMContentLoaded', () => {
  // Your TMDb API key
  const TMDB_API_KEY = "32a587c90ada63aac4f51132ba8d4234";

  fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}`)
    .then(response => response.json())
    .then(data => {
      const moviesContainer = document.querySelector('#main-content');
      data.results.forEach(movie => {
        const posterUrl = `https://image.tmdb.org/t/p/w300${movie.poster_path}`;
        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');
        movieCard.innerHTML = `
          <img src="${posterUrl}" alt="${movie.title} Poster">
          <h3>${movie.title}</h3>
          <p>${movie.release_date}</p>
        `;
        moviesContainer.appendChild(movieCard);
      });
    })
    .catch(err => console.error("TMDb API error:", err));
});
