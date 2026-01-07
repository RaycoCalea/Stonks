#!/bin/bash
# Stonks Terminal Backend Startup Script
# Suppresses Intel MKL warnings and starts the server

# Suppress Intel MKL warnings - comprehensive settings
export MKL_SERVICE_FORCE_INTEL=1
export MKL_THREADING_LAYER=sequential
export MKL_DEBUG_CPU_TYPE=5
export MKL_CBWR=AUTO
export MKL_DYNAMIC=FALSE
export KMP_WARNINGS=0
export KMP_AFFINITY=disabled
export OPENBLAS_NUM_THREADS=1
export OMP_NUM_THREADS=1

# Suppress Python warnings
export PYTHONWARNINGS="ignore"

# Optional: Set API keys for higher rate limits
# export ALPHA_VANTAGE_KEY="your_key_here"
# export FINNHUB_KEY="your_key_here"
# export FRED_KEY="your_key_here"

echo "Starting Stonks Terminal API v4.0..."
echo "=================================="
echo "Sources: Yahoo HTTP, CoinGecko, Alpha Vantage, FRED"
echo ""

# Start uvicorn
cd "$(dirname "$0")"
python3 -m uvicorn main:app --reload --port 8000
