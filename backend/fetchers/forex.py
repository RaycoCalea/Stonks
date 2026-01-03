"""
Forex Fetcher - Uses Yahoo Finance
"""
from typing import Dict, Any
from .base import fetch_yahoo_chart, fetch_yahoo_history

FOREX_MAP = {
    "eurusd": "EURUSD=X", "eur": "EURUSD=X", "euro": "EURUSD=X",
    "gbpusd": "GBPUSD=X", "gbp": "GBPUSD=X", "pound": "GBPUSD=X",
    "usdjpy": "USDJPY=X", "jpy": "USDJPY=X", "yen": "USDJPY=X",
    "usdchf": "USDCHF=X", "chf": "USDCHF=X",
    "audusd": "AUDUSD=X", "aud": "AUDUSD=X",
    "usdcad": "USDCAD=X", "cad": "USDCAD=X",
}


class ForexFetcher:
    """Fetches forex data from Yahoo Finance"""
    
    @staticmethod
    def resolve(query: str) -> str:
        """Resolve currency to Yahoo ticker"""
        q = query.lower().strip()
        if '=' in q:
            return q.upper()
        return FOREX_MAP.get(q, f"{query.upper()}=X")
    
    @staticmethod
    def fetch_data(pair: str) -> Dict[str, Any]:
        """Fetch forex quote data"""
        resolved = ForexFetcher.resolve(pair)
        name_display = resolved.replace('=X', '')
        return fetch_yahoo_chart(resolved, "forex", name_display)
    
    @staticmethod
    def fetch_history(pair: str, period: str = "3mo") -> Dict[str, Any]:
        """Fetch forex historical data"""
        resolved = ForexFetcher.resolve(pair)
        return fetch_yahoo_history(resolved, period)

