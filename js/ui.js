/**
 * UI Renderer & DOM Manager Module
 * Demonstrates ES6+ Features:
 * - ES6 Class syntax
 * - Template literals with embedded expressions & conditional rendering
 * - Object & array destructuring
 * - Default parameters
 * - Optional chaining (?.) and nullish coalescing (??)
 * - Array methods (.map, .join, .find, .forEach)
 * - Modern Dialog API (<dialog closedby="any"> and light-dismiss fallback)
 */

import { StorageManager } from './storage.js';

export class UIManager {
  constructor() {
    this.modal = document.getElementById('movieModal');
    this.apiKeyModal = document.getElementById('apiKeyModal');
    this.toastContainer = document.getElementById('toastContainer');
    this.moviesContainer = document.getElementById('moviesContainer');
    this.paginationContainer = document.getElementById('paginationContainer');
    this.resultsSummary = document.getElementById('resultsSummary');
    this.searchHistoryContainer = document.getElementById('searchHistoryChips');
    this.watchlistBadge = document.getElementById('watchlistBadge');

    this._setupDialogFallbacks();
  }

  /**
   * Polyfill / fallback for `<dialog closedby="any">` for browsers without native closedby support
   * Follows Modern Web Guidance for modal light-dismiss
   */
  _setupDialogFallbacks() {
    [this.modal, this.apiKeyModal].forEach(dialog => {
      if (!dialog) return;

      if (!('closedBy' in HTMLDialogElement.prototype)) {
        dialog.addEventListener('click', (event) => {
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isDialogContent = (
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width
          );
          if (isDialogContent) return;
          dialog.close();
        });
      }
    });
  }

  /**
   * Safe poster URL resolver with fallback SVG placeholder
   * @param {string} posterUrl
   * @param {string} title
   * @returns {string}
   */
  static getPosterUrl(posterUrl, title = 'Movie') {
    if (!posterUrl || posterUrl === 'N/A' || !posterUrl.startsWith('http')) {
      // Inline SVG data URI for placeholder to prevent broken image icons
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="300" height="450">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)"/>
          <g fill="#475569" transform="translate(100, 150) scale(1.5)">
            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
          </g>
          <text x="150" y="270" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14" font-weight="600" text-anchor="middle">No Poster Available</text>
          <text x="150" y="295" fill="#64748b" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">${UIManager.escapeHtml(title).slice(0, 26)}</text>
        </svg>
      `.trim();
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    return posterUrl;
  }

  /**
   * Escape HTML to prevent XSS injection in template literals
   * @param {string} str
   * @returns {string}
   */
  static escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Shows a loading skeleton grid with responsive placeholders
   * @param {number} count
   */
  showSkeletons(count = 8) {
    const skeletonsHtml = Array.from({ length: count }, (_, i) => `
      <div class="movie-card skeleton-card" aria-hidden="true" key="skel-${i}">
        <div class="skeleton poster-skeleton"></div>
        <div class="movie-card-content">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-meta">
            <div class="skeleton-line skeleton-badge"></div>
            <div class="skeleton-line skeleton-badge"></div>
          </div>
        </div>
      </div>
    `).join('');

    this.moviesContainer.innerHTML = skeletonsHtml;
    this.moviesContainer.setAttribute('aria-busy', 'true');
  }

  /**
   * Render a collection of movies to the main grid/list
   * @param {Array} movies
   * @param {Object} options
   */
  renderMovies(movies, { isWatchlistView = false } = {}) {
    this.moviesContainer.setAttribute('aria-busy', 'false');

    if (!movies || movies.length === 0) {
      if (isWatchlistView) {
        this.renderEmptyWatchlist();
      } else {
        this.renderEmptyState('No movies found matching your criteria.');
      }
      return;
    }

    const cardsHtml = movies.map(movie => {
      const {
        Title = 'Untitled',
        Year = 'N/A',
        imdbID = '',
        Type = 'movie',
        Poster = '',
        imdbRating = null,
      } = movie;

      const posterSrc = UIManager.getPosterUrl(Poster, Title);
      const isSaved = StorageManager.isInWatchlist(imdbID);
      const formattedType = Type.charAt(0).toUpperCase() + Type.slice(1);

      return `
        <article class="movie-card-container" data-id="${imdbID}">
          <div class="movie-card">
            <div class="poster-wrapper">
              <img
                src="${posterSrc}"
                alt="${UIManager.escapeHtml(Title)} Poster"
                class="movie-poster"
                loading="lazy"
                onerror="this.onerror=null; this.src='${UIManager.getPosterUrl('N/A', Title)}';"
              />
              <span class="type-pill badge-${Type.toLowerCase()}">${formattedType}</span>
              ${imdbRating && imdbRating !== 'N/A' ? `
                <span class="rating-pill">
                  <svg class="icon-star" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  ${imdbRating}
                </span>
              ` : ''}
              <button
                type="button"
                class="btn-watchlist ${isSaved ? 'is-active' : ''}"
                data-action="toggle-watchlist"
                data-id="${imdbID}"
                title="${isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}"
                aria-label="${isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}"
              >
                <svg viewBox="0 0 24 24" class="icon-bookmark">
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </button>
            </div>

            <div class="movie-card-content">
              <h3 class="movie-title" title="${UIManager.escapeHtml(Title)}">
                ${UIManager.escapeHtml(Title)}
              </h3>
              
              <div class="movie-meta">
                <span class="movie-year">${Year}</span>
                <span class="meta-dot" aria-hidden="true">•</span>
                <span class="movie-media-type">${formattedType}</span>
              </div>

              <div class="card-actions">
                <button
                  type="button"
                  class="btn btn-primary btn-sm btn-details"
                  data-action="view-details"
                  data-id="${imdbID}"
                >
                  <svg viewBox="0 0 24 24" class="btn-icon">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  Details
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    this.moviesContainer.innerHTML = cardsHtml;
  }

