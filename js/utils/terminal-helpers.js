// Terminal helper utilities

export const TerminalHelpers = {
  /**
   * Format text with colors
   * @param {string} text - Text to format
   * @param {string} color - Color code
   * @returns {string} Formatted text
   */
  colorize(text, color) {
    const colors = {
      green: '\x1b[1;32m',
      yellow: '\x1b[1;33m',
      red: '\x1b[1;31m',
      blue: '\x1b[1;36m',
      purple: '\x1b[1;35m',
      gray: '\x1b[90m',
      reset: '\x1b[0m',
    };

    return `${colors[color] || ''}${text}${colors.reset}`;
  },

  /**
   * Create a box around text
   * @param {string} text - Text to box
   * @param {string} color - Box color
   * @returns {Array<string>} Box lines
   */
  createBox(text, color = 'green') {
    const lines = text.split('\n');
    const maxLength = Math.max(...lines.map((l) => l.length));
    const topBottom = '═'.repeat(maxLength + 2);

    const result = [this.colorize(`╔${topBottom}╗`, color)];

    lines.forEach((line) => {
      const padding = ' '.repeat(maxLength - line.length);
      result.push(this.colorize(`║ ${line}${padding} ║`, color));
    });

    result.push(this.colorize(`╚${topBottom}╝`, color));

    return result;
  },

  /**
   * Create a progress bar
   * @param {number} percent - Progress percentage (0-100)
   * @param {number} width - Bar width in characters
   * @returns {string} Progress bar string
   */
  progressBar(percent, width = 40) {
    const filled = Math.floor((percent / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percent}%`;
  },

  /**
   * Format timestamp
   * @param {Date} date - Date object
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(date = new Date()) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  },

  /**
   * Format file size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  },

  /**
   * Create a table from data
   * @param {Array<Object>} data - Table data
   * @param {Array<string>} headers - Column headers
   * @returns {Array<string>} Table lines
   */
  createTable(data, headers) {
    const rows = [headers];
    data.forEach((item) => {
      rows.push(headers.map((h) => String(item[h] || '')));
    });

    // Calculate column widths
    const widths = headers.map((_, colIndex) =>
      Math.max(...rows.map((row) => row[colIndex].length))
    );

    // Format rows
    const lines = [];
    const separator = '─'.repeat(widths.reduce((a, b) => a + b + 3, 1));

    lines.push(separator);
    rows.forEach((row, index) => {
      const formatted = row
        .map((cell, i) => cell.padEnd(widths[i]))
        .join(' │ ');
      lines.push(`│ ${formatted} │`);

      if (index === 0) lines.push(separator);
    });
    lines.push(separator);

    return lines;
  },
};
