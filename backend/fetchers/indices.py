"""
Indices Fetcher - Uses Yahoo Finance with comprehensive data
"""
import time
from typing import Dict, Any
from .base import fetch_yahoo_chart, fetch_yahoo_history, get_yahoo_session, get_cache, set_cache

# Comprehensive index mapping
INDEX_MAP = {
    # US Major Indices
    "spy": "SPY", "sp500": "^GSPC", "s&p": "^GSPC", "sp": "^GSPC", "s&p 500": "^GSPC",
    "dow": "^DJI", "djia": "^DJI", "dow jones": "^DJI",
    "nasdaq": "^IXIC", "nasdaq composite": "^IXIC",
    "qqq": "QQQ", "nasdaq 100": "^NDX", "ndx": "^NDX",
    "russell": "^RUT", "russell 2000": "^RUT", "iwm": "IWM",
    "vix": "^VIX", "volatility": "^VIX", "fear index": "^VIX",
    # US Sector ETFs
    "xlf": "XLF", "financials": "XLF",
    "xlk": "XLK", "tech": "XLK", "technology": "XLK",
    "xle": "XLE", "energy": "XLE",
    "xlv": "XLV", "healthcare": "XLV",
    "xli": "XLI", "industrials": "XLI",
    "xlp": "XLP", "consumer staples": "XLP",
    "xly": "XLY", "consumer discretionary": "XLY",
    "xlu": "XLU", "utilities": "XLU",
    "xlb": "XLB", "materials": "XLB",
    "xlre": "XLRE", "real estate": "XLRE",
    # Other US
    "voo": "VOO", "vti": "VTI", "ivv": "IVV",
    "dia": "DIA", "vxx": "VXX", "uvxy": "UVXY", "svxy": "SVXY",
    # International
    "eem": "EEM", "emerging markets": "EEM", "emerging": "EEM",
    "efa": "EFA", "developed markets": "EFA", "eafe": "EFA",
    "vwo": "VWO", "vea": "VEA",
    "fxi": "FXI", "china": "FXI",
    "ewj": "EWJ", "japan": "EWJ",
    "ewg": "EWG", "germany": "EWG",
    "ewu": "EWU", "uk": "EWU",
    "ewy": "EWY", "korea": "EWY", "south korea": "EWY",
    "ewz": "EWZ", "brazil": "EWZ",
    "inda": "INDA", "india": "INDA",
    # Global indices (Yahoo format)
    "ftse": "^FTSE", "ftse 100": "^FTSE",
    "dax": "^GDAXI", "germany": "^GDAXI",
    "cac": "^FCHI", "cac 40": "^FCHI",
    "nikkei": "^N225", "nikkei 225": "^N225",
    "hang seng": "^HSI", "hsi": "^HSI",
    "shanghai": "000001.SS", "sse": "000001.SS",
    "kospi": "^KS11",
    "asx": "^AXJO", "australia": "^AXJO",
    "stoxx": "^STOXX50E", "euro stoxx": "^STOXX50E",
}

# Index metadata
INDEX_INFO = {
    "SPY": {"name": "SPDR S&P 500 ETF", "type": "ETF", "tracks": "S&P 500", "region": "US"},
    "^GSPC": {"name": "S&P 500 Index", "type": "Index", "components": 500, "region": "US"},
    "^DJI": {"name": "Dow Jones Industrial Average", "type": "Index", "components": 30, "region": "US"},
    "^IXIC": {"name": "NASDAQ Composite", "type": "Index", "region": "US"},
    "^NDX": {"name": "NASDAQ 100", "type": "Index", "components": 100, "region": "US"},
    "QQQ": {"name": "Invesco QQQ Trust", "type": "ETF", "tracks": "NASDAQ 100", "region": "US"},
    "^RUT": {"name": "Russell 2000", "type": "Index", "components": 2000, "region": "US"},
    "IWM": {"name": "iShares Russell 2000 ETF", "type": "ETF", "tracks": "Russell 2000", "region": "US"},
    "^VIX": {"name": "CBOE Volatility Index", "type": "Volatility", "region": "US"},
    "^FTSE": {"name": "FTSE 100", "type": "Index", "components": 100, "region": "UK"},
    "^GDAXI": {"name": "DAX Performance Index", "type": "Index", "components": 40, "region": "Germany"},
    "^N225": {"name": "Nikkei 225", "type": "Index", "components": 225, "region": "Japan"},
    "^HSI": {"name": "Hang Seng Index", "type": "Index", "components": 82, "region": "Hong Kong"},
}


