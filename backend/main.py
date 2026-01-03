"""
Stonks Terminal API - Main Orchestrator
FastAPI backend for fetching financial data across multiple asset classes
"""

# Suppress Intel MKL warnings
import os
os.environ['MKL_SERVICE_FORCE_INTEL'] = '0'

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
import logging

# Import fetchers
from fetchers import (
    CryptoFetcher, StockFetcher, CommodityFetcher,
    ForexFetcher, IndexFetcher, TreasuryFetcher
)
from fetchers.crypto import CRYPTO_MAP
from fetchers.stocks import STOCK_MAP
from fetchers.commodities import COMMODITY_MAP
from fetchers.forex import FOREX_MAP
from fetchers.indices import INDEX_MAP
from fetchers.treasury import TREASURY_MAP

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Stonks Terminal API",
    description="Bloomberg-style terminal for crypto, stocks, commodities, forex, indices, and treasury yields",
    version="6.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== CRYPTO ENDPOINTS ====================

@app.get("/api/crypto/{coin_id}")
async def get_crypto(coin_id: str):
    """Get cryptocurrency data"""
    result = CryptoFetcher.fetch_data(coin_id)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/api/crypto/{coin_id}/history")
async def get_crypto_history(
    coin_id: str,
    period: str = Query("3mo", description="Period: 1d, 7d, 1mo, 3mo, 6mo, 1y")
):
    """Get cryptocurrency historical data"""
    period_map = {"1d": 1, "7d": 7, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365}
    days = period_map.get(period, 90)
    
    result = CryptoFetcher.fetch_history(coin_id, days)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ==================== STOCK ENDPOINTS ====================

@app.get("/api/stocks/{ticker}")
async def get_stock(ticker: str):
    """Get stock data"""
    result = StockFetcher.fetch_data(ticker)
    if result.get("error") and not result.get("current_price"):
        raise HTTPException(
            status_code=404,
            detail=f"Stock '{ticker}' not found. Try: AAPL, MSFT, GOOGL, TSLA, AMZN"
        )
    return result


@app.get("/api/stocks/{ticker}/history")
async def get_stock_history(
    ticker: str,
    period: str = Query("3mo", description="Period: 1d, 5d, 1mo, 3mo, 6mo, 1y"),
    interval: str = Query("1d", description="Interval: 1d, 1wk, 1mo")
):
    """Get stock historical data"""
    result = StockFetcher.fetch_history(ticker, period, interval)
    if result.get("error") and not result.get("data"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ==================== COMMODITY ENDPOINTS ====================

@app.get("/api/commodities/{name:path}")
async def get_commodity(name: str):
    """Get commodity data"""
    result = CommodityFetcher.fetch_data(name)
    if result.get("error"):
        raise HTTPException(
            status_code=404,
            detail=f"Commodity '{name}' not found. Try: gold, silver, platinum, palladium, oil, crude, wti, brent, natural gas, gas"
        )
    return result


@app.get("/api/commodities/{name:path}/history")
async def get_commodity_history(
    name: str,
    period: str = Query("3mo", description="Period: 1mo, 3mo, 6mo, 1y")
):
    """Get commodity historical data"""
    result = CommodityFetcher.fetch_history(name, period)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ==================== FOREX ENDPOINTS ====================

@app.get("/api/forex/{pair}")
async def get_forex(pair: str):
    """Get forex data"""
    result = ForexFetcher.fetch_data(pair)
    if result.get("error"):
        raise HTTPException(
            status_code=404,
            detail=f"Forex pair '{pair}' not found. Try: EUR, GBP, JPY, CHF, AUD, CAD, EURUSD"
        )
    return result


@app.get("/api/forex/{pair}/history")
async def get_forex_history(
    pair: str,
    period: str = Query("3mo", description="Period: 1mo, 3mo, 6mo, 1y")
):
    """Get forex historical data"""
    result = ForexFetcher.fetch_history(pair, period)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ==================== INDEX ENDPOINTS ====================

@app.get("/api/indices/{name}")
async def get_index(name: str):
    """Get index data"""
    result = IndexFetcher.fetch_data(name)
    if result.get("error"):
        raise HTTPException(
            status_code=404,
            detail=f"Index '{name}' not found. Try: SPY, QQQ, DIA, IWM, VIX"
        )
    return result


@app.get("/api/indices/{name}/history")
async def get_index_history(
    name: str,
    period: str = Query("3mo", description="Period: 1mo, 3mo, 6mo, 1y")
):
    """Get index historical data"""
    result = IndexFetcher.fetch_history(name, period)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ==================== TREASURY ENDPOINTS ====================

@app.get("/api/treasury/{maturity}")
async def get_treasury(maturity: str):
    """Get US Treasury yield data"""
    result = TreasuryFetcher.fetch_data(maturity)
    if result.get("error"):
        raise HTTPException(
            status_code=404,
            detail=f"Treasury '{maturity}' not found. Try: 2y, 5y, 10y, 30y"
        )
    return result


@app.get("/api/treasury/{maturity}/history")
async def get_treasury_history(
    maturity: str,
    period: str = Query("3mo", description="Period: 1mo, 3mo, 6mo, 1y")
):
    """Get treasury historical data"""
    result = TreasuryFetcher.fetch_history(maturity, period)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ==================== SEARCH ENDPOINT ====================

@app.get("/api/search/{query}")
async def search_assets(query: str):
    """Search across all asset types"""
    results = []
    q = query.lower().strip()
    
    # Check local mappings first
    if q in COMMODITY_MAP:
        results.append({"id": q, "symbol": COMMODITY_MAP[q], "name": q.title(), "type": "commodity"})
    
    if q in FOREX_MAP:
        results.append({"id": q, "symbol": FOREX_MAP[q], "name": q.upper(), "type": "forex"})
    
    if q in INDEX_MAP:
        results.append({"id": q, "symbol": INDEX_MAP[q], "name": q.upper(), "type": "index"})
    
    if q in TREASURY_MAP:
        results.append({"id": q, "symbol": TREASURY_MAP[q], "name": f"US Treasury {q.upper()}", "type": "treasury"})
    
    if q in STOCK_MAP:
        results.append({"id": STOCK_MAP[q], "symbol": STOCK_MAP[q], "name": q.title(), "type": "stock"})
    
    # Check crypto
    if q in CRYPTO_MAP:
        cid = CRYPTO_MAP[q]
        results.append({"id": cid, "symbol": q.upper(), "name": cid.replace('-', ' ').title(), "type": "crypto"})
    
    # Search crypto via CoinGecko
    crypto_results = CryptoFetcher.search(query)
    for r in crypto_results[:3]:
        if not any(x['id'] == r['id'] for x in results):
            results.append(r)
    
    # Add stock suggestion if looks like ticker
    if len(query) <= 5 and query.isalpha() and not any(x.get('type') == 'stock' for x in results):
        results.append({"id": query.upper(), "symbol": query.upper(), "name": query.upper(), "type": "stock"})
    
    return results[:10]


# ==================== HEALTH CHECK ====================

@app.get("/")
async def root():
    """API root - health check"""
    return {
        "name": "Stonks Terminal API",
        "version": "6.0.0",
        "status": "operational",
        "endpoints": {
            "crypto": "/api/crypto/{coin_id}",
            "stocks": "/api/stocks/{ticker}",
            "commodities": "/api/commodities/{name}",
            "forex": "/api/forex/{pair}",
            "indices": "/api/indices/{name}",
            "treasury": "/api/treasury/{maturity}",
            "search": "/api/search/{query}"
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# ==================== RUN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
