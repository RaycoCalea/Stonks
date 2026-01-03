#!/bin/bash
# Stonks Terminal Backend Startup Script
# Suppresses Intel MKL warnings and starts the server

# Suppress Intel MKL warnings
export MKL_SERVICE_FORCE_INTEL=0
export MKL_DEBUG_CPU_TYPE=5
export MKL_CBWR=AUTO

# Optional: Set API keys for higher rate limits
# export ALPHA_VANTAGE_KEY="your_key_here"
# export FINNHUB_KEY="your_key_here"
# export FRED_KEY="your_key_here"

echo "Starting Stonks Terminal API v4.0..."
echo "=================================="
echo "Sources: Yahoo HTTP, CoinGecko, Alpha Vantage"
echo ""

# Start uvicorn
cd "$(dirname "$0")"
python3 -m uvicorn main:app --reload --port 8000
