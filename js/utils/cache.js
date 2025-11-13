// Command cache utilities

export const CommandCache = {
  cache: {},
  CACHE_DURATION: 60000, // 1 minute

  /**
   * Get cached command result if still valid
   * @param {string} command - Command string
   * @returns {*|null} Cached result or null
   */
  get(command) {
    const cached = this.cache[command];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    return null;
  },

  /**
   * Store command result in cache
   * @param {string} command - Command string
   * @param {*} result - Command result
   */
  set(command, result) {
    this.cache[command] = {
      result: result,
      timestamp: Date.now(),
    };
  },

  /**
   * Clear all cached results
   */
  clear() {
    this.cache = {};
  },

  /**
   * Remove expired cache entries
   */
  cleanup() {
    const now = Date.now();
    Object.keys(this.cache).forEach((key) => {
      if (now - this.cache[key].timestamp >= this.CACHE_DURATION) {
        delete this.cache[key];
      }
    });
  },
};

// Auto-cleanup every 5 minutes
setInterval(() => CommandCache.cleanup(), 5 * 60 * 1000);
