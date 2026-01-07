"""
Commodities Fetcher - Uses Yahoo Finance with enhanced data extraction
"""
import time
from datetime import datetime
from typing import Dict, Any
from .base import fetch_yahoo_chart, fetch_yahoo_history, get_yahoo_session, get_cache, set_cache

# Comprehensive commodity mapping with metadata
COMMODITY_MAP = {
    # Precious Metals
    "gold": "GC=F", "xau": "GC=F", "xauusd": "GC=F",
    "silver": "SI=F", "xag": "SI=F", "xagusd": "SI=F",
    "platinum": "PL=F", "xpt": "PL=F",
    "palladium": "PA=F", "xpd": "PA=F",
    # Energy
    "oil": "CL=F", "crude": "CL=F", "wti": "CL=F", "crude oil": "CL=F",
    "brent": "BZ=F", "brent crude": "BZ=F",
    "natural gas": "NG=F", "gas": "NG=F", "natgas": "NG=F", "nat gas": "NG=F",
    "heating oil": "HO=F", "gasoline": "RB=F", "rbob": "RB=F",
    # Base Metals
    "copper": "HG=F", "hg": "HG=F",
    "aluminum": "ALI=F", "aluminium": "ALI=F",
    # Agricultural - Grains
    "corn": "ZC=F", "wheat": "ZW=F", "soybeans": "ZS=F", "soybean": "ZS=F",
    "oats": "ZO=F", "rice": "ZR=F", "rough rice": "ZR=F",
    # Agricultural - Softs
    "coffee": "KC=F", "sugar": "SB=F", "cotton": "CT=F",
    "cocoa": "CC=F", "orange juice": "OJ=F", "oj": "OJ=F",
    "lumber": "LBS=F", "wood": "LBS=F",
    # Livestock
    "cattle": "LE=F", "live cattle": "LE=F",
    "feeder cattle": "GF=F", "hogs": "HE=F", "lean hogs": "HE=F",
}

# Commodity metadata for display
COMMODITY_INFO = {
    "GC=F": {"name": "Gold", "unit": "oz", "exchange": "COMEX", "category": "Precious Metals"},
    "SI=F": {"name": "Silver", "unit": "oz", "exchange": "COMEX", "category": "Precious Metals"},
    "PL=F": {"name": "Platinum", "unit": "oz", "exchange": "NYMEX", "category": "Precious Metals"},
    "PA=F": {"name": "Palladium", "unit": "oz", "exchange": "NYMEX", "category": "Precious Metals"},
    "CL=F": {"name": "Crude Oil WTI", "unit": "barrel", "exchange": "NYMEX", "category": "Energy"},
    "BZ=F": {"name": "Brent Crude", "unit": "barrel", "exchange": "ICE", "category": "Energy"},
    "NG=F": {"name": "Natural Gas", "unit": "mmBtu", "exchange": "NYMEX", "category": "Energy"},
    "HG=F": {"name": "Copper", "unit": "lb", "exchange": "COMEX", "category": "Base Metals"},
    "ZC=F": {"name": "Corn", "unit": "bushel", "exchange": "CBOT", "category": "Grains"},
    "ZW=F": {"name": "Wheat", "unit": "bushel", "exchange": "CBOT", "category": "Grains"},
    "ZS=F": {"name": "Soybeans", "unit": "bushel", "exchange": "CBOT", "category": "Grains"},
    "KC=F": {"name": "Coffee", "unit": "lb", "exchange": "ICE", "category": "Softs"},
    "SB=F": {"name": "Sugar", "unit": "lb", "exchange": "ICE", "category": "Softs"},
    "CT=F": {"name": "Cotton", "unit": "lb", "exchange": "ICE", "category": "Softs"},
    "CC=F": {"name": "Cocoa", "unit": "ton", "exchange": "ICE", "category": "Softs"},
}


