"""
Stock Fetcher - Uses Twelve Data (primary) + Yahoo Finance (fallback)
"""
import os
import time
import requests
from datetime import datetime
from typing import Dict, Any
from .base import get_cache, set_cache, get_yahoo_session, HEADERS

TWELVE_DATA_KEY = os.environ.get('TWELVE_DATA_KEY', 'demo')
TWELVE_URL = "https://api.twelvedata.com"
YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart"

STOCK_MAP = {
    "apple": "AAPL", "microsoft": "MSFT", "google": "GOOGL", "amazon": "AMZN",
    "meta": "META", "tesla": "TSLA", "nvidia": "NVDA", "netflix": "NFLX",
    "disney": "DIS", "nike": "NKE", "walmart": "WMT", "costco": "COST",
    "starbucks": "SBUX", "mcdonalds": "MCD", "boeing": "BA", "intel": "INTC",
    "amd": "AMD", "paypal": "PYPL", "adobe": "ADBE", "salesforce": "CRM",
    "oracle": "ORCL", "ibm": "IBM", "cisco": "CSCO", "uber": "UBER",
    "visa": "V", "mastercard": "MA", "jpmorgan": "JPM", "goldman": "GS",
}


class StockFetcher:
    """Fetches stock data from Twelve Data and Yahoo Finance"""
    
    @staticmethod
    def resolve(query: str) -> str:
        """Resolve company name to ticker"""
        return STOCK_MAP.get(query.lower().strip(), query.upper().strip())
    
    @staticmethod
    def fetch_data(ticker: str) -> Dict[str, Any]:
        """Fetch stock quote data"""
        resolved = StockFetcher.resolve(ticker)
        cache_key = f"stock:{resolved}"
        
        cached = get_cache(cache_key)
        if cached:
            return cached
        
        # Try Twelve Data first (most reliable)
        result = StockFetcher._fetch_twelve_data(resolved)
        if result.get('current_price'):
            result['asset_type'] = 'stock'
            set_cache(cache_key, result)
            return result
        
        # Fallback to Yahoo Chart API
        result = StockFetcher._fetch_yahoo(resolved)
        if result.get('current_price'):
            result['asset_type'] = 'stock'
            set_cache(cache_key, result)
            return result
        
        return {"ticker": resolved, "error": "No data available", "asset_type": "stock"}
    
    @staticmethod
    def _fetch_twelve_data(ticker: str) -> Dict[str, Any]:
        """Fetch from Twelve Data API"""
        try:
            print(f"[STOCK TD] Fetching {ticker}")
            resp = requests.get(
                f"{TWELVE_URL}/quote",
                params={"symbol": ticker, "apikey": TWELVE_DATA_KEY},
                headers=HEADERS,
                timeout=10
            )
            data = resp.json()
            
            if data.get('code') or not data.get('close'):
                return {}
            
            return {
                "ticker": ticker,
                "source": "twelve_data",
                "name": data.get('name', ticker),
                "current_price": float(data['close']),
                "open_price": float(data.get('open', 0)) or None,
                "day_high": float(data.get('high', 0)) or None,
                "day_low": float(data.get('low', 0)) or None,
                "previous_close": float(data.get('previous_close', 0)) or None,
                "volume": float(data.get('volume', 0)) or None,
                "price_change": float(data.get('change', 0)) or None,
                "price_change_percent": float(data.get('percent_change', 0)) or None,
                "fifty_two_week_high": data.get('fifty_two_week', {}).get('high'),
                "fifty_two_week_low": data.get('fifty_two_week', {}).get('low'),
                "exchange": data.get('exchange'),
                "currency": data.get('currency', 'USD'),
            }
        except Exception as e:
            print(f"[STOCK TD] Error: {e}")
            return {}
    
    @staticmethod
    def _fetch_yahoo(ticker: str) -> Dict[str, Any]:
        """Fetch from Yahoo Finance Chart API"""
        session = get_yahoo_session()
        try:
            print(f"[STOCK YF] Fetching {ticker}")
            time.sleep(0.3)
            resp = session.get(
                f"{YAHOO_CHART}/{ticker}",
                params={"range": "5d", "interval": "1d"},
                timeout=10
            )
            
            if 'application/json' not in resp.headers.get('content-type', ''):
                print(f"[STOCK YF] Non-JSON response")
                return {}
            
            data = resp.json()
            result_data = data.get('chart', {}).get('result', [])
            if not result_data:
                return {}
            
            meta = result_data[0].get('meta', {})
            quote = result_data[0].get('indicators', {}).get('quote', [{}])[0]
            closes = [c for c in quote.get('close', []) if c is not None]
            
            if not closes:
                return {}
            
            return {
                "ticker": ticker,
                "source": "yahoo",
                "name": meta.get('longName') or meta.get('shortName') or ticker,
                "current_price": closes[-1],
                "previous_close": meta.get('previousClose'),
                "day_high": quote.get('high', [None])[-1] if quote.get('high') else None,
                "day_low": quote.get('low', [None])[-1] if quote.get('low') else None,
                "volume": quote.get('volume', [None])[-1] if quote.get('volume') else None,
                "exchange": meta.get('exchangeName'),
                "currency": meta.get('currency', 'USD'),
            }
        except Exception as e:
            print(f"[STOCK YF] Error: {e}")
            return {}
    
    @staticmethod
    def fetch_history(ticker: str, period: str = "3mo", interval: str = "1d") -> Dict[str, Any]:
        """Fetch historical price data"""
        resolved = StockFetcher.resolve(ticker)
        cache_key = f"stock_hist:{resolved}:{period}"
        
        cached = get_cache(cache_key)
        if cached:
            return cached
        
        # Try Twelve Data time series
        result = StockFetcher._fetch_twelve_history(resolved, period)
        if result.get('data'):
            set_cache(cache_key, result)
            return result
        
        # Fallback to Yahoo Chart
        result = StockFetcher._fetch_yahoo_history(resolved, period, interval)
        if result.get('data'):
            set_cache(cache_key, result)
            return result
        
        return {"error": "No history available"}
    
    @staticmethod
    def _fetch_twelve_history(ticker: str, period: str) -> Dict[str, Any]:
        """Fetch history from Twelve Data"""
        period_map = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365}
        outputsize = period_map.get(period, 90)
        
        try:
            print(f"[STOCK TD HIST] Fetching {ticker}")
            resp = requests.get(
                f"{TWELVE_URL}/time_series",
                params={"symbol": ticker, "interval": "1day", "outputsize": outputsize, "apikey": TWELVE_DATA_KEY},
                headers=HEADERS,
                timeout=15
            )
            data = resp.json()
            
            if data.get('code') or not data.get('values'):
                return {}
            
            records = []
            for v in reversed(data['values']):
                records.append({
                    "Date": v.get('datetime'),
                    "Open": float(v.get('open', 0)),
                    "High": float(v.get('high', 0)),
                    "Low": float(v.get('low', 0)),
                    "Close": float(v.get('close', 0)),
                    "Volume": float(v.get('volume', 0)),
                })
            
            return {"ticker": ticker, "source": "twelve_data", "data_points": len(records), "data": records}
        except Exception as e:
            print(f"[STOCK TD HIST] Error: {e}")
            return {}
    
    @staticmethod
    def _fetch_yahoo_history(ticker: str, period: str, interval: str) -> Dict[str, Any]:
        """Fetch history from Yahoo Finance"""
        session = get_yahoo_session()
        try:
            print(f"[STOCK YF HIST] Fetching {ticker}")
            time.sleep(0.3)
            resp = session.get(
                f"{YAHOO_CHART}/{ticker}",
                params={"range": period, "interval": interval},
                timeout=15
            )
            
            if 'application/json' not in resp.headers.get('content-type', ''):
                return {}
            
            data = resp.json()
            result_data = data.get('chart', {}).get('result', [])
            if not result_data:
                return {}
            
            timestamps = result_data[0].get('timestamp', [])
            quote = result_data[0].get('indicators', {}).get('quote', [{}])[0]
            
            records = []
            for i, ts in enumerate(timestamps):
                close = quote.get('close', [])[i] if i < len(quote.get('close', [])) else None
                if close is not None:
                    records.append({
                        "Date": datetime.fromtimestamp(ts).strftime('%Y-%m-%d'),
                        "Open": quote.get('open', [])[i] if i < len(quote.get('open', [])) else None,
                        "High": quote.get('high', [])[i] if i < len(quote.get('high', [])) else None,
                        "Low": quote.get('low', [])[i] if i < len(quote.get('low', [])) else None,
                        "Close": close,
                        "Volume": quote.get('volume', [])[i] if i < len(quote.get('volume', [])) else None,
                    })
            
            return {"ticker": ticker, "source": "yahoo", "data_points": len(records), "data": records}
        except Exception as e:
            print(f"[STOCK YF HIST] Error: {e}")
            return {}

