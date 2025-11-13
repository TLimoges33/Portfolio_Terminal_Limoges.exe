// Error handling utilities

export const ErrorHandler = {
  /**
   * Global error handler
   * @param {Terminal} term - Terminal instance
   */
  setupGlobalHandlers(term) {
    window.addEventListener('error', (event) => {
      console.error('[Portfolio Error]', event.error);
      if (term) {
        term.writeln('\r\n\x1b[1;31m✗ Unexpected error occurred\x1b[0m');
        term.writeln(
          '\x1b[90mPlease refresh the page. Error logged to console.\x1b[0m'
        );
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Portfolio Promise Rejection]', event.reason);
      if (term) {
        term.writeln('\r\n\x1b[1;31m✗ Async operation failed\x1b[0m');
        term.writeln(
          '\x1b[90mError: ' + (event.reason?.message || 'Unknown') + '\x1b[0m'
        );
      }
    });
  },

  /**
   * Wrap async function with error handling
   * @param {Function} fn - Function to wrap
   * @param {Terminal} term - Terminal instance
   * @returns {Function} Wrapped function
   */
  wrapAsync(fn, term) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error('[Portfolio] Async error:', error);
        if (term) {
          term.writeln(`\r\n\x1b[1;31m✗ Error: ${error.message}\x1b[0m`);
          term.writeln(
            '\x1b[90mThis error has been logged. Please try again.\x1b[0m'
          );
        }
        throw error;
      }
    };
  },

  /**
   * Retry function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} delay - Initial delay in ms
   * @returns {Promise<*>} Function result
   */
  async retry(fn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError;
  },
};
