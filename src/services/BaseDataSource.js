/**
 * Base class for data sources
 */
class BaseDataSource {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.enabled = config?.enabled ?? true;
  }

  /**
   * Get current quote for a symbol
   * @param {string} symbol - The trading symbol
   * @returns {Promise<{price: number, volume?: number, changePercent?: number, timestamp: number}>}
   */
  async getQuote(symbol) {
    throw new Error('getQuote must be implemented by subclass');
  }

  /**
   * Get historical data for a symbol
   * @param {string} symbol - The trading symbol
   * @param {string} interval - The time interval (e.g., '1d', '1h')
   * @param {number} limit - Number of data points
   * @returns {Promise<Array<{open: number, high: number, low: number, close: number, volume: number, timestamp: number}>>}
   */
  async getHistory(symbol, interval = '1d', limit = 100) {
    throw new Error('getHistory must be implemented by subclass');
  }

  /**
   * Check if this data source supports the given symbol
   * @param {string} symbol - The trading symbol
   * @returns {boolean}
   */
  supportsSymbol(symbol) {
    return true;
  }

  /**
   * Normalize symbol for this data source
   * @param {string} symbol - The trading symbol
   * @returns {string}
   */
  normalizeSymbol(symbol) {
    return symbol.toUpperCase();
  }
}

module.exports = BaseDataSource;
