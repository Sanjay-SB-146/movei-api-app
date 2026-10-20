/**
 * Main Application Orchestrator
 * Demonstrates ES6+ Features:
 * - ES6 Class syntax & private-like conventions
 * - Async / Await with concurrency management
 * - Event delegation for high-performance DOM listeners
 * - Debouncing with setTimeout & arrow functions
 * - Modern Array sorting with Intl.Collator & localeCompare
 * - Object destructuring & optional chaining
 * - AbortController signal handling
 */

import { CONFIG } from './config.js';
import { StorageManager } from './storage.js';
import { MovieAPI, MovieAPIError } from './api.js';
import { UIManager } from './ui.js';

class MovieApp {
  constructor() {
    this.api = new MovieAPI();
    this.ui = new UIManager();

    // App state
    this.currentQuery = CONFIG.DEFAULT_INITIAL_SEARCH;
    this.currentPage = 1;
    this.currentType = '';
    this.currentYear = '';
    this.currentSort = 'relevance';
    this.totalResults = 0;
    this.rawMoviesList = [];
    this.isWatchlistView = false;
    this.debounceTimer = null;

    // DOM references
    this.searchForm = document.getElementById('searchForm');
    this.searchInput = document.getElementById('searchInput');
    this.btnClearSearch = document.getElementById('btnClearSearch');
    this.typeFilter = document.getElementById('typeFilter');
    this.yearFilter = document.getElementById('yearFilter');
    this.sortFilter = document.getElementById('sortFilter');
    this.btnWatchlistNav = document.getElementById('btnWatchlistNav');
    this.btnApiKeySettings = document.getElementById('btnApiKeySettings');
    this.btnThemeToggle = document.getElementById('btnThemeToggle');
    this.btnViewGrid = document.getElementById('btnViewGrid');
    this.btnViewList = document.getElementById('btnViewList');
    this.trendingChips = document.querySelectorAll('.trending-chip');
    this.apiKeyModal = document.getElementById('apiKeyModal');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.btnSaveApiKey = document.getElementById('btnSaveApiKey');
    this.btnResetApiKey = document.getElementById('btnResetApiKey');
    this.btnTestApiKey = document.getElementById('btnTestApiKey');
    this.apiKeyStatus = document.getElementById('apiKeyStatus');
    this.demoModeToggle = document.getElementById('demoModeToggle');
    this.viewTitle = document.getElementById('viewTitle');

    this.init();
  }

  /**
   * Initialize app preferences, event listeners, and perform initial search
   */
  init() {
    this._applyStoredTheme();
    this._applyStoredViewMode();
    this._updateWatchlistBadge();
    this._renderSearchHistory();
    this._bindEvents();

    // Initial default search
    this.searchInput.value = this.currentQuery;
    this.executeSearch(this.currentQuery, 1);
  }

