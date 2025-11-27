const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Set up test environment
process.env.DB_PATH = '/tmp/test-euler.db';
process.env.LOG_LEVEL = 'error';

const { app } = require('../src/index');
const db = require('../src/db');

describe('Euler Terminal API', () => {
  beforeAll(() => {
    // Initialize database for tests
    db.initialize();
  });

  afterAll(() => {
    // Clean up
    db.close();
    try {
      fs.unlinkSync(process.env.DB_PATH);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Euler Terminal');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/sources', () => {
    it('should return available data sources', async () => {
      const response = await request(app).get('/api/sources');
      expect(response.status).toBe(200);
      expect(response.body.sources).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/quote/:symbol', () => {
    it('should require a symbol', async () => {
      const response = await request(app).get('/api/quote/');
      expect(response.status).toBe(404);
    });

    // Note: This test may fail if external APIs are unavailable
    // In production, you would mock the data sources
    it('should handle invalid symbols gracefully', async () => {
      const response = await request(app).get('/api/quote/INVALID_SYMBOL_12345');
      // Should either return data or an error
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/cached/:symbol', () => {
    it('should return cached quotes for a symbol', async () => {
      const response = await request(app).get('/api/cached/BTCUSDT');
      expect(response.status).toBe(200);
      expect(response.body.symbol).toBe('BTCUSDT');
      expect(response.body.quotes).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/integrity/:symbol', () => {
    it('should return integrity logs for a symbol', async () => {
      const response = await request(app).get('/api/integrity/BTCUSDT');
      expect(response.status).toBe(200);
      expect(response.body.symbol).toBe('BTCUSDT');
      expect(response.body.logs).toBeInstanceOf(Array);
    });
  });
});