class CommodityFetcher:
    """Fetches comprehensive commodity data from Yahoo Finance"""
    
    @staticmethod
    def resolve(query: str) -> str:
        """Resolve commodity name to Yahoo ticker"""
        q = query.lower().strip()
        if '=' in q:
            return q.upper()
        return COMMODITY_MAP.get(q, query.upper())
    
    @staticmethod
    def fetch_data(name: str) -> Dict[str, Any]:
        """Fetch comprehensive commodity quote data"""
        resolved = CommodityFetcher.resolve(name)
        cache_key = f"commodity_full:{resolved}"
        
        cached = get_cache(cache_key)
        if cached:
            return cached
        
        # Get metadata
        info = COMMODITY_INFO.get(resolved, {})
        name_display = info.get("name", name.title())
        
        # Fetch basic data
        basic_data = fetch_yahoo_chart(resolved, "commodity", name_display)
        
        if basic_data.get("error"):
            return basic_data
        
        # Enhance with additional data
        session = get_yahoo_session()
        
        try:
            # Fetch longer-term data for calculating more metrics
            time.sleep(0.3)
            print(f"[COMMODITY] Fetching extended data for {resolved}")
            
            resp = session.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{resolved}",
                params={"range": "1y", "interval": "1d"},
                timeout=15
            )
            
            if resp.ok:
                data = resp.json()
                result_data = data.get('chart', {}).get('result', [])
                
                if result_data:
                    quote = result_data[0].get('indicators', {}).get('quote', [{}])[0]
                    closes = [c for c in quote.get('close', []) if c is not None]
                    highs = [h for h in quote.get('high', []) if h is not None]
                    lows = [l for l in quote.get('low', []) if l is not None]
                    volumes = [v for v in quote.get('volume', []) if v is not None]
                    
                    if closes:
                        current = closes[-1]
                        
                        # Calculate 52-week metrics
                        week_52_high = max(highs) if highs else None
                        week_52_low = min(lows) if lows else None
                        
                        # Calculate moving averages
                        ma_20 = sum(closes[-20:]) / len(closes[-20:]) if len(closes) >= 20 else None
                        ma_50 = sum(closes[-50:]) / len(closes[-50:]) if len(closes) >= 50 else None
                        ma_200 = sum(closes[-200:]) / len(closes[-200:]) if len(closes) >= 200 else None
                        
                        # Calculate volatility (annualized)
                        if len(closes) >= 20:
                            import math
                            returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes)) if closes[i-1]]
                            if returns:
                                variance = sum((r - sum(returns)/len(returns))**2 for r in returns) / len(returns)
                                volatility = math.sqrt(variance) * math.sqrt(252) * 100
                            else:
                                volatility = None
                        else:
                            volatility = None
                        
                        # Calculate returns
                        ytd_start = closes[0] if closes else None
                        return_1m = ((current - closes[-21]) / closes[-21] * 100) if len(closes) > 21 else None
                        return_3m = ((current - closes[-63]) / closes[-63] * 100) if len(closes) > 63 else None
                        return_6m = ((current - closes[-126]) / closes[-126] * 100) if len(closes) > 126 else None
                        return_1y = ((current - closes[0]) / closes[0] * 100) if closes else None
                        
                        # Average volume
                        avg_volume_20d = sum(volumes[-20:]) / len(volumes[-20:]) if len(volumes) >= 20 else None
                        
                        # Enhance the result
                        basic_data.update({
                            # 52 week data
                            "fifty_two_week_high": week_52_high,
                            "fifty_two_week_low": week_52_low,
                            "pct_from_52w_high": ((current - week_52_high) / week_52_high * 100) if week_52_high else None,
                            "pct_from_52w_low": ((current - week_52_low) / week_52_low * 100) if week_52_low else None,
                            
                            # Moving averages
                            "ma_20": ma_20,
                            "ma_50": ma_50,
                            "ma_200": ma_200,
                            "above_ma_20": current > ma_20 if ma_20 else None,
                            "above_ma_50": current > ma_50 if ma_50 else None,
                            "above_ma_200": current > ma_200 if ma_200 else None,
                            
                            # Volatility & risk
                            "volatility_annualized": volatility,
                            
                            # Performance
                            "return_1m": return_1m,
                            "return_3m": return_3m,
                            "return_6m": return_6m,
                            "return_1y": return_1y,
                            
                            # Volume
                            "avg_volume_20d": avg_volume_20d,
                            
                            # Metadata
                            "unit": info.get("unit"),
                            "exchange_name": info.get("exchange"),
                            "category": info.get("category"),
                            
                            # Data quality
                            "data_points": len(closes),
                        })
        except Exception as e:
            print(f"[COMMODITY] Extended data error: {e}")
        
        set_cache(cache_key, basic_data)
        return basic_data
    
    @staticmethod
    def fetch_history(name: str, period: str = "3mo") -> Dict[str, Any]:
        """Fetch commodity historical data"""
        resolved = CommodityFetcher.resolve(name)
        return fetch_yahoo_history(resolved, period)