  /**
   * Render movie details in the Modal Dialog
   * @param {Object} details
   */
  renderMovieDetails(details) {
    const {
      Title = 'Untitled',
      Year = 'N/A',
      Rated = 'N/A',
      Released = 'N/A',
      Runtime = 'N/A',
      Genre = 'N/A',
      Director = 'N/A',
      Writer = 'N/A',
      Actors = 'N/A',
      Plot = 'No plot synopsis available.',
      Language = 'N/A',
      Country = 'N/A',
      Awards = 'N/A',
      Poster = '',
      Ratings = [],
      Metascore = 'N/A',
      imdbRating = 'N/A',
      imdbVotes = 'N/A',
      imdbID = '',
      BoxOffice = 'N/A',
      Type = 'movie',
    } = details;

    const posterSrc = UIManager.getPosterUrl(Poster, Title);
    const isSaved = StorageManager.isInWatchlist(imdbID);

    // Extract specific ratings
    const rtRating = Ratings.find(r => r.Source === 'Rotten Tomatoes')?.Value ?? null;
    const metaRating = Metascore !== 'N/A' ? `${Metascore}/100` : null;

    // Genres pills
    const genrePills = Genre !== 'N/A'
      ? Genre.split(',').map(g => `<span class="genre-pill">${g.trim()}</span>`).join('')
      : '';

    const modalBody = this.modal.querySelector('.modal-body');
    modalBody.innerHTML = `
      <div class="modal-movie-grid">
        <div class="modal-poster-col">
          <img
            src="${posterSrc}"
            alt="${UIManager.escapeHtml(Title)} Poster"
            class="modal-poster"
            onerror="this.onerror=null; this.src='${UIManager.getPosterUrl('N/A', Title)}';"
          />
        </div>

        <div class="modal-info-col">
          <header class="modal-header-info">
            <div class="modal-badges">
              <span class="badge badge-type">${Type.toUpperCase()}</span>
              ${Rated !== 'N/A' ? `<span class="badge badge-rated">${Rated}</span>` : ''}
              ${Runtime !== 'N/A' ? `<span class="badge badge-runtime">${Runtime}</span>` : ''}
              <span class="badge badge-year">${Year}</span>
            </div>

            <h2 id="modalMovieTitle" class="modal-title">${UIManager.escapeHtml(Title)}</h2>
            
            <div class="genre-container">
              ${genrePills}
            </div>
          </header>

          <!-- Ratings Score Bar -->
          <div class="ratings-card">
            <div class="rating-item">
              <span class="rating-source">IMDb Rating</span>
              <div class="rating-value-box">
                <svg viewBox="0 0 24 24" class="icon-star-lg"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                <span class="rating-score">${imdbRating}</span>
                <span class="rating-max">/10</span>
              </div>
              <span class="rating-sub">${imdbVotes !== 'N/A' ? `${imdbVotes} votes` : ''}</span>
            </div>

            ${rtRating ? `
              <div class="rating-item">
                <span class="rating-source">Rotten Tomatoes</span>
                <div class="rating-value-box">
                  <span class="tomato-emoji" aria-hidden="true">🍅</span>
                  <span class="rating-score">${rtRating}</span>
                </div>
                <span class="rating-sub">Critic Consensus</span>
              </div>
            ` : ''}

            ${metaRating ? `
              <div class="rating-item">
                <span class="rating-source">Metascore</span>
                <div class="rating-value-box">
                  <span class="metascore-badge score-${parseInt(Metascore, 10) >= 60 ? 'good' : (parseInt(Metascore, 10) >= 40 ? 'mixed' : 'bad')}">${Metascore}</span>
                </div>
                <span class="rating-sub">Metacritic</span>
              </div>
            ` : ''}
          </div>

          <!-- Plot Synopsis -->
          <div class="modal-section">
            <h4 class="section-heading">Plot Synopsis</h4>
            <p class="plot-text">${UIManager.escapeHtml(Plot)}</p>
          </div>

          <!-- Credits & Details -->
          <div class="details-list">
            ${Director !== 'N/A' ? `
              <div class="detail-row">
                <span class="detail-label">Director:</span>
                <span class="detail-value">${UIManager.escapeHtml(Director)}</span>
              </div>
            ` : ''}
            ${Writer !== 'N/A' ? `
              <div class="detail-row">
                <span class="detail-label">Writers:</span>
                <span class="detail-value">${UIManager.escapeHtml(Writer)}</span>
              </div>
            ` : ''}
            ${Actors !== 'N/A' ? `
              <div class="detail-row">
                <span class="detail-label">Starring:</span>
                <span class="detail-value">${UIManager.escapeHtml(Actors)}</span>
              </div>
            ` : ''}
            ${Released !== 'N/A' ? `
              <div class="detail-row">
                <span class="detail-label">Release Date:</span>
                <span class="detail-value">${Released}</span>
              </div>
            ` : ''}
            ${Language !== 'N/A' ? `
              <div class="detail-row">
                <span class="detail-label">Languages:</span>
                <span class="detail-value">${UIManager.escapeHtml(Language)}</span>
              </div>
            ` : ''}
            ${Country !== 'N/A' ? `
              <div class="detail-row">
                <span class="detail-label">Country:</span>
                <span class="detail-value">${UIManager.escapeHtml(Country)}</span>
              </div>
            ` : ''}
            ${BoxOffice !== 'N/A' ? `
              <div class="detail-row">
                <span class="detail-label">Box Office:</span>
                <span class="detail-value">${BoxOffice}</span>
              </div>
            ` : ''}
            ${Awards !== 'N/A' ? `
              <div class="detail-row">
                <span class="detail-label">Awards:</span>
                <span class="detail-value">${UIManager.escapeHtml(Awards)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Modal Action Buttons -->
          <footer class="modal-footer-actions">
            <button
              type="button"
              class="btn ${isSaved ? 'btn-danger' : 'btn-primary'}"
              id="modalWatchlistBtn"
              data-id="${imdbID}"
            >
              <svg viewBox="0 0 24 24" class="btn-icon">
                <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
              </svg>
              <span>${isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}</span>
            </button>

            ${imdbID ? `
              <a
                href="https://www.imdb.com/title/${imdbID}/"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-outline"
                title="Open on IMDb in a new tab"
              >
                <svg viewBox="0 0 24 24" class="btn-icon">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
                IMDb
              </a>
              <a
                href="https://www.youtube.com/results?search_query=${encodeURIComponent(Title + ' ' + Year + ' trailer')}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-outline"
                title="Search trailer on YouTube"
              >
                <svg viewBox="0 0 24 24" class="btn-icon">
                  <path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z"/>
                </svg>
                Trailer
              </a>
            ` : ''}
          </footer>
        </div>
      </div>
    `;

    // Open modal using native modern showModal()
    this.modal.showModal();
  }

  /**
   * Close the movie details modal
   */
  closeModal() {
    if (this.modal.open) {
      this.modal.close();
    }
  }

  /**
   * Render an empty search state or no results message
   * @param {string} message
   */
  renderEmptyState(message = 'No movies found.', { showSuggestions = true } = {}) {
    this.moviesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-box">
          <svg viewBox="0 0 24 24" class="icon-empty">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </div>
        <h3 class="empty-title">No Results Found</h3>
        <p class="empty-desc">${UIManager.escapeHtml(message)}</p>
        ${showSuggestions ? `
          <div class="empty-tips">
            <p><strong>Suggestions:</strong></p>
            <ul>
              <li>Check your spelling for typos.</li>
              <li>Try broader terms (e.g., "Batman" or "Avengers").</li>
              <li>Clear any active type or year filters.</li>
            </ul>
          </div>
        ` : ''}
      </div>
    `;
    this.paginationContainer.innerHTML = '';
  }

  /**
   * Render empty watchlist state
   */
  renderEmptyWatchlist() {
    this.moviesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-box">
          <svg viewBox="0 0 24 24" class="icon-empty">
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <h3 class="empty-title">Your Watchlist is Empty</h3>
        <p class="empty-desc">You haven't saved any movies or series yet. Click the bookmark icon on any title to save it for later!</p>
        <button type="button" class="btn btn-primary" id="btnExploreMovies">
          Discover Movies
        </button>
      </div>
    `;
    this.paginationContainer.innerHTML = '';
  }

  /**
   * Render error banner / alert
   * @param {string} title
   * @param {string} message
   * @param {Object} options
   */
  renderErrorState(title, message, { onRetry = null, onClearFilters = null } = {}) {
    this.moviesContainer.innerHTML = `
      <div class="error-state" role="alert">
        <div class="error-icon-box">
          <svg viewBox="0 0 24 24" class="icon-error">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <h3 class="error-title">${UIManager.escapeHtml(title)}</h3>
        <p class="error-message">${UIManager.escapeHtml(message)}</p>
        <div class="error-actions">
          ${onRetry ? `
            <button type="button" class="btn btn-primary btn-sm" id="btnErrorRetry">
              <svg viewBox="0 0 24 24" class="btn-icon"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
              Try Again
            </button>
          ` : ''}
          ${onClearFilters ? `
            <button type="button" class="btn btn-outline btn-sm" id="btnErrorClearFilters">
              Clear Filters
            </button>
          ` : ''}
        </div>
      </div>
    `;
    this.paginationContainer.innerHTML = '';

    if (onRetry) {
      document.getElementById('btnErrorRetry')?.addEventListener('click', onRetry);
    }
    if (onClearFilters) {
      document.getElementById('btnErrorClearFilters')?.addEventListener('click', onClearFilters);
    }
  }

  /**
   * Render pagination controls
   * @param {number} totalResults
   * @param {number} currentPage
   * @param {number} itemsPerPage
   * @param {function(number): void} onPageChange
   */
  renderPagination(totalResults, currentPage, itemsPerPage = 10, onPageChange) {
    const totalPages = Math.ceil(totalResults / itemsPerPage);

    if (totalPages <= 1) {
      this.paginationContainer.innerHTML = '';
      return;
    }

    const prevDisabled = currentPage <= 1 ? 'disabled' : '';
    const nextDisabled = currentPage >= totalPages ? 'disabled' : '';

    // Calculate window of pages around current page
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    let pagesHtml = '';

    // First page
    pagesHtml += `
      <button
        type="button"
        class="page-btn ${currentPage === 1 ? 'is-current' : ''}"
        data-page="1"
        aria-current="${currentPage === 1 ? 'page' : 'false'}"
      >1</button>
    `;

    // Left ellipsis
    if (range[0] > 2) {
      pagesHtml += `<span class="page-ellipsis">…</span>`;
    }

    // Middle pages
    range.forEach(page => {
      pagesHtml += `
        <button
          type="button"
          class="page-btn ${currentPage === page ? 'is-current' : ''}"
          data-page="${page}"
          aria-current="${currentPage === page ? 'page' : 'false'}"
        >${page}</button>
      `;
    });

    // Right ellipsis
    if (range[range.length - 1] < totalPages - 1) {
      pagesHtml += `<span class="page-ellipsis">…</span>`;
    }

    // Last page
    if (totalPages > 1) {
      pagesHtml += `
        <button
          type="button"
          class="page-btn ${currentPage === totalPages ? 'is-current' : ''}"
          data-page="${totalPages}"
          aria-current="${currentPage === totalPages ? 'page' : 'false'}"
        >${totalPages}</button>
      `;
    }

    this.paginationContainer.innerHTML = `
      <nav class="pagination" aria-label="Pagination Navigation">
        <button
          type="button"
          class="page-btn page-prev"
          ${prevDisabled}
          data-page="${currentPage - 1}"
          aria-label="Go to previous page"
        >
          <svg viewBox="0 0 24 24" class="btn-icon"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          Previous
        </button>

        <div class="page-numbers">
          ${pagesHtml}
        </div>

        <button
          type="button"
          class="page-btn page-next"
          ${nextDisabled}
          data-page="${currentPage + 1}"
          aria-label="Go to next page"
        >
          Next
          <svg viewBox="0 0 24 24" class="btn-icon"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </nav>
    `;

    // Bind click events using event delegation
    this.paginationContainer.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pageNum = parseInt(e.currentTarget.getAttribute('data-page'), 10);
        if (pageNum && pageNum !== currentPage && pageNum >= 1 && pageNum <= totalPages) {
          onPageChange(pageNum);
          window.scrollTo({ top: 380, behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Update search results summary text
   * @param {string} query
   * @param {number} totalResults
   * @param {number} page
   * @param {number} itemsCount
   */
  updateResultsSummary(query, totalResults, page, itemsCount) {
    if (!query) {
      this.resultsSummary.textContent = '';
      return;
    }

    if (totalResults === 0) {
      this.resultsSummary.textContent = `No results found for "${query}"`;
      return;
    }

    const start = (page - 1) * 10 + 1;
    const end = Math.min((page - 1) * 10 + itemsCount, totalResults);

    this.resultsSummary.innerHTML = `
      Showing <strong class="text-highlight">${start}–${end}</strong> of 
      <strong class="text-highlight">${totalResults.toLocaleString()}</strong> titles for 
      <span class="search-term">"${UIManager.escapeHtml(query)}"</span>
    `;
  }

  /**
   * Render search history chips
   * @param {Array<string>} history
   * @param {function(string): void} onSelect
   * @param {function(): void} onClear
   */
  renderSearchHistory(history, onSelect, onClear) {
    if (!this.searchHistoryContainer) return;

    if (!history || history.length === 0) {
      this.searchHistoryContainer.innerHTML = '';
      this.searchHistoryContainer.style.display = 'none';
      return;
    }

    this.searchHistoryContainer.style.display = 'flex';
    const chipsHtml = history.map(item => `
      <button type="button" class="chip history-chip" data-query="${UIManager.escapeHtml(item)}">
        <svg viewBox="0 0 24 24" class="chip-icon">
          <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
        </svg>
        <span>${UIManager.escapeHtml(item)}</span>
      </button>
    `).join('');

    this.searchHistoryContainer.innerHTML = `
      <span class="history-label">Recent:</span>
      <div class="chips-list">${chipsHtml}</div>
      <button type="button" class="btn-link btn-clear-history" title="Clear search history">Clear</button>
    `;

    this.searchHistoryContainer.querySelectorAll('.history-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        if (query) onSelect(query);
      });
    });

    this.searchHistoryContainer.querySelector('.btn-clear-history')?.addEventListener('click', onClear);
  }

  /**
   * Update Watchlist badge count
   * @param {number} count
   */
  updateWatchlistBadge(count) {
    if (!this.watchlistBadge) return;
    this.watchlistBadge.textContent = count > 0 ? String(count) : '0';
    this.watchlistBadge.classList.toggle('has-items', count > 0);
  }

  /**
   * Display a non-blocking toast notification
   * @param {string} message
   * @param {'success'|'info'|'warning'|'error'} [type='info']
   * @param {number} [duration=3200]
   */
  showToast(message, type = 'info', duration = 3200) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const icons = {
      success: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
      warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
      error: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>',
      info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
    };

    toast.innerHTML = `
      <svg viewBox="0 0 24 24" class="toast-icon">${icons[type] || icons.info}</svg>
      <span class="toast-message">${UIManager.escapeHtml(message)}</span>
      <button type="button" class="toast-close" aria-label="Close notification">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 250);
    });

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
  }
}
