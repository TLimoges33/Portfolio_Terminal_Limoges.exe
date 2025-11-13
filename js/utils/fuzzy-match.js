// Fuzzy matching utilities for autocomplete

export const FuzzyMatcher = {
  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  },

  /**
   * Calculate fuzzy match score (0-1, higher is better)
   * @param {string} input - User input
   * @param {string} candidate - Command to match against
   * @returns {number} Match score
   */
  fuzzyScore(input, candidate) {
    if (!input) return 0;
    if (candidate.startsWith(input)) return 1; // Exact prefix match

    const distance = this.levenshteinDistance(
      input.toLowerCase(),
      candidate.toLowerCase()
    );
    const maxLength = Math.max(input.length, candidate.length);

    // Normalize score to 0-1 range
    return 1 - distance / maxLength;
  },

  /**
   * Find best fuzzy matches from a list
   * @param {string} input - User input
   * @param {Array<string>} candidates - List of commands
   * @param {number} threshold - Minimum score threshold (default 0.5)
   * @param {number} limit - Maximum number of results (default 5)
   * @returns {Array<{command: string, score: number}>} Sorted matches
   */
  findMatches(input, candidates, threshold = 0.5, limit = 5) {
    if (!input) return [];

    const matches = candidates
      .map((cmd) => ({
        command: cmd,
        score: this.fuzzyScore(input, cmd),
      }))
      .filter((m) => m.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return matches;
  },

  /**
   * Get best single match
   * @param {string} input - User input
   * @param {Array<string>} candidates - List of commands
   * @param {number} threshold - Minimum score threshold
   * @returns {string|null} Best matching command or null
   */
  getBestMatch(input, candidates, threshold = 0.7) {
    const matches = this.findMatches(input, candidates, threshold, 1);
    return matches.length > 0 ? matches[0].command : null;
  },
};
