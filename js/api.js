/**
 * Movie API Service Module
 * Demonstrates ES6+ Features:
 * - ES6 Class syntax
 * - Async / Await with robust error handling
 * - AbortController to cancel out-of-order fetch requests
 * - URL and URLSearchParams for clean query parameter building
 * - Object destructuring & default arguments
 * - Template literals
 * - Custom Error classes
 */

import { CONFIG, FALLBACK_MOVIES } from './config.js';
import { StorageManager } from './storage.js';

export class MovieAPIError extends Error {
  constructor(message, code = 'API_ERROR', details = null) {
    super(message);
    this.name = 'MovieAPIError';
    this.code = code;
    this.details = details;
  }
}

export class MovieAPI {
  constructor() {
    this.currentAbortController = null;
    this.isDemoMode = false;
  }

  /**
   * Builds the API URL with query parameters
   * @param {Record<string, string|number>} params
   * @returns {string}
   */
  _buildUrl(params) {
    const apiKey = StorageManager.getApiKey();
    const url = new URL(CONFIG.BASE_URL);
    url.searchParams.set('apikey', apiKey);

    // Modern Object.entries() iteration
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  /**
   * Search movies by title with optional type, year, and page
   * @param {string} query
   * @param {number} [page=1]
   * @param {string} [type=''] 'movie' | 'series' | 'episode'
   * @param {string} [year='']
   * @returns {Promise<{ movies: Array, totalResults: number, page: number }>}
   */
  async searchMovies(query, page = 1, type = '', year = '') {
    const trimmedQuery = (query ?? '').trim();

    if (!trimmedQuery) {
      throw new MovieAPIError('Please enter a movie title to search.', 'EMPTY_QUERY');
    }

    if (trimmedQuery.length < 2) {
      throw new MovieAPIError('Search query must be at least 2 characters long.', 'QUERY_TOO_SHORT');
    }

    // Check if offline or in Demo Mode
    if (this.isDemoMode || !navigator.onLine) {
      return this._searchFallback(trimmedQuery, page, type, year);
    }

    // Cancel any previous pending search request to avoid race conditions
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();

    try {
      const url = this._buildUrl({
        s: trimmedQuery,
        page,
        type: type || undefined,
        y: year || undefined,
      });

      const response = await fetch(url, {
        signal: this.currentAbortController.signal,
      });

      if (!response.ok) {
        throw new MovieAPIError(
          `Network response was not ok (${response.status} ${response.statusText})`,
          'HTTP_ERROR',
          { status: response.status }
        );
      }

      const data = await response.json();

      // Handle OMDb API error response format
      if (data.Response === 'False') {
        const errorMsg = data.Error || 'Failed to find movies matching your query.';
        let code = 'NOT_FOUND';

        if (/Too many results/i.test(errorMsg)) {
          code = 'TOO_MANY_RESULTS';
        } else if (/Invalid API key/i.test(errorMsg)) {
          code = 'INVALID_API_KEY';
        }

        throw new MovieAPIError(errorMsg, code);
      }

      const totalResults = parseInt(data.totalResults, 10) || (data.Search?.length ?? 0);

      return {
        movies: data.Search || [],
        totalResults,
        page: Number(page),
      };
    } catch (err) {
      // Ignore AbortError when a new request cancelled the previous one
      if (err.name === 'AbortError') {
        throw err;
      }

      // Check if this was a network failure and fallback data can rescue it
      if (err instanceof TypeError && err.message.includes('fetch')) {
        console.warn('Network offline or fetch blocked. Falling back to local demo data.');
        return this._searchFallback(trimmedQuery, page, type, year);
      }

      if (err instanceof MovieAPIError) {
        throw err;
      }

      throw new MovieAPIError(
        err.message || 'An unexpected error occurred while fetching movies.',
        'UNKNOWN_ERROR',
        err
      );
    }
  }

  /**
   * Fetch complete movie details by IMDb ID
   * @param {string} imdbID
   * @returns {Promise<Object>}
   */
  async getMovieDetails(imdbID) {
    if (!imdbID) {
      throw new MovieAPIError('A valid IMDb ID is required.', 'INVALID_ID');
    }

    // Check if offline or in Demo Mode
    if (this.isDemoMode || !navigator.onLine) {
      const local = FALLBACK_MOVIES.find(m => m.imdbID === imdbID);
      if (local) return local;
    }

    try {
      const url = this._buildUrl({
        i: imdbID,
        plot: 'full',
      });

      const response = await fetch(url);
      if (!response.ok) {
        throw new MovieAPIError(`Network error (${response.status})`, 'HTTP_ERROR');
      }

      const data = await response.json();

      if (data.Response === 'False') {
        // Try fallback
        const local = FALLBACK_MOVIES.find(m => m.imdbID === imdbID);
        if (local) return local;

        throw new MovieAPIError(data.Error || 'Could not load movie details.', 'NOT_FOUND');
      }

      return data;
    } catch (err) {
      // Check fallback
      const local = FALLBACK_MOVIES.find(m => m.imdbID === imdbID);
      if (local) return local;

      if (err instanceof MovieAPIError) throw err;
      throw new MovieAPIError('Unable to load movie details. Please try again.', 'NETWORK_ERROR');
    }
  }

  /**
   * Tests whether an API key is valid
   * @param {string} key
   * @returns {Promise<{ valid: boolean, message: string }>}
   */
  async testApiKey(key) {
    const trimmed = (key ?? '').trim();
    if (!trimmed) {
      return { valid: false, message: 'API Key cannot be empty.' };
    }

    try {
      const url = new URL(CONFIG.BASE_URL);
      url.searchParams.set('apikey', trimmed);
      url.searchParams.set('s', 'Batman');
      url.searchParams.set('page', '1');

      const res = await fetch(url.toString());
      if (!res.ok) {
        return { valid: false, message: `Server returned status ${res.status}` };
      }

      const data = await res.json();
      if (data.Response === 'False') {
        if (/Invalid API key/i.test(data.Error)) {
          return { valid: false, message: 'Invalid API key. Please check your credentials.' };
        }
      }

      return { valid: true, message: 'API key is valid and working!' };
    } catch (err) {
      return { valid: false, message: `Connection test failed: ${err.message}` };
    }
  }

  /**
   * Helper to search through fallback dataset
   */
  _searchFallback(query, page = 1, type = '', year = '') {
    const q = query.toLowerCase();
    const filtered = FALLBACK_MOVIES.filter(movie => {
      const matchTitle = movie.Title.toLowerCase().includes(q) ||
                         movie.Actors.toLowerCase().includes(q) ||
                         movie.Director.toLowerCase().includes(q) ||
                         movie.Genre.toLowerCase().includes(q);
      const matchType = !type || movie.Type === type;
      const matchYear = !year || movie.Year.includes(year);
      return matchTitle && matchType && matchYear;
    });

    if (filtered.length === 0) {
      throw new MovieAPIError(
        `No demo movies found matching "${query}". Try "Inception", "Dark Knight", or "Interstellar" while offline.`,
        'NOT_FOUND'
      );
    }

    return {
      movies: filtered,
      totalResults: filtered.length,
      page: 1,
      isDemo: true,
    };
  }
}
