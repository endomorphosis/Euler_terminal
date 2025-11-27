const axios = require('axios');
const BaseDataSource = require('./BaseDataSource');
const logger = require('../utils/logger');

class TradingViewDataSource extends BaseDataSource {
  constructor(config) {
    super('tradingview', config);
    this.baseUrl = config?.baseUrl || 'https://scanner.tradingview.com';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  /**
   * Get current quote for a symbol from TradingView
   */
  async getQuote(symbol) {
    try {
      const { exchange, ticker } = this.parseSymbol(symbol);
      
      const response = await this.client.post(`/${exchange}/scan`, {
        symbols: {
          tickers: [`${exchange}:${ticker}`],
          query: { types: [] }
        },
        columns: ['close', 'volume', 'change']
      });

      const data = response.data?.data?.[0]?.d;
      if (!data) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      return {
        price: data[0],
        volume: data[1],
        changePercent: data[2],
        timestamp: Date.now(),
        source: this.name
      };
    } catch (error) {
      logger.error(`TradingView getQuote error for ${symbol}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get historical data from TradingView
   * Note: TradingView's public API has limited historical data access
   * This implementation returns empty array as real-time scanning is the main feature
   */
  async getHistory(symbol, interval = '1d', limit = 100) {
    // TradingView scanner API doesn't provide historical data
    // Return empty array - historical data should be fetched from other sources
    logger.warn(`TradingView doesn't support historical data via public API for ${symbol}`);
    return [];
  }

  /**
   * TradingView supports most symbols
   */
  supportsSymbol(symbol) {
    return true;
  }

  /**
   * Parse symbol into exchange and ticker
   */
  parseSymbol(symbol) {
    const upper = symbol.toUpperCase();
    
    // Check if it's a crypto pair
    if (/^[A-Z]+USDT?$/.test(upper)) {
      const base = upper.replace(/USDT?$/, '');
      return { exchange: 'crypto', ticker: `${base}USD` };
    }
    
    // For stocks, try to determine the exchange
    // Default to America (covers NYSE, NASDAQ, etc.)
    return { exchange: 'america', ticker: upper };
  }

  /**
   * Normalize symbol for TradingView
   */
  normalizeSymbol(symbol) {
    const { exchange, ticker } = this.parseSymbol(symbol);
    return `${exchange}:${ticker}`;
  }
}

module.exports = TradingViewDataSource;
