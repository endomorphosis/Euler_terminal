const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');
const apiRoutes = require('./routes/api');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, { 
    query: req.query,
    ip: req.ip 
  });
  next();
});

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Euler Terminal',
    version: '1.0.0',
    description: 'Market data aggregation with multi-source data integrity verification',
    endpoints: {
      health: 'GET /api/health',
      sources: 'GET /api/sources',
      quote: 'GET /api/quote/:symbol',
      history: 'GET /api/history/:symbol?interval=1d&limit=100',
      integrity: 'GET /api/integrity/:symbol',
      cached: 'GET /api/cached/:symbol'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
function start() {
  try {
    db.initialize();
    
    const server = app.listen(config.port, () => {
      logger.info(`Euler Terminal server started on port ${config.port}`);
      logger.info(`API available at http://localhost:${config.port}/api`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

    return server;
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

function gracefulShutdown(server) {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    db.close();
    logger.info('Server closed');
    process.exit(0);
  });
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

module.exports = { app, start };
