const express = require('express');
const { DataAggregator } = require('../services');
const db = require('../db');
const logger = require('../utils/logger');

const router = express.Router();
const aggregator = new DataAggregator();

// Maximum allowed limit for query results
const MAX_LIMIT = 1000;
const DEFAULT_HISTORY_LIMIT = 100;
const DEFAULT_INTEGRITY_LIMIT = 50;
const DEFAULT_CACHED_LIMIT = 10;

/**
 * Validate and clamp limit parameter
 */
function validateLimit(value, defaultValue) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    return defaultValue;
  }
  return Math.min(parsed, MAX_LIMIT);
}

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/sources
 * List available data sources
 */
router.get('/sources', (req, res) => {
  const sources = aggregator.getAvailableSources();
  res.json({
    sources,
    count: sources.length
  });
});

/**
 * GET /api/quote/:symbol
 * Get current quote with data integrity verification
 */
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const result = await aggregator.getQuoteWithIntegrity(symbol);
    res.json(result);
  } catch (error) {
    logger.error('Quote endpoint error', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to fetch quote', 
      message: error.message 
    });
  }
});

/**
 * GET /api/history/:symbol
 * Get historical data for a symbol
 */
router.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d', limit = DEFAULT_HISTORY_LIMIT } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const validatedLimit = validateLimit(limit, DEFAULT_HISTORY_LIMIT);
    const result = await aggregator.getHistory(symbol, interval, validatedLimit);
    res.json(result);
  } catch (error) {
    logger.error('History endpoint error', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to fetch history', 
      message: error.message 
    });
  }
});

/**
 * GET /api/integrity/:symbol
 * Get data integrity logs for a symbol
 */
router.get('/integrity/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = DEFAULT_INTEGRITY_LIMIT } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const validatedLimit = validateLimit(limit, DEFAULT_INTEGRITY_LIMIT);
    const logs = db.getIntegrityLogs(symbol.toUpperCase(), validatedLimit);
    res.json({
      symbol: symbol.toUpperCase(),
      logs,
      count: logs.length
    });
  } catch (error) {
    logger.error('Integrity endpoint error', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to fetch integrity logs', 
      message: error.message 
    });
  }
});

/**
 * GET /api/cached/:symbol
 * Get cached quotes for a symbol
 */
router.get('/cached/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = DEFAULT_CACHED_LIMIT } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const validatedLimit = validateLimit(limit, DEFAULT_CACHED_LIMIT);
    const quotes = db.getLatestQuotes(symbol.toUpperCase(), validatedLimit);
    res.json({
      symbol: symbol.toUpperCase(),
      quotes,
      count: quotes.length
    });
  } catch (error) {
    logger.error('Cached endpoint error', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to fetch cached quotes', 
      message: error.message 
    });
  }
});

module.exports = router;
