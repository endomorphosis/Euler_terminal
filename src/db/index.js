const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

let db = null;

/**
 * Initialize the SQLite database
 */
function initialize() {
  try {
    // Ensure data directory exists
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    
    createTables();
    logger.info('Database initialized successfully', { path: config.dbPath });
    
    return db;
  } catch (error) {
    logger.error('Failed to initialize database', { error: error.message });
    throw error;
  }
}

/**
 * Create required database tables
 */
function createTables() {
  // Quotes table for storing price data
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      source TEXT NOT NULL,
      price REAL NOT NULL,
      volume REAL,
      change_percent REAL,
      timestamp INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(symbol, source, timestamp)
    )
  `);

  // Historical data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      source TEXT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL NOT NULL,
      volume REAL,
      timestamp INTEGER NOT NULL,
      interval TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(symbol, source, timestamp, interval)
    )
  `);

  // Data integrity logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS integrity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      sources_used TEXT NOT NULL,
      prices TEXT NOT NULL,
      deviation REAL NOT NULL,
      is_valid INTEGER NOT NULL,
      consensus_price REAL,
      timestamp INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_quotes_symbol_timestamp ON quotes(symbol, timestamp);
    CREATE INDEX IF NOT EXISTS idx_history_symbol_timestamp ON history(symbol, timestamp);
    CREATE INDEX IF NOT EXISTS idx_integrity_symbol ON integrity_logs(symbol);
  `);
}

/**
 * Get the database instance
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initialize() first.');
  }
  return db;
}

/**
 * Insert a quote into the database
 */
function insertQuote(symbol, source, price, volume, changePercent, timestamp) {
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO quotes (symbol, source, price, volume, change_percent, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(symbol, source, price, volume, changePercent, timestamp);
}

/**
 * Get latest quotes for a symbol
 */
function getLatestQuotes(symbol, limit = 10) {
  const stmt = getDb().prepare(`
    SELECT * FROM quotes 
    WHERE symbol = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `);
  return stmt.all(symbol, limit);
}

/**
 * Insert historical data
 */
function insertHistory(symbol, source, data, interval) {
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO history (symbol, source, open, high, low, close, volume, timestamp, interval)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = getDb().transaction((items) => {
    for (const item of items) {
      stmt.run(
        symbol, source, 
        item.open, item.high, item.low, item.close, 
        item.volume, item.timestamp, interval
      );
    }
  });
  
  return insertMany(data);
}

/**
 * Get historical data for a symbol
 */
function getHistory(symbol, interval = '1d', limit = 100) {
  const stmt = getDb().prepare(`
    SELECT * FROM history 
    WHERE symbol = ? AND interval = ?
    ORDER BY timestamp DESC 
    LIMIT ?
  `);
  return stmt.all(symbol, interval, limit);
}

/**
 * Log data integrity check
 */
function logIntegrityCheck(symbol, sourcesUsed, prices, deviation, isValid, consensusPrice) {
  const stmt = getDb().prepare(`
    INSERT INTO integrity_logs (symbol, sources_used, prices, deviation, is_valid, consensus_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    symbol,
    JSON.stringify(sourcesUsed),
    JSON.stringify(prices),
    deviation,
    isValid ? 1 : 0,
    consensusPrice
  );
}

/**
 * Get integrity logs for a symbol
 */
function getIntegrityLogs(symbol, limit = 50) {
  const stmt = getDb().prepare(`
    SELECT * FROM integrity_logs 
    WHERE symbol = ?
    ORDER BY timestamp DESC 
    LIMIT ?
  `);
  return stmt.all(symbol, limit);
}

/**
 * Close the database connection
 */
function close() {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

module.exports = {
  initialize,
  getDb,
  insertQuote,
  getLatestQuotes,
  insertHistory,
  getHistory,
  logIntegrityCheck,
  getIntegrityLogs,
  close
};
