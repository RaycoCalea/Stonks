"""
Forex Fetcher - Uses Yahoo Finance
"""
from typing import Dict, Any
from .base import fetch_yahoo_chart, fetch_yahoo_history

FOREX_MAP = {
    # Major Pairs
    "eurusd": "EURUSD=X", "eur": "EURUSD=X", "euro": "EURUSD=X",
    "gbpusd": "GBPUSD=X", "gbp": "GBPUSD=X", "pound": "GBPUSD=X",
    "usdjpy": "USDJPY=X", "jpy": "USDJPY=X", "yen": "USDJPY=X",
    "usdchf": "USDCHF=X", "chf": "USDCHF=X", "swiss franc": "USDCHF=X",
    "audusd": "AUDUSD=X", "aud": "AUDUSD=X",
    "usdcad": "USDCAD=X", "cad": "USDCAD=X",
    # Emerging Market Currencies
    "usdcny": "USDCNY=X", "cny": "USDCNY=X", "yuan": "USDCNY=X", "rmb": "USDCNY=X",
    "usdinr": "USDINR=X", "inr": "USDINR=X", "rupee": "USDINR=X",
    "usdbrl": "USDBRL=X", "brl": "USDBRL=X", "real": "USDBRL=X",
    "usdmxn": "USDMXN=X", "mxn": "USDMXN=X", "peso": "USDMXN=X",
    "usdrub": "USDRUB=X", "rub": "USDRUB=X", "ruble": "USDRUB=X",
    "usdtry": "USDTRY=X", "try": "USDTRY=X", "lira": "USDTRY=X",
    "usdzar": "USDZAR=X", "zar": "USDZAR=X", "rand": "USDZAR=X",
    "usdkrw": "USDKRW=X", "krw": "USDKRW=X", "won": "USDKRW=X",
    "usdidr": "USDIDR=X", "idr": "USDIDR=X", "rupiah": "USDIDR=X",
    # Cross Pairs
    "eurgbp": "EURGBP=X", "eurjpy": "EURJPY=X", "gbpjpy": "GBPJPY=X",
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

