require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  dbPath: process.env.DB_PATH || './data/euler.db',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Data source configurations
  dataSources: {
    binance: {
      enabled: process.env.BINANCE_ENABLED !== 'false',
      baseUrl: 'https://api.binance.com',
      apiKey: process.env.BINANCE_API_KEY || '',
      secretKey: process.env.BINANCE_SECRET_KEY || ''
    },
    yahoo: {
      enabled: process.env.YAHOO_ENABLED !== 'false',
      baseUrl: 'https://query1.finance.yahoo.com'
    },
    tradingview: {
      enabled: process.env.TRADINGVIEW_ENABLED !== 'false',
      baseUrl: 'https://scanner.tradingview.com'
    },
    webull: {
      enabled: process.env.WEBULL_ENABLED !== 'false',
      baseUrl: 'https://quotes-gw.webullfintech.com'
    }
  },

  // Data integrity settings
  dataIntegrity: {
    // Maximum allowed percentage deviation between sources
    maxDeviation: parseFloat(process.env.MAX_DEVIATION || '0.02'), // 2% default
    // Minimum number of sources required for validation
    minSources: parseInt(process.env.MIN_SOURCES || '2', 10)
  },

  // Cache settings (in milliseconds)
  cache: {
    quoteTTL: parseInt(process.env.QUOTE_TTL || '5000', 10), // 5 seconds
    historyTTL: parseInt(process.env.HISTORY_TTL || '60000', 10) // 1 minute
  }
};
