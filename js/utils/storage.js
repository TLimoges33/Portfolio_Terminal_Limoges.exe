// Storage utilities for localStorage management

export const StorageManager = {
  /**
   * Save command history to localStorage
   * @param {Array} history - Command history array
   */
  saveHistory(history) {
    const recentHistory = history.slice(-50); // Keep last 50 commands
    localStorage.setItem('commandHistory', JSON.stringify(recentHistory));
  },

  /**
   * Load command history from localStorage
   * @returns {Array} Command history
   */
  loadHistory() {
    return JSON.parse(localStorage.getItem('commandHistory') || '[]');
  },

  /**
   * Track command usage statistics
   * @param {string} command - Command name
   */
  trackCommand(command) {
    const stats = this.loadCommandStats();
    if (!stats[command]) {
      stats[command] = 0;
    }
    stats[command]++;
    localStorage.setItem('commandStats', JSON.stringify(stats));
  },

  /**
   * Load command usage statistics
   * @returns {Object} Command statistics
   */
  loadCommandStats() {
    return JSON.parse(localStorage.getItem('commandStats') || '{}');
  },

  /**
   * Save aliases
   * @param {Object} aliases - Alias mappings
   */
  saveAliases(aliases) {
    localStorage.setItem('terminalAliases', JSON.stringify(aliases));
  },

  /**
   * Load aliases
   * @returns {Object} Alias mappings
   */
  loadAliases() {
    return JSON.parse(localStorage.getItem('terminalAliases') || '{}');
  },

  /**
   * Save installed packages
   * @param {Array} packages - Package list
   */
  savePackages(packages) {
    localStorage.setItem('installedPackages', JSON.stringify(packages));
  },

  /**
   * Load installed packages
   * @returns {Array} Package list
   */
  loadPackages() {
    return JSON.parse(localStorage.getItem('installedPackages') || '[]');
  },

  /**
   * Save custom theme
   * @param {Object} theme - Theme configuration
   */
  saveTheme(theme) {
    localStorage.setItem('customTheme', JSON.stringify(theme));
  },

  /**
   * Load custom theme
   * @returns {Object|null} Theme configuration
   */
  loadTheme() {
    return JSON.parse(localStorage.getItem('customTheme') || 'null');
  },

  /**
   * Increment and save visit count
   * @returns {number} Current visit count
   */
  incrementVisitCount() {
    const count = parseInt(localStorage.getItem('visitCount') || '0') + 1;
    localStorage.setItem('visitCount', count.toString());
    return count;
  },

  /**
   * Get visit count
   * @returns {number} Visit count
   */
  getVisitCount() {
    return parseInt(localStorage.getItem('visitCount') || '0');
  },

  /**
   * Clear all storage
   */
  clearAll() {
    localStorage.clear();
  },
};
