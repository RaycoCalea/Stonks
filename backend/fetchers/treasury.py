"""
Treasury Fetcher - Uses Yahoo Finance
"""
from typing import Dict, Any
from .base import fetch_yahoo_chart, fetch_yahoo_history

TREASURY_MAP = {
    "2y": "^IRX", "5y": "^FVX", "10y": "^TNX", "30y": "^TYX",
    "3m": "^IRX", "6m": "^IRX",
}


class TreasuryFetcher:
    """Fetches US Treasury yield data from Yahoo Finance"""
    
    @staticmethod
    def resolve(maturity: str) -> str:
        """Resolve maturity to Yahoo ticker"""
        return TREASURY_MAP.get(maturity.lower().strip(), "^TNX")
    
    @staticmethod
    def fetch_data(maturity: str) -> Dict[str, Any]:
        """Fetch treasury yield data"""
        resolved = TreasuryFetcher.resolve(maturity)
        result = fetch_yahoo_chart(resolved, "treasury")
        
        if result.get('current_price'):
            result['name'] = f"US Treasury {maturity.upper()} Yield"
            result['currency'] = '%'
        
        return result
    
    @staticmethod
    def fetch_history(maturity: str, period: str = "3mo") -> Dict[str, Any]:
        """Fetch treasury historical data"""
        resolved = TreasuryFetcher.resolve(maturity)
        return fetch_yahoo_history(resolved, period)