  /**
   * Bind DOM event listeners
   */
  _bindEvents() {
    // Search form submission
    this.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = this.searchInput.value.trim();
      if (!query) {
        this.ui.showToast('Please enter a movie title to search.', 'warning');
        this.searchInput.focus();
        return;
      }
      this.isWatchlistView = false;
      this._updateViewHeader();
      this.executeSearch(query, 1);
    });

    // Live debounced search as user types
    this.searchInput.addEventListener('input', () => {
      const val = this.searchInput.value;
      this.btnClearSearch.style.display = val ? 'flex' : 'none';

      clearTimeout(this.debounceTimer);
      if (val.trim().length >= 3) {
        this.debounceTimer = setTimeout(() => {
          this.isWatchlistView = false;
          this._updateViewHeader();
          this.executeSearch(val.trim(), 1);
        }, CONFIG.SEARCH_DEBOUNCE_MS);
      }
    });

    // Clear search button
    this.btnClearSearch.addEventListener('click', () => {
      this.searchInput.value = '';
      this.btnClearSearch.style.display = 'none';
      this.searchInput.focus();
    });

    // Filters: Type, Year, Sort
    this.typeFilter.addEventListener('change', () => {
      this.currentType = this.typeFilter.value;
      if (this.isWatchlistView) {
        this._renderWatchlist();
      } else {
        this.executeSearch(this.currentQuery, 1);
      }
    });

    this.yearFilter.addEventListener('input', () => {
      // Debounce year filter if user is typing
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.currentYear = this.yearFilter.value.trim();
        if (this.isWatchlistView) {
          this._renderWatchlist();
        } else {
          this.executeSearch(this.currentQuery, 1);
        }
      }, 350);
    });

    this.sortFilter.addEventListener('change', () => {
      this.currentSort = this.sortFilter.value;
      this._applySortingAndRender();
    });

    // Trending chips
    this.trendingChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-search');
        if (query) {
          this.searchInput.value = query;
          this.btnClearSearch.style.display = 'flex';
          this.isWatchlistView = false;
          this._updateViewHeader();
          this.executeSearch(query, 1);
        }
      });
    });

    // Watchlist Navigation toggle
    this.btnWatchlistNav.addEventListener('click', () => {
      this.toggleWatchlistView();
    });

    // Delegated click handler on movies container (Details, Watchlist toggle)
    this.ui.moviesContainer.addEventListener('click', (e) => {
      const watchlistBtn = e.target.closest('[data-action="toggle-watchlist"]');
      if (watchlistBtn) {
        const imdbID = watchlistBtn.getAttribute('data-id');
        this.handleToggleWatchlist(imdbID, watchlistBtn);
        return;
      }

      const detailsBtn = e.target.closest('[data-action="view-details"]');
      if (detailsBtn) {
        const imdbID = detailsBtn.getAttribute('data-id');
        this.openMovieDetails(imdbID);
        return;
      }

      const exploreBtn = e.target.closest('#btnExploreMovies');
      if (exploreBtn) {
        this.isWatchlistView = false;
        this._updateViewHeader();
        this.executeSearch(this.currentQuery || 'Inception', 1);
      }
    });

    // Modal Watchlist toggle button
    document.addEventListener('click', (e) => {
      const modalWatchlistBtn = e.target.closest('#modalWatchlistBtn');
      if (modalWatchlistBtn) {
        const imdbID = modalWatchlistBtn.getAttribute('data-id');
        this.handleToggleWatchlist(imdbID, modalWatchlistBtn, true);
      }
    });

    // Close buttons for modals
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dialog = e.target.closest('dialog');
        if (dialog) dialog.close();
      });
    });

    // API Key settings modal
    this.btnApiKeySettings.addEventListener('click', () => {
      this.apiKeyInput.value = StorageManager.getApiKey();
      this.apiKeyStatus.textContent = '';
      this.apiKeyStatus.className = 'status-box';
      this.apiKeyModal.showModal();
    });

    this.btnSaveApiKey.addEventListener('click', () => {
      const key = this.apiKeyInput.value.trim();
      if (!key) {
        this.ui.showToast('Please enter a valid API key or reset to default.', 'warning');
        return;
      }
      StorageManager.setApiKey(key);
      this.ui.showToast('API Key saved successfully!', 'success');
      this.apiKeyModal.close();
      this.executeSearch(this.currentQuery, 1);
    });

    this.btnResetApiKey.addEventListener('click', () => {
      StorageManager.resetApiKey();
      this.apiKeyInput.value = CONFIG.DEFAULT_API_KEY;
      this.apiKeyStatus.textContent = 'Reset to default OMDb key (trilogy).';
      this.apiKeyStatus.className = 'status-box status-info';
      this.ui.showToast('API key reset to default.', 'info');
    });

    this.btnTestApiKey.addEventListener('click', async () => {
      const key = this.apiKeyInput.value.trim();
      this.apiKeyStatus.textContent = 'Testing connection with OMDb API...';
      this.apiKeyStatus.className = 'status-box status-loading';

      const result = await this.api.testApiKey(key);
      this.apiKeyStatus.textContent = result.message;
      this.apiKeyStatus.className = `status-box status-${result.valid ? 'success' : 'error'}`;
    });

    // Demo Mode toggle
    if (this.demoModeToggle) {
      this.demoModeToggle.addEventListener('change', (e) => {
        this.api.isDemoMode = e.target.checked;
        const msg = this.api.isDemoMode
          ? 'Demo Mode enabled (using curated offline movies).'
          : 'Live API mode enabled (connecting to OMDb).';
        this.ui.showToast(msg, 'info');
        this.executeSearch(this.currentQuery, 1);
      });
    }

    // Theme toggle
    this.btnThemeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      StorageManager.setTheme(newTheme);
      this._updateThemeIcon(newTheme);
      this.ui.showToast(`Switched to ${newTheme} mode.`, 'info', 1800);
    });

    // View mode (Grid / List)
    this.btnViewGrid.addEventListener('click', () => {
      this._setViewMode('grid');
    });

    this.btnViewList.addEventListener('click', () => {
      this._setViewMode('list');
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Focus search input when pressing "/"
      if (e.key === '/' && document.activeElement !== this.searchInput && !this.ui.modal.open && !this.apiKeyModal.open) {
        e.preventDefault();
        this.searchInput.focus();
        this.searchInput.select();
      }
    });
  }

  /**
   * Execute movie search
   * @param {string} query
   * @param {number} page
   */
  async executeSearch(query, page = 1) {
    this.currentQuery = query;
    this.currentPage = page;

    // Show responsive skeleton placeholders
    this.ui.showSkeletons(CONFIG.ITEMS_PER_PAGE);

    try {
      const result = await this.api.searchMovies(
        this.currentQuery,
        this.currentPage,
        this.currentType,
        this.currentYear
      );

      this.rawMoviesList = [...result.movies];
      this.totalResults = result.totalResults;

      // Save to recent search history
      StorageManager.addSearchHistory(this.currentQuery);
      this._renderSearchHistory();

      // Update UI summary and render sorted results
      this.ui.updateResultsSummary(
        this.currentQuery,
        this.totalResults,
        this.currentPage,
        this.rawMoviesList.length
      );

      this._applySortingAndRender();

      // Render pagination
      this.ui.renderPagination(
        this.totalResults,
        this.currentPage,
        CONFIG.ITEMS_PER_PAGE,
        (newPage) => this.executeSearch(this.currentQuery, newPage)
      );

      if (result.isDemo) {
        this.ui.showToast('Displaying curated demo results (Offline/Demo Mode).', 'info', 3000);
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // Expected when user types fast

      console.error('Search Error:', err);

      let title = 'Search Error';
      let message = err.message || 'Unable to retrieve movies.';

      if (err instanceof MovieAPIError) {
        if (err.code === 'NOT_FOUND') {
          title = 'Movie Not Found';
          message = `No titles matched "${query}". Please check your spelling or try broader keywords.`;
        } else if (err.code === 'TOO_MANY_RESULTS') {
          title = 'Too Many Results';
          message = `Your query "${query}" matched too many titles. Please type a more specific movie title.`;
        } else if (err.code === 'EMPTY_QUERY') {
          title = 'Empty Search';
          message = 'Please type a title in the search bar above.';
        } else if (err.code === 'INVALID_API_KEY') {
          title = 'Invalid API Key';
          message = 'The OMDb API key is invalid or has expired. Click the settings icon in the top right to configure your own key.';
        }
      }

      this.ui.updateResultsSummary(this.currentQuery, 0, 1, 0);
      this.ui.renderErrorState(title, message, {
        onRetry: () => this.executeSearch(this.currentQuery, this.currentPage),
        onClearFilters: () => this.clearFilters(),
      });
    }
  }

  /**
   * Sort the current results and trigger UI render
   */
  _applySortingAndRender() {
    let sorted = [...this.rawMoviesList];

    switch (this.currentSort) {
      case 'year-desc':
        sorted.sort((a, b) => (parseInt(b.Year, 10) || 0) - (parseInt(a.Year, 10) || 0));
        break;
      case 'year-asc':
        sorted.sort((a, b) => (parseInt(a.Year, 10) || 0) - (parseInt(b.Year, 10) || 0));
        break;
      case 'title-asc':
        sorted.sort((a, b) => a.Title.localeCompare(b.Title));
        break;
      case 'title-desc':
        sorted.sort((a, b) => b.Title.localeCompare(a.Title));
        break;
      case 'relevance':
      default:
        // Keep natural API ranking
        break;
    }

    this.ui.renderMovies(sorted, { isWatchlistView: this.isWatchlistView });
  }

  /**
   * Fetch and display full movie details in modal dialog
   * @param {string} imdbID
   */
  async openMovieDetails(imdbID) {
    try {
      this.ui.showToast('Fetching movie details...', 'info', 1200);
      const details = await this.api.getMovieDetails(imdbID);
      this.ui.renderMovieDetails(details);
    } catch (err) {
      console.error('Failed to load movie details:', err);
      this.ui.showToast(err.message || 'Failed to load movie details.', 'error');
    }
  }

  /**
   * Handle Watchlist toggle for a card or within the modal
   * @param {string} imdbID
   * @param {HTMLElement} buttonElement
   * @param {boolean} isModal
   */
  handleToggleWatchlist(imdbID, buttonElement, isModal = false) {
    // Find movie in active list or storage
    const movie = this.rawMoviesList.find(m => m.imdbID === imdbID) ||
                  StorageManager.getWatchlist().find(m => m.imdbID === imdbID);

    if (!movie) {
      this.ui.showToast('Could not find movie data to save.', 'warning');
      return;
    }

    const wasAdded = StorageManager.toggleWatchlist(movie);

    if (isModal) {
      buttonElement.className = `btn ${wasAdded ? 'btn-danger' : 'btn-primary'}`;
      const span = buttonElement.querySelector('span');
      if (span) span.textContent = wasAdded ? 'Remove from Watchlist' : 'Add to Watchlist';
    } else {
      buttonElement.classList.toggle('is-active', wasAdded);
      buttonElement.setAttribute('title', wasAdded ? 'Remove from Watchlist' : 'Add to Watchlist');
      buttonElement.setAttribute('aria-label', wasAdded ? 'Remove from Watchlist' : 'Add to Watchlist');
    }

    // Also sync corresponding card in the main view
    const mainCardBtn = this.ui.moviesContainer.querySelector(`[data-action="toggle-watchlist"][data-id="${imdbID}"]`);
    if (mainCardBtn) {
      mainCardBtn.classList.toggle('is-active', wasAdded);
    }

    this._updateWatchlistBadge();

    const toastMsg = wasAdded
      ? `"${movie.Title}" added to Watchlist.`
      : `"${movie.Title}" removed from Watchlist.`;
    this.ui.showToast(toastMsg, wasAdded ? 'success' : 'info');

    if (this.isWatchlistView) {
      this._renderWatchlist();
    }
  }

  /**
   * Switch between main search view and Watchlist view
   */
  toggleWatchlistView() {
    this.isWatchlistView = !this.isWatchlistView;
    this._updateViewHeader();

    if (this.isWatchlistView) {
      this._renderWatchlist();
    } else {
      this.executeSearch(this.currentQuery, this.currentPage);
    }
  }

  _updateViewHeader() {
    if (this.isWatchlistView) {
      this.viewTitle.textContent = 'My Watchlist';
      this.btnWatchlistNav.classList.add('is-active');
      this.btnWatchlistNav.querySelector('.nav-label').textContent = 'Back to Search';
    } else {
      this.viewTitle.textContent = 'Discover Movies';
      this.btnWatchlistNav.classList.remove('is-active');
      this.btnWatchlistNav.querySelector('.nav-label').textContent = 'Watchlist';
    }
  }

  _renderWatchlist() {
    const list = StorageManager.getWatchlist();
    let filtered = [...list];

    // Apply type filter if active
    if (this.currentType) {
      filtered = filtered.filter(m => (m.Type || 'movie').toLowerCase() === this.currentType.toLowerCase());
    }

    // Apply year filter if active
    if (this.currentYear) {
      filtered = filtered.filter(m => (m.Year || '').includes(this.currentYear));
    }

    this.rawMoviesList = [...filtered];
    this.totalResults = filtered.length;

    this.ui.updateResultsSummary(
      `Watchlist (${filtered.length} saved)`,
      filtered.length,
      1,
      filtered.length
    );

    this._applySortingAndRender();
    this.ui.paginationContainer.innerHTML = '';
  }

  clearFilters() {
    this.typeFilter.value = '';
    this.yearFilter.value = '';
    this.sortFilter.value = 'relevance';
    this.currentType = '';
    this.currentYear = '';
    this.currentSort = 'relevance';
    this.executeSearch(this.currentQuery, 1);
  }

  _updateWatchlistBadge() {
    const count = StorageManager.getWatchlist().length;
    this.ui.updateWatchlistBadge(count);
  }

  _renderSearchHistory() {
    const history = StorageManager.getSearchHistory();
    this.ui.renderSearchHistory(
      history,
      (selectedQuery) => {
        this.searchInput.value = selectedQuery;
        this.btnClearSearch.style.display = 'flex';
        this.isWatchlistView = false;
        this._updateViewHeader();
        this.executeSearch(selectedQuery, 1);
      },
      () => {
        StorageManager.clearSearchHistory();
        this._renderSearchHistory();
        this.ui.showToast('Search history cleared.', 'info');
      }
    );
  }

  _applyStoredTheme() {
    const theme = StorageManager.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    this._updateThemeIcon(theme);
  }

  _updateThemeIcon(theme) {
    const sunIcon = this.btnThemeToggle.querySelector('.icon-sun');
    const moonIcon = this.btnThemeToggle.querySelector('.icon-moon');
    if (sunIcon && moonIcon) {
      sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
      moonIcon.style.display = theme === 'light' ? 'block' : 'none';
    }
  }

  _applyStoredViewMode() {
    const mode = StorageManager.getViewMode();
    this._setViewMode(mode, false);
  }

  _setViewMode(mode, save = true) {
    if (save) StorageManager.setViewMode(mode);
    this.ui.moviesContainer.className = `movies-grid ${mode === 'list' ? 'view-list' : 'view-grid'}`;
    this.btnViewGrid.classList.toggle('is-active', mode === 'grid');
    this.btnViewList.classList.toggle('is-active', mode === 'list');
  }
}

// Instantiate on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.movieApp = new MovieApp();
});
