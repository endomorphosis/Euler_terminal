const axios = require('axios');
const BaseDataSource = require('./BaseDataSource');
const logger = require('../utils/logger');

class BinanceDataSource extends BaseDataSource {
  constructor(config) {
    super('binance', config);
    this.baseUrl = config?.baseUrl || 'https://api.binance.com';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
  }

  /**
   * Get current quote for a symbol from Binance
   */
  async getQuote(symbol) {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const response = await this.client.get('/api/v3/ticker/24hr', {
        params: { symbol: normalizedSymbol }
      });

      const data = response.data;
      return {
        price: parseFloat(data.lastPrice),
        volume: parseFloat(data.volume),
        changePercent: parseFloat(data.priceChangePercent),
        timestamp: Date.now(),
        source: this.name
      };
    } catch (error) {
      logger.error(`Binance getQuote error for ${symbol}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get historical data (klines) from Binance
   */
  async getHistory(symbol, interval = '1d', limit = 100) {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const binanceInterval = this.mapInterval(interval);
      
      const response = await this.client.get('/api/v3/klines', {
        params: {
          symbol: normalizedSymbol,
          interval: binanceInterval,
          limit
        }
      });

      return response.data.map(kline => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        source: this.name
      }));
    } catch (error) {
      logger.error(`Binance getHistory error for ${symbol}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Check if symbol is a crypto pair
   */
  supportsSymbol(symbol) {
    // Binance primarily supports crypto pairs
    const cryptoPairs = /^[A-Z]+USDT?$|^[A-Z]+BTC$|^[A-Z]+ETH$|^[A-Z]+BNB$/i;
    return cryptoPairs.test(symbol);
  }

  /**
   * Normalize symbol for Binance (remove any separators)
   */
  normalizeSymbol(symbol) {
    return symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  /**
   * Map generic interval to Binance interval format
   */
  mapInterval(interval) {
    const mapping = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w',
      '1M': '1M'
    };
    return mapping[interval] || '1d';
  }
}

module.exports = BinanceDataSource;
