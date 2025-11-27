# Euler Terminal

A lightweight, self-contained Node.js market data serverlet that aggregates data from multiple sources with data integrity verification.

## Features

- **Multi-source Data Aggregation**: Fetches market data from Binance, Yahoo Finance, TradingView, and Webull
- **Data Integrity Verification**: Cross-validates prices across multiple sources to ensure accuracy
- **Local Storage**: Uses SQLite for persistent local storage of quotes and historical data
- **REST API**: Simple HTTP REST API for accessing market data
- **Lightweight**: Minimal dependencies, self-contained server

## Installation

```bash
npm install
```

## Configuration

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_PATH` | SQLite database path | `./data/euler.db` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `BINANCE_ENABLED` | Enable Binance data source | `true` |
| `YAHOO_ENABLED` | Enable Yahoo Finance data source | `true` |
| `TRADINGVIEW_ENABLED` | Enable TradingView data source | `true` |
| `WEBULL_ENABLED` | Enable Webull data source | `true` |
| `MAX_DEVIATION` | Maximum allowed price deviation between sources | `0.02` (2%) |
| `MIN_SOURCES` | Minimum sources for integrity verification | `2` |

## Usage

Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server health status.

### List Data Sources
```
GET /api/sources
```
Returns available data sources.

### Get Quote
```
GET /api/quote/:symbol
```
Gets current price quote with data integrity verification.

**Examples:**
- `/api/quote/BTCUSDT` - Bitcoin/USDT crypto pair
- `/api/quote/AAPL` - Apple stock

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "quotes": [
    { "source": "binance", "price": 45000.00, "volume": 1234567, "timestamp": 1699999999999 },
    { "source": "yahoo", "price": 45010.00, "volume": 1234000, "timestamp": 1699999999998 }
  ],
  "integrity": {
    "isValid": true,
    "deviation": 0.0002,
    "consensusPrice": 45005.00,
    "sourcesUsed": 2,
    "message": "Data integrity verified across 2 sources"
  },
  "failedSources": [],
  "timestamp": 1699999999999
}
```

### Get Historical Data
```
GET /api/history/:symbol?interval=1d&limit=100
```
Gets historical OHLCV data.

**Parameters:**
- `interval`: Time interval (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
- `limit`: Number of data points (default: 100)

### Get Integrity Logs
```
GET /api/integrity/:symbol
```
Gets historical data integrity verification logs.

### Get Cached Quotes
```
GET /api/cached/:symbol
```
Gets cached quotes from local database.

## Data Sources

### Binance
- Best for cryptocurrency pairs
- Supports: BTCUSDT, ETHUSDT, etc.
- High reliability and speed

### Yahoo Finance
- Supports both stocks and crypto
- Good for historical data
- Normalizes crypto symbols (BTCUSDT → BTC-USD)

### TradingView
- Scanner API for real-time data
- Limited historical data access
- Supports multiple exchanges

### Webull
- US stocks and some crypto
- Real-time quotes
- Historical kline data

## Data Integrity

The system verifies data integrity by:

1. Fetching prices from multiple sources simultaneously
2. Calculating deviation between sources
3. Using median price as consensus
4. Flagging results when deviation exceeds threshold
5. Logging all integrity checks to database

## Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Project Structure

```
├── src/
│   ├── config/           # Configuration
│   ├── db/               # Database module
│   ├── routes/           # API routes
│   ├── services/         # Data source services
│   │   ├── BaseDataSource.js
│   │   ├── BinanceDataSource.js
│   │   ├── YahooDataSource.js
│   │   ├── TradingViewDataSource.js
│   │   ├── WebullDataSource.js
│   │   └── DataAggregator.js
│   ├── utils/            # Utilities
│   └── index.js          # Main entry point
├── __tests__/            # Test files
└── data/                 # SQLite database (created on first run)
```

## License

ISC