const axios = require('axios');
const BaseDataSource = require('./BaseDataSource');
const logger = require('../utils/logger');

class YahooDataSource extends BaseDataSource {
  constructor(config) {
    super('yahoo', config);
    this.baseUrl = config?.baseUrl || 'https://query1.finance.yahoo.com';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  /**
   * Get current quote for a symbol from Yahoo Finance
   */
  async getQuote(symbol) {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const response = await this.client.get('/v7/finance/quote', {
        params: {
          symbols: normalizedSymbol,
          fields: 'regularMarketPrice,regularMarketVolume,regularMarketChangePercent'
        }
      });

      const result = response.data?.quoteResponse?.result?.[0];
      if (!result) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      return {
        price: result.regularMarketPrice,
        volume: result.regularMarketVolume,
        changePercent: result.regularMarketChangePercent,
        timestamp: Date.now(),
        source: this.name
      };
    } catch (error) {
      logger.error(`Yahoo getQuote error for ${symbol}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get historical data from Yahoo Finance
   */
  async getHistory(symbol, interval = '1d', limit = 100) {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const yahooInterval = this.mapInterval(interval);
      const range = this.getRange(interval, limit);

      const response = await this.client.get(`/v8/finance/chart/${normalizedSymbol}`, {
        params: {
          interval: yahooInterval,
          range: range
        }
      });

      const chart = response.data?.chart?.result?.[0];
      if (!chart) {
        throw new Error(`No historical data found for symbol ${symbol}`);
      }

      const timestamps = chart.timestamp || [];
      const quotes = chart.indicators?.quote?.[0] || {};

      return timestamps.map((ts, i) => ({
        timestamp: ts * 1000, // Convert to milliseconds
        open: quotes.open?.[i],
        high: quotes.high?.[i],
        low: quotes.low?.[i],
        close: quotes.close?.[i],
        volume: quotes.volume?.[i],
        source: this.name
      })).filter(item => item.close !== null);
    } catch (error) {
      logger.error(`Yahoo getHistory error for ${symbol}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Yahoo supports most stock symbols
   */
  supportsSymbol(symbol) {
    return true;
  }

  /**
   * Normalize symbol for Yahoo Finance
   * Crypto pairs need special formatting
   */
  normalizeSymbol(symbol) {
    const upper = symbol.toUpperCase();
    // Convert crypto pairs like BTCUSDT to BTC-USD format
    if (/^[A-Z]+USDT$/.test(upper)) {
      return upper.replace(/USDT$/, '-USD');
    }
    // Also handle USD suffix
    if (/^[A-Z]+USD$/.test(upper)) {
      return upper.replace(/USD$/, '-USD');
    }
    return upper;
  }

  /**
   * Map generic interval to Yahoo interval format
   */
  mapInterval(interval) {
    const mapping = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '1h', // Yahoo doesn't have 4h, use 1h
      '1d': '1d',
      '1w': '1wk',
      '1M': '1mo'
    };
    return mapping[interval] || '1d';
  }

  /**
   * Get the appropriate range parameter based on interval and limit
   */
  getRange(interval, limit) {
    const intervalRanges = {
      '1m': '1d',
      '5m': '5d',
      '15m': '5d',
      '30m': '1mo',
      '1h': '1mo',
      '4h': '3mo',
      '1d': limit > 250 ? '5y' : '1y',
      '1w': '5y',
      '1M': 'max'
    };
    return intervalRanges[interval] || '1y';
  }
}

module.exports = YahooDataSource;
