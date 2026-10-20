/**
 * Storage Manager Module
 * Demonstrates ES6+ Features:
 * - ES6 Class syntax
 * - Static methods & properties
 * - Set data structures for unique values
 * - Array methods (.filter, .map, .some)
 * - Object destructuring & spread syntax
 * - JSON serialization with safe error boundaries
 */

import { CONFIG, FALLBACK_MOVIES } from './config.js';

export class StorageManager {
  /**
   * Safe localStorage getter
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  static getItem(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (err) {
      console.warn(`Failed reading '${key}' from localStorage:`, err);
      return defaultValue;
    }
  }

  /**
   * Safe localStorage setter
   * @param {string} key
   * @param {*} value
   */
  static setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Failed saving '${key}' to localStorage:`, err);
    }
  }

  /* ================= API KEY ================= */

  static getApiKey() {
    return this.getItem(CONFIG.STORAGE_KEYS.API_KEY, CONFIG.DEFAULT_API_KEY);
  }

  static setApiKey(key) {
    const trimmed = (key ?? '').trim();
    if (trimmed) {
      this.setItem(CONFIG.STORAGE_KEYS.API_KEY, trimmed);
    } else {
      this.resetApiKey();
    }
  }

  static resetApiKey() {
    this.setItem(CONFIG.STORAGE_KEYS.API_KEY, CONFIG.DEFAULT_API_KEY);
  }

  /* ================= WATCHLIST ================= */

  static getWatchlist() {
    return this.getItem(CONFIG.STORAGE_KEYS.WATCHLIST, []);
  }

  static isInWatchlist(imdbID) {
    const list = this.getWatchlist();
    return list.some(item => item.imdbID === imdbID);
  }

  static addToWatchlist(movie) {
    const list = this.getWatchlist();
    if (!list.some(item => item.imdbID === movie.imdbID)) {
      // Store essential fields to save storage
      const itemToSave = {
        imdbID: movie.imdbID,
        Title: movie.Title,
        Year: movie.Year,
        Type: movie.Type ?? 'movie',
        Poster: movie.Poster,
        imdbRating: movie.imdbRating ?? 'N/A',
        Genre: movie.Genre ?? 'N/A',
        savedAt: new Date().toISOString(),
      };
      this.setItem(CONFIG.STORAGE_KEYS.WATCHLIST, [itemToSave, ...list]);
      return true;
    }
    return false;
  }

  static removeFromWatchlist(imdbID) {
    const list = this.getWatchlist();
    const updated = list.filter(item => item.imdbID !== imdbID);
    this.setItem(CONFIG.STORAGE_KEYS.WATCHLIST, updated);
    return updated.length < list.length;
  }

  static toggleWatchlist(movie) {
    if (this.isInWatchlist(movie.imdbID)) {
      this.removeFromWatchlist(movie.imdbID);
      return false; // Now removed
    } else {
      this.addToWatchlist(movie);
      return true; // Now added
    }
  }

  static clearWatchlist() {
    this.setItem(CONFIG.STORAGE_KEYS.WATCHLIST, []);
  }

  /* ================= SEARCH HISTORY ================= */

  static getSearchHistory() {
    return this.getItem(CONFIG.STORAGE_KEYS.SEARCH_HISTORY, []);
  }

  static addSearchHistory(query) {
    const trimmed = (query ?? '').trim();
    if (!trimmed || trimmed.length < 2) return;

    const current = this.getSearchHistory();
    // Unique list keeping newest first
    const updated = [
      trimmed,
      ...current.filter(item => item.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, CONFIG.MAX_HISTORY_ITEMS);

    this.setItem(CONFIG.STORAGE_KEYS.SEARCH_HISTORY, updated);
  }

  static removeSearchHistoryItem(query) {
    const current = this.getSearchHistory();
    const updated = current.filter(item => item.toLowerCase() !== query.toLowerCase());
    this.setItem(CONFIG.STORAGE_KEYS.SEARCH_HISTORY, updated);
  }

  static clearSearchHistory() {
    this.setItem(CONFIG.STORAGE_KEYS.SEARCH_HISTORY, []);
  }

  /* ================= THEME & VIEW MODE ================= */

  static getTheme() {
    return this.getItem(CONFIG.STORAGE_KEYS.THEME, 'dark');
  }

  static setTheme(theme) {
    this.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
  }

  static getViewMode() {
    return this.getItem(CONFIG.STORAGE_KEYS.VIEW_MODE, 'grid');
  }

  static setViewMode(mode) {
    this.setItem(CONFIG.STORAGE_KEYS.VIEW_MODE, mode);
  }
}
