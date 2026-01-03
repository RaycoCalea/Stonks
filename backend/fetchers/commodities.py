"""
Commodities Fetcher - Uses Yahoo Finance
"""
from typing import Dict, Any
from .base import fetch_yahoo_chart, fetch_yahoo_history

COMMODITY_MAP = {
    "gold": "GC=F", "silver": "SI=F", "platinum": "PL=F", "palladium": "PA=F",
    "oil": "CL=F", "crude": "CL=F", "wti": "CL=F", "brent": "BZ=F",
    "natural gas": "NG=F", "gas": "NG=F", "natgas": "NG=F",
    "corn": "ZC=F", "wheat": "ZW=F", "soybeans": "ZS=F",
    "coffee": "KC=F", "sugar": "SB=F", "cotton": "CT=F", "copper": "HG=F",
}


class CommodityFetcher:
    """Fetches commodity data from Yahoo Finance"""
    
    @staticmethod
    def resolve(query: str) -> str:
        """Resolve commodity name to Yahoo ticker"""
        q = query.lower().strip()
        if '=' in q:
            return q.upper()
        return COMMODITY_MAP.get(q, query.upper())
    
    @staticmethod
    def fetch_data(name: str) -> Dict[str, Any]:
        """Fetch commodity quote data"""
        resolved = CommodityFetcher.resolve(name)
        
        # Get display name
        name_display = name.title()
        for k, v in COMMODITY_MAP.items():
            if v == resolved:
                name_display = k.title()
                break
        
        return fetch_yahoo_chart(resolved, "commodity", name_display)
    
    @staticmethod
    def fetch_history(name: str, period: str = "3mo") -> Dict[str, Any]:
        """Fetch commodity historical data"""
        resolved = CommodityFetcher.resolve(name)
        return fetch_yahoo_history(resolved, period)

