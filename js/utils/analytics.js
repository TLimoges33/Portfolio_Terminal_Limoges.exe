// Analytics and tracking utilities

export const Analytics = {
  /**
   * Track command usage with Google Analytics
   * @param {string} command - Command name
   */
  trackCommand(command) {
    if (window.gtag) {
      gtag('event', 'command_executed', {
        command_name: command,
        timestamp: new Date().toISOString(),
      });
    }
  },

  /**
   * Log error to console and analytics
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  logError(error, context) {
    console.error(`[Portfolio Error] ${context}:`, error);
    if (window.gtag) {
      gtag('event', 'exception', {
        description: `${context}: ${error.message}`,
        fatal: false,
      });
    }
  },

  /**
   * Track page view
   * @param {string} page - Page path
   */
  trackPageView(page) {
    if (window.gtag) {
      gtag('config', 'G-XXXXXXXXXX', {
        page_path: page,
      });
    }
  },

  /**
   * Track custom event
   * @param {string} category - Event category
   * @param {string} action - Event action
   * @param {string} label - Event label
   * @param {number} value - Event value
   */
  trackEvent(category, action, label, value) {
    if (window.gtag) {
      gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }
  },
};
