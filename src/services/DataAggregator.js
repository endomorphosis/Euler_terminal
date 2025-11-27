const config = require('../config');
const logger = require('../utils/logger');
const db = require('../db');

const BinanceDataSource = require('./BinanceDataSource');
const YahooDataSource = require('./YahooDataSource');
const TradingViewDataSource = require('./TradingViewDataSource');
const WebullDataSource = require('./WebullDataSource');

class DataAggregator {
  constructor() {
    this.sources = [];
    this.initializeSources();
  }

  /**
   * Initialize all enabled data sources
   */
  initializeSources() {
    const sourceConfigs = config.dataSources;

    if (sourceConfigs.binance?.enabled) {
      this.sources.push(new BinanceDataSource(sourceConfigs.binance));
    }
    if (sourceConfigs.yahoo?.enabled) {
      this.sources.push(new YahooDataSource(sourceConfigs.yahoo));
    }
    if (sourceConfigs.tradingview?.enabled) {
      this.sources.push(new TradingViewDataSource(sourceConfigs.tradingview));
    }
    if (sourceConfigs.webull?.enabled) {
      this.sources.push(new WebullDataSource(sourceConfigs.webull));
    }

    logger.info('Data sources initialized', {
      sources: this.sources.map(s => s.name)
    });
  }

  /**
   * Get list of available sources
   */
  getAvailableSources() {
    return this.sources.map(s => ({
      name: s.name,
      enabled: s.enabled
    }));
  }

  /**
   * Get sources that support a given symbol
   */
  getSourcesForSymbol(symbol) {
    return this.sources.filter(s => s.supportsSymbol(symbol));
  }

  /**
   * Get quote from all available sources and verify data integrity
   */
  async getQuoteWithIntegrity(symbol) {
    const supportedSources = this.getSourcesForSymbol(symbol);
    
    if (supportedSources.length === 0) {
      throw new Error(`No data sources support symbol ${symbol}`);
    }

    // Fetch from all sources in parallel
    const results = await Promise.allSettled(
      supportedSources.map(source => source.getQuote(symbol))
    );

    // Collect successful results
    const quotes = [];
    const failedSources = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        quotes.push(result.value);
      } else {
        failedSources.push({
          source: supportedSources[index].name,
          error: result.reason.message
        });
      }
    });

    if (quotes.length === 0) {
      throw new Error(`Failed to get quote from any source for ${symbol}`);
    }

    // Perform data integrity check
    const integrityResult = this.verifyDataIntegrity(quotes);

    // Log integrity check to database
    try {
      db.logIntegrityCheck(
        symbol,
        quotes.map(q => q.source),
        quotes.map(q => q.price),
        integrityResult.deviation,
        integrityResult.isValid,
        integrityResult.consensusPrice
      );
    } catch (err) {
      logger.error('Failed to log integrity check', { error: err.message });
    }

    // Store quotes in database
    for (const quote of quotes) {
      try {
        db.insertQuote(
          symbol,
          quote.source,
          quote.price,
          quote.volume,
          quote.changePercent,
          quote.timestamp
        );
      } catch (err) {
        logger.error('Failed to store quote', { source: quote.source, error: err.message });
      }
    }

    return {
      symbol,
      quotes,
      integrity: integrityResult,
      failedSources,
      timestamp: Date.now()
    };
  }

  /**
   * Verify data integrity across multiple sources
   */
  verifyDataIntegrity(quotes) {
    if (quotes.length < 2) {
      return {
        isValid: true,
        deviation: 0,
        consensusPrice: quotes[0]?.price || 0,
        message: 'Only one source available, cannot verify cross-source integrity',
        sourcesUsed: quotes.length
      };
    }

    const prices = quotes.map(q => q.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Calculate maximum deviation from average
    const deviations = prices.map(p => Math.abs((p - avgPrice) / avgPrice));
    const maxDeviation = Math.max(...deviations);

    // Use median price as consensus for more robustness
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const medianPrice = sortedPrices.length % 2 === 0
      ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
      : sortedPrices[Math.floor(sortedPrices.length / 2)];

    const isValid = maxDeviation <= config.dataIntegrity.maxDeviation;

    let message;
    if (isValid) {
      message = `Data integrity verified across ${quotes.length} sources`;
    } else {
      message = `Data integrity warning: ${(maxDeviation * 100).toFixed(2)}% deviation detected`;
    }

    return {
      isValid,
      deviation: maxDeviation,
      consensusPrice: medianPrice,
      averagePrice: avgPrice,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      sourcesUsed: quotes.length,
      message
    };
  }

  /**
   * Get historical data from the best available source
   */
  async getHistory(symbol, interval = '1d', limit = 100) {
    const supportedSources = this.getSourcesForSymbol(symbol);
    
    // Try each source until one succeeds
    for (const source of supportedSources) {
      try {
        const history = await source.getHistory(symbol, interval, limit);
        if (history && history.length > 0) {
          // Store in database
          try {
            db.insertHistory(symbol, source.name, history, interval);
          } catch (err) {
            logger.error('Failed to store history', { error: err.message });
          }
          
          return {
            symbol,
            interval,
            source: source.name,
            data: history,
            count: history.length
          };
        }
      } catch (error) {
        logger.warn(`Failed to get history from ${source.name}`, { error: error.message });
      }
    }

    // Try to return cached data from database
    const cachedHistory = db.getHistory(symbol, interval, limit);
    if (cachedHistory && cachedHistory.length > 0) {
      return {
        symbol,
        interval,
        source: 'cache',
        data: cachedHistory,
        count: cachedHistory.length,
        cached: true
      };
    }

    throw new Error(`Failed to get historical data for ${symbol}`);
  }
}

module.exports = DataAggregator;
