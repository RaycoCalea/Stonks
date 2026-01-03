"""
Indices Fetcher - Uses Yahoo Finance
"""
from typing import Dict, Any
from .base import fetch_yahoo_chart, fetch_yahoo_history

INDEX_MAP = {
    "spy": "SPY", "sp500": "^GSPC", "s&p": "^GSPC", "sp": "^GSPC",
    "dow": "^DJI", "djia": "^DJI", "nasdaq": "^IXIC", "qqq": "QQQ",
    "russell": "^RUT", "iwm": "IWM", "vix": "^VIX",
}


class IndexFetcher:
    """Fetches index data from Yahoo Finance"""
    
    @staticmethod
    def resolve(query: str) -> str:
        """Resolve index name to Yahoo ticker"""
        return INDEX_MAP.get(query.lower().strip(), query.upper())
    
    @staticmethod
    def fetch_data(name: str) -> Dict[str, Any]:
        """Fetch index quote data"""
        resolved = IndexFetcher.resolve(name)
        return fetch_yahoo_chart(resolved, "index")
    
    @staticmethod
    def fetch_history(name: str, period: str = "3mo") -> Dict[str, Any]:
        """Fetch index historical data"""
        resolved = IndexFetcher.resolve(name)
        return fetch_yahoo_history(resolved, period)

