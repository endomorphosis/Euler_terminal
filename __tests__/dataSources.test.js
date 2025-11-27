const BinanceDataSource = require('../src/services/BinanceDataSource');
const YahooDataSource = require('../src/services/YahooDataSource');
const TradingViewDataSource = require('../src/services/TradingViewDataSource');
const WebullDataSource = require('../src/services/WebullDataSource');

// Set up test environment
process.env.LOG_LEVEL = 'error';

describe('Data Sources', () => {
  describe('BinanceDataSource', () => {
    let source;

    beforeEach(() => {
      source = new BinanceDataSource({ enabled: true });
    });

    it('should have correct name', () => {
      expect(source.name).toBe('binance');
    });

    it('should support crypto pairs', () => {
      expect(source.supportsSymbol('BTCUSDT')).toBe(true);
      expect(source.supportsSymbol('ETHBTC')).toBe(true);
    });

    it('should not support stock symbols', () => {
      expect(source.supportsSymbol('AAPL')).toBe(false);
    });

    it('should normalize symbols correctly', () => {
      expect(source.normalizeSymbol('btc-usdt')).toBe('BTCUSDT');
      expect(source.normalizeSymbol('BTC/USDT')).toBe('BTCUSDT');
    });

    it('should map intervals correctly', () => {
      expect(source.mapInterval('1d')).toBe('1d');
      expect(source.mapInterval('1h')).toBe('1h');
      expect(source.mapInterval('invalid')).toBe('1d');
    });
  });

  describe('YahooDataSource', () => {
    let source;

    beforeEach(() => {
      source = new YahooDataSource({ enabled: true });
    });

    it('should have correct name', () => {
      expect(source.name).toBe('yahoo');
    });

    it('should support all symbols', () => {
      expect(source.supportsSymbol('AAPL')).toBe(true);
      expect(source.supportsSymbol('BTCUSDT')).toBe(true);
    });

    it('should normalize crypto symbols correctly', () => {
      expect(source.normalizeSymbol('BTCUSDT')).toBe('BTC-USD');
      expect(source.normalizeSymbol('ETHUSD')).toBe('ETH-USD');
    });

    it('should normalize stock symbols correctly', () => {
      expect(source.normalizeSymbol('AAPL')).toBe('AAPL');
      expect(source.normalizeSymbol('msft')).toBe('MSFT');
    });

    it('should map intervals correctly', () => {
      expect(source.mapInterval('1d')).toBe('1d');
      expect(source.mapInterval('1w')).toBe('1wk');
      expect(source.mapInterval('1M')).toBe('1mo');
    });
  });

  describe('TradingViewDataSource', () => {
    let source;

    beforeEach(() => {
      source = new TradingViewDataSource({ enabled: true });
    });

    it('should have correct name', () => {
      expect(source.name).toBe('tradingview');
    });

    it('should parse crypto symbols correctly', () => {
      const parsed = source.parseSymbol('BTCUSDT');
      expect(parsed.exchange).toBe('crypto');
      expect(parsed.ticker).toBe('BTCUSD');
    });

    it('should parse stock symbols correctly', () => {
      const parsed = source.parseSymbol('AAPL');
      expect(parsed.exchange).toBe('america');
      expect(parsed.ticker).toBe('AAPL');
    });
  });

  describe('WebullDataSource', () => {
    let source;

    beforeEach(() => {
      source = new WebullDataSource({ enabled: true });
    });

    it('should have correct name', () => {
      expect(source.name).toBe('webull');
    });

    it('should normalize symbols correctly', () => {
      expect(source.normalizeSymbol('aapl')).toBe('AAPL');
      expect(source.normalizeSymbol('BTC-USD')).toBe('BTCUSD');
    });

    it('should map intervals correctly', () => {
      expect(source.mapInterval('1d')).toBe('d1');
      expect(source.mapInterval('1h')).toBe('m60');
      expect(source.mapInterval('1w')).toBe('w1');
    });
  });
});
