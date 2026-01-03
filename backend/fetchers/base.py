"""
Base module with shared utilities for all fetchers
"""
import os
import time
import requests
from datetime import datetime
from typing import Optional, Dict, Any

# Configuration
TWELVE_DATA_KEY = os.environ.get('TWELVE_DATA_KEY', 'demo')
CACHE_TTL = 300  # 5 minutes

# Global cache
CACHE: Dict[str, Dict] = {}

# HTTP Headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
}

# Yahoo session for maintaining cookies
_yahoo_session = None

def get_cache(key: str) -> Optional[Dict]:
    """Get cached data if still valid"""
    if key in CACHE:
        entry = CACHE[key]
        if (datetime.now() - entry["ts"]).seconds < CACHE_TTL:
            print(f"[CACHE] HIT {key}")
            return entry["data"]
    return None

def set_cache(key: str, data: Dict):
    """Store data in cache"""
    CACHE[key] = {"data": data, "ts": datetime.now()}

def get_yahoo_session():
    """Get a session with cookies for Yahoo Finance"""
    global _yahoo_session
    if _yahoo_session is None:
        _yahoo_session = requests.Session()
        _yahoo_session.headers.update(HEADERS)
        # Get initial cookies
        try:
            _yahoo_session.get('https://finance.yahoo.com/', timeout=10)
        except:
            pass
    return _yahoo_session

def fetch_yahoo_chart(ticker: str, asset_type: str, name_display: str = None) -> Dict[str, Any]:
    """
    Unified Yahoo Chart fetcher with proper error handling.
    Used by commodities, forex, indices, treasury.
    """
    YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart"
    cache_key = f"{asset_type}:{ticker}"
    
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    session = get_yahoo_session()
    
    try:
        print(f"[{asset_type.upper()}] Fetching {ticker}")
        time.sleep(0.5)
        
        resp = session.get(
            f"{YAHOO_CHART}/{ticker}",
            params={"range": "5d", "interval": "1d"},
            timeout=15
        )
        
        content_type = resp.headers.get('content-type', '')
        if 'application/json' not in content_type and 'text/javascript' not in content_type:
            print(f"[{asset_type.upper()}] Non-JSON response: {content_type}")
            return {"error": "Yahoo returned non-JSON response"}
        
        if resp.status_code == 429:
            print(f"[{asset_type.upper()}] Rate limited")
            return {"error": "Rate limited"}
        
        if resp.status_code != 200:
            print(f"[{asset_type.upper()}] HTTP {resp.status_code}")
            return {"error": f"HTTP {resp.status_code}"}
        
        try:
            data = resp.json()
        except Exception as json_err:
            print(f"[{asset_type.upper()}] JSON parse error: {json_err}")
            return {"error": "Invalid JSON response"}
        
        if data.get('chart', {}).get('error'):
            error_msg = data['chart']['error'].get('description', 'Unknown error')
            print(f"[{asset_type.upper()}] Yahoo error: {error_msg}")
            return {"error": error_msg}
        
        result_data = data.get('chart', {}).get('result', [])
        if not result_data:
            print(f"[{asset_type.upper()}] No data for {ticker}")
            return {"error": "No data"}
        
        meta = result_data[0].get('meta', {})
        quote = result_data[0].get('indicators', {}).get('quote', [{}])[0]
        closes = [c for c in quote.get('close', []) if c is not None]
        
        if not closes:
            return {"error": "No price data"}
        
        result = {
            "ticker": ticker,
            "name": name_display or meta.get('longName') or meta.get('shortName') or ticker,
            "asset_type": asset_type,
            "source": "yahoo",
            "current_price": closes[-1],
            "previous_close": meta.get('previousClose') or meta.get('chartPreviousClose') or (closes[-2] if len(closes) > 1 else None),
            "day_high": max([h for h in quote.get('high', []) if h], default=None),
            "day_low": min([l for l in quote.get('low', []) if l], default=None),
            "volume": quote.get('volume', [None])[-1] if quote.get('volume') else None,
            "currency": meta.get('currency', 'USD'),
            "exchange": meta.get('exchangeName'),
        }
        
        if result.get('current_price') and result.get('previous_close'):
            result['price_change'] = result['current_price'] - result['previous_close']
            result['price_change_percent'] = (result['price_change'] / result['previous_close']) * 100
        
        set_cache(cache_key, result)
        print(f"[{asset_type.upper()}] Success: {ticker} = {result['current_price']}")
        return result
        
    except requests.exceptions.Timeout:
        print(f"[{asset_type.upper()}] Timeout for {ticker}")
        return {"error": "Request timeout"}
    except requests.exceptions.RequestException as e:
        print(f"[{asset_type.upper()}] Request error: {e}")
        return {"error": str(e)}
    except Exception as e:
        print(f"[{asset_type.upper()}] Error: {e}")
        return {"error": str(e)}

def fetch_yahoo_history(ticker: str, period: str = "3mo") -> Dict[str, Any]:
    """Unified Yahoo history fetcher"""
    YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart"
    cache_key = f"hist:{ticker}:{period}"
    
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    session = get_yahoo_session()
    
    try:
        print(f"[HISTORY] Fetching {ticker} ({period})")
        time.sleep(0.3)
        
        resp = session.get(
            f"{YAHOO_CHART}/{ticker}",
            params={"range": period, "interval": "1d"},
            timeout=15
        )
        
        if resp.status_code != 200:
            return {"error": f"HTTP {resp.status_code}"}
        
        content_type = resp.headers.get('content-type', '')
        if 'application/json' not in content_type and 'text/javascript' not in content_type:
            return {"error": "Non-JSON response"}
        
        data = resp.json()
        result_data = data.get('chart', {}).get('result', [])
        
        if not result_data:
            return {"error": "No data"}
        
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
        
        if not records:
            return {"error": "No price data"}
        
        result = {"ticker": ticker, "data_points": len(records), "data": records}
        set_cache(cache_key, result)
        return result
        
    except Exception as e:
        print(f"[HISTORY] Error: {e}")
        return {"error": str(e)}

