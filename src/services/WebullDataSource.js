const axios = require('axios');
const BaseDataSource = require('./BaseDataSource');
const logger = require('../utils/logger');

class WebullDataSource extends BaseDataSource {
  constructor(config) {
    super('webull', config);
    this.baseUrl = config?.baseUrl || 'https://quotes-gw.webullfintech.com';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Get current quote for a symbol from Webull
   */
  async getQuote(symbol) {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      
      // First, search for the ticker to get the tickerId
      const tickerId = await this.getTickerId(normalizedSymbol);
      if (!tickerId) {
        throw new Error(`Could not find ticker ID for ${symbol}`);
      }

      // Get real-time quote
      const response = await this.client.get(`/api/quote/ticker/getByTickerId`, {
        params: { tickerId }
      });

      const data = response.data;
      if (!data) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      return {
        price: parseFloat(data.close || data.price),
        volume: parseFloat(data.volume || 0),
        changePercent: parseFloat(data.changeRatio || 0) * 100,
        timestamp: Date.now(),
        source: this.name
      };
    } catch (error) {
      logger.error(`Webull getQuote error for ${symbol}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get ticker ID from symbol
   */
  async getTickerId(symbol) {
    try {
      const response = await this.client.get('/api/search/pc/tickers', {
        params: {
          keyword: symbol,
          pageIndex: 0,
          pageSize: 1
        }
      });

      const data = response.data?.data;
      if (data && data.length > 0) {
        return data[0].tickerId;
      }
      return null;
    } catch (error) {
      logger.error(`Webull getTickerId error for ${symbol}`, { error: error.message });
      return null;
    }
  }

  /**
   * Get historical data from Webull
   */
  async getHistory(symbol, interval = '1d', limit = 100) {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const tickerId = await this.getTickerId(normalizedSymbol);
      
      if (!tickerId) {
        throw new Error(`Could not find ticker ID for ${symbol}`);
      }

      const webullInterval = this.mapInterval(interval);
      
      const response = await this.client.get('/api/quote/ticker/getKLine', {
        params: {
          tickerId,
          type: webullInterval,
          count: limit
        }
      });

      const data = response.data?.data || [];
      return data.map(item => ({
        timestamp: item.date || item.timestamp,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume),
        source: this.name
      }));
    } catch (error) {
      logger.error(`Webull getHistory error for ${symbol}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Webull primarily supports US stocks
   */
  supportsSymbol(symbol) {
    // Webull supports US stocks and some crypto
    return true;
  }

  /**
   * Normalize symbol for Webull
   */
  normalizeSymbol(symbol) {
    return symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Map generic interval to Webull interval format
   */
  mapInterval(interval) {
    const mapping = {
      '1m': 'm1',
      '5m': 'm5',
      '15m': 'm15',
      '30m': 'm30',
      '1h': 'm60',
      '4h': 'm240',
      '1d': 'd1',
      '1w': 'w1',
      '1M': 'mo1'
    };
    return mapping[interval] || 'd1';
  }
}

module.exports = WebullDataSource;