class IndexFetcher:
    """Fetches comprehensive index data from Yahoo Finance"""
    
    @staticmethod
    def resolve(query: str) -> str:
        """Resolve index name to Yahoo ticker"""
        return INDEX_MAP.get(query.lower().strip(), query.upper())
    
    @staticmethod
    def fetch_data(name: str) -> Dict[str, Any]:
        """Fetch comprehensive index quote data"""
        resolved = IndexFetcher.resolve(name)
        cache_key = f"index_full:{resolved}"
        
        cached = get_cache(cache_key)
        if cached:
            return cached
        
        # Get metadata
        info = INDEX_INFO.get(resolved, {})
        
        # Fetch basic data
        basic_data = fetch_yahoo_chart(resolved, "index")
        
        if basic_data.get("error"):
            return basic_data
        
        # Add metadata
        basic_data.update({
            "full_name": info.get("name"),
            "index_type": info.get("type"),
            "components": info.get("components"),
            "tracks": info.get("tracks"),
            "region": info.get("region"),
        })
        
        # Fetch extended data for technical analysis
        session = get_yahoo_session()
        
        try:
            time.sleep(0.3)
            print(f"[INDEX] Fetching extended data for {resolved}")
            
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
                        
                        # 52-week metrics
                        week_52_high = max(highs) if highs else None
                        week_52_low = min(lows) if lows else None
                        
                        # Moving averages
                        ma_20 = sum(closes[-20:]) / len(closes[-20:]) if len(closes) >= 20 else None
                        ma_50 = sum(closes[-50:]) / len(closes[-50:]) if len(closes) >= 50 else None
                        ma_200 = sum(closes[-200:]) / len(closes[-200:]) if len(closes) >= 200 else None
                        
                        # Volatility
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
                        
                        # Performance metrics
                        return_1w = ((current - closes[-5]) / closes[-5] * 100) if len(closes) > 5 else None
                        return_1m = ((current - closes[-21]) / closes[-21] * 100) if len(closes) > 21 else None
                        return_3m = ((current - closes[-63]) / closes[-63] * 100) if len(closes) > 63 else None
                        return_6m = ((current - closes[-126]) / closes[-126] * 100) if len(closes) > 126 else None
                        return_ytd = ((current - closes[0]) / closes[0] * 100) if closes else None
                        
                        # RSI calculation (14-day)
                        if len(closes) >= 15:
                            gains = []
                            losses = []
                            for i in range(1, 15):
                                diff = closes[-i] - closes[-(i+1)]
                                if diff > 0:
                                    gains.append(diff)
                                    losses.append(0)
                                else:
                                    gains.append(0)
                                    losses.append(abs(diff))
                            avg_gain = sum(gains) / 14
                            avg_loss = sum(losses) / 14
                            if avg_loss > 0:
                                rs = avg_gain / avg_loss
                                rsi = 100 - (100 / (1 + rs))
                            else:
                                rsi = 100
                        else:
                            rsi = None
                        
                        # Trend direction
                        trend = "Bullish" if current > ma_50 > ma_200 else "Bearish" if current < ma_50 < ma_200 else "Neutral"
                        
                        # Volume analysis
                        avg_volume = sum(volumes[-20:]) / len(volumes[-20:]) if len(volumes) >= 20 else None
                        volume_ratio = (volumes[-1] / avg_volume) if avg_volume and volumes else None
                        
                        basic_data.update({
                            # 52-week data
                            "fifty_two_week_high": week_52_high,
                            "fifty_two_week_low": week_52_low,
                            "pct_from_52w_high": ((current - week_52_high) / week_52_high * 100) if week_52_high else None,
                            "pct_from_52w_low": ((current - week_52_low) / week_52_low * 100) if week_52_low else None,
                            
                            # Moving averages
                            "ma_20": ma_20,
                            "ma_50": ma_50,
                            "ma_200": ma_200,
                            "above_ma_200": current > ma_200 if ma_200 else None,
                            
                            # Technical indicators
                            "rsi_14": rsi,
                            "volatility_annualized": volatility,
                            "trend": trend,
                            
                            # Performance
                            "return_1w": return_1w,
                            "return_1m": return_1m,
                            "return_3m": return_3m,
                            "return_6m": return_6m,
                            "return_ytd": return_ytd,
                            
                            # Volume
                            "avg_volume_20d": avg_volume,
                            "volume_ratio": volume_ratio,
                            
                            # Data info
                            "data_points": len(closes),
                        })
                        
        except Exception as e:
            print(f"[INDEX] Extended data error: {e}")
        
        set_cache(cache_key, basic_data)
        return basic_data
    
    @staticmethod
    def fetch_history(name: str, period: str = "3mo") -> Dict[str, Any]:
        """Fetch index historical data"""
        resolved = IndexFetcher.resolve(name)
        return fetch_yahoo_history(resolved, period)

