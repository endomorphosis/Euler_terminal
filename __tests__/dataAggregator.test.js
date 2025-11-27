const { DataAggregator } = require('../src/services');

// Set up test environment
process.env.LOG_LEVEL = 'error';

describe('DataAggregator', () => {
  let aggregator;

  beforeEach(() => {
    aggregator = new DataAggregator();
  });

  describe('getAvailableSources', () => {
    it('should return list of enabled sources', () => {
      const sources = aggregator.getAvailableSources();
      expect(sources).toBeInstanceOf(Array);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources[0]).toHaveProperty('name');
      expect(sources[0]).toHaveProperty('enabled');
    });
  });

  describe('getSourcesForSymbol', () => {
    it('should return sources that support crypto pairs', () => {
      const sources = aggregator.getSourcesForSymbol('BTCUSDT');
      expect(sources).toBeInstanceOf(Array);
      expect(sources.length).toBeGreaterThan(0);
    });

    it('should return sources that support stocks', () => {
      const sources = aggregator.getSourcesForSymbol('AAPL');
      expect(sources).toBeInstanceOf(Array);
      expect(sources.length).toBeGreaterThan(0);
    });
  });

  describe('verifyDataIntegrity', () => {
    it('should verify data integrity with matching prices', () => {
      const quotes = [
        { source: 'source1', price: 100.00 },
        { source: 'source2', price: 100.50 },
        { source: 'source3', price: 99.50 }
      ];
      
      const result = aggregator.verifyDataIntegrity(quotes);
      expect(result.isValid).toBe(true);
      expect(result.deviation).toBeLessThan(0.02);
      expect(result.sourcesUsed).toBe(3);
    });

    it('should detect data integrity issues with large deviations', () => {
      const quotes = [
        { source: 'source1', price: 100.00 },
        { source: 'source2', price: 120.00 },
        { source: 'source3', price: 80.00 }
      ];
      
      const result = aggregator.verifyDataIntegrity(quotes);
      expect(result.isValid).toBe(false);
      expect(result.deviation).toBeGreaterThan(0.02);
    });

    it('should handle single source', () => {
      const quotes = [
        { source: 'source1', price: 100.00 }
      ];
      
      const result = aggregator.verifyDataIntegrity(quotes);
      expect(result.isValid).toBe(true);
      expect(result.consensusPrice).toBe(100.00);
      expect(result.message).toContain('Only one source');
    });

    it('should calculate median price correctly', () => {
      const quotes = [
        { source: 'source1', price: 100.00 },
        { source: 'source2', price: 102.00 },
        { source: 'source3', price: 104.00 }
      ];
      
      const result = aggregator.verifyDataIntegrity(quotes);
      expect(result.consensusPrice).toBe(102.00);
    });
  });
});
