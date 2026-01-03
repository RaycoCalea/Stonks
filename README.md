# 🔶 STONKS Terminal

A Bloomberg-style terminal dashboard for fetching comprehensive market data for stocks and cryptocurrencies.

![Terminal](https://img.shields.io/badge/style-terminal-black?style=flat-square)
![Python](https://img.shields.io/badge/python-3.9+-blue?style=flat-square)
![React](https://img.shields.io/badge/react-18-61dafb?style=flat-square)

## Features

- **Stocks** - Comprehensive equity data via Yahoo Finance
  - Price data, valuations, financials
  - Balance sheet, margins, analyst recommendations
  - Historical OHLCV with customizable intervals
  
- **Crypto** - Full cryptocurrency data via CoinGecko
  - Real-time prices, market cap, volume
  - Supply metrics, sentiment scores
  - Historical price charts

- **Terminal Aesthetic** - Bloomberg-inspired dark UI
  - CRT scanline effects
  - Monospace typography
  - Live clock and status indicators

## Project Structure

```
Stonks/
├── backend/                 # FastAPI Python backend
│   ├── main.py             # API endpoints
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── App.jsx         # Main application
│   │   └── index.css       # Global styles
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 3. Open the Terminal

Navigate to `http://localhost:3000` in your browser.

## API Endpoints

### Stocks

| Endpoint | Description |
|----------|-------------|
| `GET /api/stocks/{ticker}` | Get comprehensive stock info |
| `GET /api/stocks/{ticker}/history` | Get historical OHLCV data |
| `GET /api/stocks/{ticker}/financials` | Get financial statements |

**Query Parameters for history:**
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)
- `interval` - Data interval (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)

### Crypto

| Endpoint | Description |
|----------|-------------|
| `GET /api/crypto/{coin_id}` | Get comprehensive crypto info |
| `GET /api/crypto/{coin_id}/history` | Get historical price data |
| `GET /api/crypto/search/{query}` | Search for cryptocurrencies |
| `GET /api/crypto/top/{limit}` | Get top cryptos by market cap |

## Usage Examples

### Stocks
Enter stock ticker symbols like:
- `AAPL` - Apple Inc.
- `MSFT` - Microsoft
- `GOOGL` - Alphabet
- `TSLA` - Tesla
- `NVDA` - NVIDIA

### Crypto
Enter CoinGecko coin IDs like:
- `bitcoin` - Bitcoin
- `ethereum` - Ethereum
- `solana` - Solana
- `cardano` - Cardano
- `dogecoin` - Dogecoin

## Data Fields

### Stock Data Includes:
- **Overview**: Name, sector, industry, exchange, employees
- **Price**: Current, 52-week high/low, moving averages, target price
- **Valuation**: Market cap, P/E, P/B, P/S, PEG, enterprise value
- **Trading**: Volume, beta, shares outstanding, short interest
- **Dividends**: Yield, rate
- **Financials**: Revenue, margins, EBITDA, free cash flow
- **Balance Sheet**: Cash, debt, D/E ratio, ROE, ROA
- **Analyst**: Recommendation, number of analysts

### Crypto Data Includes:
- **Overview**: Name, symbol, rank, genesis date
- **Price**: Current, 24h high/low, ATH/ATL
- **Changes**: 24h, 7d, 14d, 30d, 1y percentage changes
- **Market**: Market cap, FDV, volume
- **Supply**: Circulating, total, max supply
- **Sentiment**: Community scores, developer activity

## Tech Stack

- **Backend**: FastAPI, yfinance, requests
- **Frontend**: React 18, Vite, Recharts
- **Styling**: Custom CSS with terminal aesthetic

## License

MIT

