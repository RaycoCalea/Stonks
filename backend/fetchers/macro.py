"""
Macro Economic Data Fetcher
Fetches money supply, debt, Fed data, options market data, etc.
Uses FRED API and Yahoo Finance for economic indicators
"""
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List
from .base import get_cache, set_cache, HEADERS, fetch_yahoo_chart

# Macro data symbols map - US and Global
MACRO_MAP = {
    # ==================== US ECONOMY ====================
    # Money Supply
    "m1": {"symbol": "WM1NS", "name": "M1 Money Supply (US)", "source": "FRED", "region": "US"},
    "m2": {"symbol": "WM2NS", "name": "M2 Money Supply (US)", "source": "FRED", "region": "US"},
    "money supply": {"symbol": "WM2NS", "name": "M2 Money Supply (US)", "source": "FRED", "region": "US"},
    
    # Interest Rates
    "fed funds": {"symbol": "DFF", "name": "Federal Funds Rate", "source": "FRED", "region": "US"},
    "fed rate": {"symbol": "DFF", "name": "Federal Funds Rate", "source": "FRED", "region": "US"},
    "prime rate": {"symbol": "DPRIME", "name": "Bank Prime Loan Rate", "source": "FRED", "region": "US"},
    
    # Debt
    "us debt": {"symbol": "GFDEBTN", "name": "US Federal Debt", "source": "FRED", "region": "US"},
    "debt": {"symbol": "GFDEBTN", "name": "US Federal Debt", "source": "FRED", "region": "US"},
    "debt to gdp": {"symbol": "GFDEGDQ188S", "name": "Debt to GDP Ratio", "source": "FRED", "region": "US"},
    
    # Inflation
    "cpi": {"symbol": "CPIAUCSL", "name": "Consumer Price Index (US)", "source": "FRED", "region": "US"},
    "inflation": {"symbol": "T10YIE", "name": "10-Year Breakeven Inflation", "source": "FRED", "region": "US"},
    "pce": {"symbol": "PCEPI", "name": "PCE Price Index", "source": "FRED", "region": "US"},
    
    # Employment
    "unemployment": {"symbol": "UNRATE", "name": "Unemployment Rate (US)", "source": "FRED", "region": "US"},
    "nonfarm payrolls": {"symbol": "PAYEMS", "name": "Nonfarm Payrolls", "source": "FRED", "region": "US"},
    "jobs": {"symbol": "PAYEMS", "name": "Nonfarm Payrolls", "source": "FRED", "region": "US"},
    "initial claims": {"symbol": "ICSA", "name": "Initial Jobless Claims", "source": "FRED", "region": "US"},
    
    # GDP
    "gdp": {"symbol": "GDP", "name": "US GDP", "source": "FRED", "region": "US"},
    "us gdp": {"symbol": "GDP", "name": "US GDP", "source": "FRED", "region": "US"},
    "real gdp": {"symbol": "GDPC1", "name": "Real GDP (US)", "source": "FRED", "region": "US"},
    "gdp growth": {"symbol": "A191RL1Q225SBEA", "name": "GDP Growth Rate", "source": "FRED", "region": "US"},
    
    # Housing
    "housing starts": {"symbol": "HOUST", "name": "Housing Starts", "source": "FRED", "region": "US"},
    "home prices": {"symbol": "CSUSHPISA", "name": "Case-Shiller Home Price Index", "source": "FRED", "region": "US"},
    "mortgage rate": {"symbol": "MORTGAGE30US", "name": "30-Year Mortgage Rate", "source": "FRED", "region": "US"},
    
    # Consumer
    "consumer confidence": {"symbol": "UMCSENT", "name": "Consumer Sentiment (US)", "source": "FRED", "region": "US"},
    "retail sales": {"symbol": "RSXFS", "name": "Retail Sales (US)", "source": "FRED", "region": "US"},
    
    # Manufacturing
    "industrial production": {"symbol": "INDPRO", "name": "Industrial Production (US)", "source": "FRED", "region": "US"},
    "capacity utilization": {"symbol": "TCU", "name": "Capacity Utilization", "source": "FRED", "region": "US"},
    "pmi": {"symbol": "MANEMP", "name": "Manufacturing Employment", "source": "FRED", "region": "US"},
    
    # Options & Volatility
    "vix": {"symbol": "^VIX", "name": "CBOE Volatility Index", "source": "YAHOO", "region": "US"},
    "vvix": {"symbol": "^VVIX", "name": "VIX of VIX", "source": "YAHOO", "region": "US"},
    "skew": {"symbol": "^SKEW", "name": "CBOE SKEW Index", "source": "YAHOO", "region": "US"},
    
    # Currency
    "dollar index": {"symbol": "DX-Y.NYB", "name": "US Dollar Index", "source": "YAHOO", "region": "US"},
    "dxy": {"symbol": "DX-Y.NYB", "name": "US Dollar Index", "source": "YAHOO", "region": "US"},
    
    # Bond yields (spreads)
    "yield curve": {"symbol": "T10Y2Y", "name": "10Y-2Y Yield Spread", "source": "FRED", "region": "US"},
    "high yield spread": {"symbol": "BAMLH0A0HYM2", "name": "High Yield Spread", "source": "FRED", "region": "US"},
    "ted spread": {"symbol": "TEDRATE", "name": "TED Spread", "source": "FRED", "region": "US"},
    
    # Balance Sheet
    "fed balance sheet": {"symbol": "WALCL", "name": "Fed Total Assets", "source": "FRED", "region": "US"},
    "fed assets": {"symbol": "WALCL", "name": "Fed Total Assets", "source": "FRED", "region": "US"},
    "reverse repo": {"symbol": "RRPONTSYD", "name": "Reverse Repo Outstanding", "source": "FRED", "region": "US"},
    
    # ==================== EUROPE ====================
    # ECB & Euro Area
    "ecb rate": {"symbol": "ECBDFR", "name": "ECB Deposit Facility Rate", "source": "FRED", "region": "EU"},
    "eu inflation": {"symbol": "CP0000EZ19M086NEST", "name": "Euro Area Inflation (HICP)", "source": "FRED", "region": "EU"},
    "eu cpi": {"symbol": "CP0000EZ19M086NEST", "name": "Euro Area CPI", "source": "FRED", "region": "EU"},
    "eu unemployment": {"symbol": "LRHUTTTTEZM156S", "name": "Euro Area Unemployment", "source": "FRED", "region": "EU"},
    "eu gdp": {"symbol": "CLVMNACSCAB1GQEA19", "name": "Euro Area Real GDP", "source": "FRED", "region": "EU"},
    "euro gdp": {"symbol": "CLVMNACSCAB1GQEA19", "name": "Euro Area Real GDP", "source": "FRED", "region": "EU"},
    "eu m3": {"symbol": "MABMM301EZM189S", "name": "Euro Area M3 Money Supply", "source": "FRED", "region": "EU"},
    "euribor": {"symbol": "IR3TIB01EZM156N", "name": "3-Month Euribor", "source": "FRED", "region": "EU"},
    
    # Germany
    "german gdp": {"symbol": "CLVMNACSCAB1GQDE", "name": "Germany Real GDP", "source": "FRED", "region": "EU"},
    "germany gdp": {"symbol": "CLVMNACSCAB1GQDE", "name": "Germany Real GDP", "source": "FRED", "region": "EU"},
    "german cpi": {"symbol": "DEUCPIALLMINMEI", "name": "Germany CPI", "source": "FRED", "region": "EU"},
    "german unemployment": {"symbol": "LMUNRRTTDEM156S", "name": "Germany Unemployment", "source": "FRED", "region": "EU"},
    "german bund": {"symbol": "IRLTLT01DEM156N", "name": "Germany 10Y Bond Yield", "source": "FRED", "region": "EU"},
    "bund": {"symbol": "IRLTLT01DEM156N", "name": "Germany 10Y Bond Yield", "source": "FRED", "region": "EU"},
    "german ifo": {"symbol": "BSCICP03DEM665S", "name": "Germany IFO Business Climate", "source": "FRED", "region": "EU"},
    "ifo": {"symbol": "BSCICP03DEM665S", "name": "Germany IFO Business Climate", "source": "FRED", "region": "EU"},
    
    # UK
    "uk gdp": {"symbol": "CLVMNACSCAB1GQUK", "name": "UK Real GDP", "source": "FRED", "region": "UK"},
    "uk cpi": {"symbol": "GBRCPIALLMINMEI", "name": "UK CPI", "source": "FRED", "region": "UK"},
    "uk inflation": {"symbol": "GBRCPIALLMINMEI", "name": "UK Inflation", "source": "FRED", "region": "UK"},
    "uk unemployment": {"symbol": "LMUNRRTTGBM156S", "name": "UK Unemployment", "source": "FRED", "region": "UK"},
    "boe rate": {"symbol": "BOERUKM", "name": "Bank of England Rate", "source": "FRED", "region": "UK"},
    "uk gilt": {"symbol": "IRLTLT01GBM156N", "name": "UK 10Y Gilt Yield", "source": "FRED", "region": "UK"},
    "gilt": {"symbol": "IRLTLT01GBM156N", "name": "UK 10Y Gilt Yield", "source": "FRED", "region": "UK"},
    
    # France
    "france gdp": {"symbol": "CLVMNACSCAB1GQFR", "name": "France Real GDP", "source": "FRED", "region": "EU"},
    "france cpi": {"symbol": "FRACPIALLMINMEI", "name": "France CPI", "source": "FRED", "region": "EU"},
    "france unemployment": {"symbol": "LMUNRRTTFRM156S", "name": "France Unemployment", "source": "FRED", "region": "EU"},
    
    # Italy
    "italy gdp": {"symbol": "CLVMNACSCAB1GQIT", "name": "Italy Real GDP", "source": "FRED", "region": "EU"},
    "italy cpi": {"symbol": "ITACPIALLMINMEI", "name": "Italy CPI", "source": "FRED", "region": "EU"},
    "italy unemployment": {"symbol": "LMUNRRTTITM156S", "name": "Italy Unemployment", "source": "FRED", "region": "EU"},
    "btp": {"symbol": "IRLTLT01ITM156N", "name": "Italy 10Y BTP Yield", "source": "FRED", "region": "EU"},
    
    # Spain
    "spain gdp": {"symbol": "CLVMNACSCAB1GQES", "name": "Spain Real GDP", "source": "FRED", "region": "EU"},
    "spain unemployment": {"symbol": "LMUNRRTTESM156S", "name": "Spain Unemployment", "source": "FRED", "region": "EU"},
    
    # ==================== ASIA ====================
    # Japan
    "japan gdp": {"symbol": "JPNRGDPEXP", "name": "Japan Real GDP", "source": "FRED", "region": "ASIA"},
    "japan cpi": {"symbol": "JPNCPIALLMINMEI", "name": "Japan CPI", "source": "FRED", "region": "ASIA"},
    "japan inflation": {"symbol": "JPNCPIALLMINMEI", "name": "Japan Inflation", "source": "FRED", "region": "ASIA"},
    "japan unemployment": {"symbol": "LMUNRRTTJPM156S", "name": "Japan Unemployment", "source": "FRED", "region": "ASIA"},
    "boj rate": {"symbol": "IRSTCI01JPM156N", "name": "Bank of Japan Rate", "source": "FRED", "region": "ASIA"},
    "japan rate": {"symbol": "IRSTCI01JPM156N", "name": "Bank of Japan Rate", "source": "FRED", "region": "ASIA"},
    "jgb": {"symbol": "IRLTLT01JPM156N", "name": "Japan 10Y JGB Yield", "source": "FRED", "region": "ASIA"},
    "japan industrial": {"symbol": "JPNPROINDMISMEI", "name": "Japan Industrial Production", "source": "FRED", "region": "ASIA"},
    "nikkei": {"symbol": "^N225", "name": "Nikkei 225", "source": "YAHOO", "region": "ASIA"},
    
    # China
    "china gdp": {"symbol": "MKTGDPCNA646NWDB", "name": "China GDP", "source": "FRED", "region": "ASIA"},
    "china cpi": {"symbol": "CHNCPIALLMINMEI", "name": "China CPI", "source": "FRED", "region": "ASIA"},
    "china inflation": {"symbol": "CHNCPIALLMINMEI", "name": "China Inflation", "source": "FRED", "region": "ASIA"},
    "china pmi": {"symbol": "CHNPMINDMISMEI", "name": "China Manufacturing PMI", "source": "FRED", "region": "ASIA"},
    "china m2": {"symbol": "MYAGM2CNM189N", "name": "China M2 Money Supply", "source": "FRED", "region": "ASIA"},
    "pboc rate": {"symbol": "IR3TIB01CNM156N", "name": "China Interbank Rate", "source": "FRED", "region": "ASIA"},
    "china industrial": {"symbol": "CHNPROINDMISMEI", "name": "China Industrial Production", "source": "FRED", "region": "ASIA"},
    "shanghai": {"symbol": "000001.SS", "name": "Shanghai Composite", "source": "YAHOO", "region": "ASIA"},
    "hang seng": {"symbol": "^HSI", "name": "Hang Seng Index", "source": "YAHOO", "region": "ASIA"},
    "hsi": {"symbol": "^HSI", "name": "Hang Seng Index", "source": "YAHOO", "region": "ASIA"},
    
    # South Korea
    "korea gdp": {"symbol": "NAEXKP01KRQ652S", "name": "South Korea GDP", "source": "FRED", "region": "ASIA"},
    "korea cpi": {"symbol": "KORCPIALLMINMEI", "name": "South Korea CPI", "source": "FRED", "region": "ASIA"},
    "korea unemployment": {"symbol": "LMUNRRTTORM156S", "name": "South Korea Unemployment", "source": "FRED", "region": "ASIA"},
    "kospi": {"symbol": "^KS11", "name": "KOSPI Index", "source": "YAHOO", "region": "ASIA"},
    
    # India
    "india gdp": {"symbol": "MKTGDPINA646NWDB", "name": "India GDP", "source": "FRED", "region": "ASIA"},
    "india cpi": {"symbol": "INDCPIALLMINMEI", "name": "India CPI", "source": "FRED", "region": "ASIA"},
    "india inflation": {"symbol": "INDCPIALLMINMEI", "name": "India Inflation", "source": "FRED", "region": "ASIA"},
    "sensex": {"symbol": "^BSESN", "name": "BSE Sensex", "source": "YAHOO", "region": "ASIA"},
    "nifty": {"symbol": "^NSEI", "name": "Nifty 50", "source": "YAHOO", "region": "ASIA"},
    "rbi rate": {"symbol": "IR3TIB01INM156N", "name": "RBI Interest Rate", "source": "FRED", "region": "ASIA"},
    
    # Australia
    "australia gdp": {"symbol": "NAEXKP01AUQ652S", "name": "Australia GDP", "source": "FRED", "region": "OCEANIA"},
    "australia cpi": {"symbol": "AUSCPIALLQINMEI", "name": "Australia CPI", "source": "FRED", "region": "OCEANIA"},
    "australia unemployment": {"symbol": "LMUNRRTTAUM156S", "name": "Australia Unemployment", "source": "FRED", "region": "OCEANIA"},
    "rba rate": {"symbol": "IRSTCI01AUM156N", "name": "RBA Cash Rate", "source": "FRED", "region": "OCEANIA"},
    "asx": {"symbol": "^AXJO", "name": "ASX 200", "source": "YAHOO", "region": "OCEANIA"},
    
    # ==================== EMERGING MARKETS ====================
    # Brazil
    "brazil gdp": {"symbol": "NAEXKP01BRQ652S", "name": "Brazil GDP", "source": "FRED", "region": "LATAM"},
    "brazil cpi": {"symbol": "BRACPIALLMINMEI", "name": "Brazil CPI", "source": "FRED", "region": "LATAM"},
    "brazil inflation": {"symbol": "BRACPIALLMINMEI", "name": "Brazil Inflation", "source": "FRED", "region": "LATAM"},
    "selic": {"symbol": "IRSTCI01BRM156N", "name": "Brazil Selic Rate", "source": "FRED", "region": "LATAM"},
    "bovespa": {"symbol": "^BVSP", "name": "Bovespa Index", "source": "YAHOO", "region": "LATAM"},
    "ibovespa": {"symbol": "^BVSP", "name": "Bovespa Index", "source": "YAHOO", "region": "LATAM"},
    
    # Mexico
    "mexico gdp": {"symbol": "NAEXKP01MXQ652S", "name": "Mexico GDP", "source": "FRED", "region": "LATAM"},
    "mexico cpi": {"symbol": "MEXCPIALLMINMEI", "name": "Mexico CPI", "source": "FRED", "region": "LATAM"},
    "mexico inflation": {"symbol": "MEXCPIALLMINMEI", "name": "Mexico Inflation", "source": "FRED", "region": "LATAM"},
    "banxico rate": {"symbol": "IRSTCI01MXM156N", "name": "Banxico Rate", "source": "FRED", "region": "LATAM"},
    
    # Russia
    "russia gdp": {"symbol": "NAEXKP01RUQ652S", "name": "Russia GDP", "source": "FRED", "region": "EMEA"},
    "russia cpi": {"symbol": "RUSCPIALLMINMEI", "name": "Russia CPI", "source": "FRED", "region": "EMEA"},
    "cbr rate": {"symbol": "IR3TIB01RUM156N", "name": "CBR Key Rate", "source": "FRED", "region": "EMEA"},
    
    # South Africa
    "sa gdp": {"symbol": "NAEXKP01ZAQ652S", "name": "South Africa GDP", "source": "FRED", "region": "EMEA"},
    "sa cpi": {"symbol": "ZAFCPIALLMINMEI", "name": "South Africa CPI", "source": "FRED", "region": "EMEA"},
    "sarb rate": {"symbol": "IRSTCI01ZAM156N", "name": "SARB Rate", "source": "FRED", "region": "EMEA"},
    
    # Turkey
    "turkey gdp": {"symbol": "NAEXKP01TRQ652S", "name": "Turkey GDP", "source": "FRED", "region": "EMEA"},
    "turkey cpi": {"symbol": "TURCPIALLMINMEI", "name": "Turkey CPI", "source": "FRED", "region": "EMEA"},
    "turkey inflation": {"symbol": "TURCPIALLMINMEI", "name": "Turkey Inflation", "source": "FRED", "region": "EMEA"},
    "tcmb rate": {"symbol": "IR3TIB01TRM156N", "name": "TCMB Rate", "source": "FRED", "region": "EMEA"},
    
    # ==================== GLOBAL INDICES ====================
    "world gdp": {"symbol": "NYGDPMKTPCDWLD", "name": "World GDP", "source": "FRED", "region": "GLOBAL"},
    "global pmi": {"symbol": "GPMIIPM", "name": "Global Manufacturing PMI", "source": "FRED", "region": "GLOBAL"},
    "msci world": {"symbol": "URTH", "name": "MSCI World ETF", "source": "YAHOO", "region": "GLOBAL"},
    "msci em": {"symbol": "EEM", "name": "MSCI Emerging Markets ETF", "source": "YAHOO", "region": "GLOBAL"},
    "emerging markets": {"symbol": "EEM", "name": "MSCI Emerging Markets ETF", "source": "YAHOO", "region": "GLOBAL"},
    
    # Commodities
    "oil price": {"symbol": "DCOILWTICO", "name": "WTI Crude Oil Price", "source": "FRED", "region": "GLOBAL"},
    "gold price": {"symbol": "GOLDAMGBD228NLBM", "name": "Gold Price (London Fix)", "source": "FRED", "region": "GLOBAL"},
    "copper price": {"symbol": "PCOPPUSDM", "name": "Copper Price", "source": "FRED", "region": "GLOBAL"},
    "baltic dry": {"symbol": "BDIY", "name": "Baltic Dry Index", "source": "FRED", "region": "GLOBAL"},
    
    # ==================== SEARCH-FRIENDLY ALIASES ====================
    # US Aliases
    "us unemployment": {"symbol": "UNRATE", "name": "US Unemployment Rate", "source": "FRED", "region": "US"},
    "us inflation": {"symbol": "T10YIE", "name": "US Inflation Expectations", "source": "FRED", "region": "US"},
    "us cpi": {"symbol": "CPIAUCSL", "name": "US Consumer Price Index", "source": "FRED", "region": "US"},
    "american unemployment": {"symbol": "UNRATE", "name": "US Unemployment Rate", "source": "FRED", "region": "US"},
    "us stocks": {"symbol": "^GSPC", "name": "S&P 500 Index", "source": "YAHOO", "region": "US"},
    "american stocks": {"symbol": "^GSPC", "name": "S&P 500 Index", "source": "YAHOO", "region": "US"},
    "s&p 500": {"symbol": "^GSPC", "name": "S&P 500 Index", "source": "YAHOO", "region": "US"},
    "nasdaq": {"symbol": "^IXIC", "name": "NASDAQ Composite", "source": "YAHOO", "region": "US"},
    "dow jones": {"symbol": "^DJI", "name": "Dow Jones Industrial Average", "source": "YAHOO", "region": "US"},
    "dow": {"symbol": "^DJI", "name": "Dow Jones Industrial Average", "source": "YAHOO", "region": "US"},
    
    # Japan Yen & Japan Aliases
    "japan yen": {"symbol": "DEXJPUS", "name": "Japanese Yen to USD Exchange Rate", "source": "FRED", "region": "ASIA"},
    "japanese yen": {"symbol": "DEXJPUS", "name": "Japanese Yen to USD Exchange Rate", "source": "FRED", "region": "ASIA"},
    "yen": {"symbol": "DEXJPUS", "name": "Japanese Yen to USD Exchange Rate", "source": "FRED", "region": "ASIA"},
    "usdjpy": {"symbol": "DEXJPUS", "name": "USD/JPY Exchange Rate", "source": "FRED", "region": "ASIA"},
    "japan stocks": {"symbol": "^N225", "name": "Nikkei 225 Index", "source": "YAHOO", "region": "ASIA"},
    "japanese stocks": {"symbol": "^N225", "name": "Nikkei 225 Index", "source": "YAHOO", "region": "ASIA"},
    
    # Europe Aliases
    "europe stocks": {"symbol": "^STOXX50E", "name": "Euro Stoxx 50", "source": "YAHOO", "region": "EU"},
    "european stocks": {"symbol": "^STOXX50E", "name": "Euro Stoxx 50", "source": "YAHOO", "region": "EU"},
    "euro stoxx": {"symbol": "^STOXX50E", "name": "Euro Stoxx 50", "source": "YAHOO", "region": "EU"},
    "stoxx": {"symbol": "^STOXX50E", "name": "Euro Stoxx 50", "source": "YAHOO", "region": "EU"},
    "europe inflation": {"symbol": "CP0000EZ19M086NEST", "name": "Euro Area Inflation", "source": "FRED", "region": "EU"},
    "european inflation": {"symbol": "CP0000EZ19M086NEST", "name": "Euro Area Inflation", "source": "FRED", "region": "EU"},
    "euro": {"symbol": "DEXUSEU", "name": "EUR/USD Exchange Rate", "source": "FRED", "region": "EU"},
    "eurusd": {"symbol": "DEXUSEU", "name": "EUR/USD Exchange Rate", "source": "FRED", "region": "EU"},
    "dax": {"symbol": "^GDAXI", "name": "German DAX Index", "source": "YAHOO", "region": "EU"},
    "cac": {"symbol": "^FCHI", "name": "French CAC 40", "source": "YAHOO", "region": "EU"},
    "ftse mib": {"symbol": "FTSEMIB.MI", "name": "Italian FTSE MIB", "source": "YAHOO", "region": "EU"},
    
    # UK/British Aliases
    "british unemployment": {"symbol": "LMUNRRTTGBM156S", "name": "UK Unemployment Rate", "source": "FRED", "region": "UK"},
    "britain unemployment": {"symbol": "LMUNRRTTGBM156S", "name": "UK Unemployment Rate", "source": "FRED", "region": "UK"},
    "british inflation": {"symbol": "GBRCPIALLMINMEI", "name": "UK Inflation Rate", "source": "FRED", "region": "UK"},
    "britain inflation": {"symbol": "GBRCPIALLMINMEI", "name": "UK Inflation Rate", "source": "FRED", "region": "UK"},
    "uk stocks": {"symbol": "^FTSE", "name": "FTSE 100 Index", "source": "YAHOO", "region": "UK"},
    "british stocks": {"symbol": "^FTSE", "name": "FTSE 100 Index", "source": "YAHOO", "region": "UK"},
    "ftse 100": {"symbol": "^FTSE", "name": "FTSE 100 Index", "source": "YAHOO", "region": "UK"},
    "ftse": {"symbol": "^FTSE", "name": "FTSE 100 Index", "source": "YAHOO", "region": "UK"},
    "pound": {"symbol": "DEXUSUK", "name": "GBP/USD Exchange Rate", "source": "FRED", "region": "UK"},
    "gbp": {"symbol": "DEXUSUK", "name": "GBP/USD Exchange Rate", "source": "FRED", "region": "UK"},
    "gbpusd": {"symbol": "DEXUSUK", "name": "GBP/USD Exchange Rate", "source": "FRED", "region": "UK"},
    
    # China Aliases
    "chinese yuan": {"symbol": "DEXCHUS", "name": "Chinese Yuan to USD", "source": "FRED", "region": "ASIA"},
    "yuan": {"symbol": "DEXCHUS", "name": "Chinese Yuan to USD", "source": "FRED", "region": "ASIA"},
    "cny": {"symbol": "DEXCHUS", "name": "Chinese Yuan to USD", "source": "FRED", "region": "ASIA"},
    "china stocks": {"symbol": "000001.SS", "name": "Shanghai Composite", "source": "YAHOO", "region": "ASIA"},
    "chinese stocks": {"symbol": "000001.SS", "name": "Shanghai Composite", "source": "YAHOO", "region": "ASIA"},
    
    # Switzerland
    "swiss franc": {"symbol": "DEXSZUS", "name": "Swiss Franc to USD", "source": "FRED", "region": "EU"},
    "chf": {"symbol": "DEXSZUS", "name": "Swiss Franc to USD", "source": "FRED", "region": "EU"},
    "usdchf": {"symbol": "DEXSZUS", "name": "USD/CHF Exchange Rate", "source": "FRED", "region": "EU"},
    "smi": {"symbol": "^SSMI", "name": "Swiss Market Index", "source": "YAHOO", "region": "EU"},
    
    # Canada
    "canadian dollar": {"symbol": "DEXCAUS", "name": "Canadian Dollar to USD", "source": "FRED", "region": "AMERICAS"},
    "cad": {"symbol": "DEXCAUS", "name": "Canadian Dollar to USD", "source": "FRED", "region": "AMERICAS"},
    "usdcad": {"symbol": "DEXCAUS", "name": "USD/CAD Exchange Rate", "source": "FRED", "region": "AMERICAS"},
    "canada gdp": {"symbol": "NAEXKP01CAQ657S", "name": "Canada GDP", "source": "FRED", "region": "AMERICAS"},
    "canada cpi": {"symbol": "CANCPIALLMINMEI", "name": "Canada CPI", "source": "FRED", "region": "AMERICAS"},
    "canada unemployment": {"symbol": "LMUNRRTTCAM156S", "name": "Canada Unemployment", "source": "FRED", "region": "AMERICAS"},
    "canada inflation": {"symbol": "CANCPIALLMINMEI", "name": "Canada Inflation", "source": "FRED", "region": "AMERICAS"},
    "tsx": {"symbol": "^GSPTSE", "name": "S&P/TSX Composite", "source": "YAHOO", "region": "AMERICAS"},
    "canada stocks": {"symbol": "^GSPTSE", "name": "S&P/TSX Composite", "source": "YAHOO", "region": "AMERICAS"},
    
    # Australia Aliases
    "aussie": {"symbol": "DEXUSAL", "name": "Australian Dollar to USD", "source": "FRED", "region": "OCEANIA"},
    "aud": {"symbol": "DEXUSAL", "name": "Australian Dollar to USD", "source": "FRED", "region": "OCEANIA"},
    "audusd": {"symbol": "DEXUSAL", "name": "AUD/USD Exchange Rate", "source": "FRED", "region": "OCEANIA"},
    "australia stocks": {"symbol": "^AXJO", "name": "ASX 200 Index", "source": "YAHOO", "region": "OCEANIA"},
    "australian stocks": {"symbol": "^AXJO", "name": "ASX 200 Index", "source": "YAHOO", "region": "OCEANIA"},
    
    # Population / Demographics
    "us population": {"symbol": "POPTHM", "name": "US Population", "source": "FRED", "region": "US"},
    "population": {"symbol": "POPTHM", "name": "US Population", "source": "FRED", "region": "US"},
    "us pop growth": {"symbol": "SPPOPGROWUSA", "name": "US Population Growth", "source": "FRED", "region": "US"},
    "world population": {"symbol": "SPPOPTOTLW", "name": "World Population", "source": "FRED", "region": "GLOBAL"},
    
    # ==================== WEATHER & CLIMATE DATA ====================
    # Temperature Indices
    "us temperature": {"symbol": "TEMP_US", "name": "US Average Temperature Anomaly", "source": "FRED", "region": "US"},
    "heating degree days": {"symbol": "HDDHDD", "name": "Heating Degree Days", "source": "FRED", "region": "US"},
    "cooling degree days": {"symbol": "CDDCDD", "name": "Cooling Degree Days", "source": "FRED", "region": "US"},
    
    # Climate & Drought
    "drought index": {"symbol": "DSPI", "name": "Drought Severity & Coverage Index", "source": "FRED", "region": "US"},
    "palmer drought": {"symbol": "DPDHI", "name": "Palmer Drought Severity Index", "source": "FRED", "region": "US"},
    
    # ==================== ENERGY DATA ====================
    "natural gas storage": {"symbol": "NWGSPUS", "name": "Natural Gas Storage (US)", "source": "FRED", "region": "US"},
    "crude oil stocks": {"symbol": "WCRSTUS1", "name": "Crude Oil Stocks (US)", "source": "FRED", "region": "US"},
    "gasoline price": {"symbol": "GASREGW", "name": "Retail Gasoline Price (US)", "source": "FRED", "region": "US"},
    "electricity consumption": {"symbol": "IPG2211A2N", "name": "Electric Power Generation", "source": "FRED", "region": "US"},
    
    # ==================== AGRICULTURE & FOOD ====================
    "wheat price": {"symbol": "PWHEAMTUSDM", "name": "Wheat Price (Global)", "source": "FRED", "region": "GLOBAL"},
    "corn price": {"symbol": "PMAIZMTUSDM", "name": "Corn Price (Global)", "source": "FRED", "region": "GLOBAL"},
    "soybeans price": {"symbol": "PSOYBUSDQ", "name": "Soybeans Price", "source": "FRED", "region": "GLOBAL"},
    "food price index": {"symbol": "PFOODINDEXM", "name": "Global Food Price Index", "source": "FRED", "region": "GLOBAL"},
    "fertilizer price": {"symbol": "PFERTILIZERM", "name": "Fertilizer Price Index", "source": "FRED", "region": "GLOBAL"},
    
    # ==================== CREDIT & LENDING ====================
    "credit card delinquency": {"symbol": "DRCCLACBS", "name": "Credit Card Delinquency Rate", "source": "FRED", "region": "US"},
    "mortgage delinquency": {"symbol": "DRSFRMACBS", "name": "Mortgage Delinquency Rate", "source": "FRED", "region": "US"},
    "commercial delinquency": {"symbol": "DRBLACBS", "name": "Commercial Loan Delinquency", "source": "FRED", "region": "US"},
    "consumer credit": {"symbol": "TOTALSL", "name": "Total Consumer Credit", "source": "FRED", "region": "US"},
    "auto loans": {"symbol": "MVLOAS", "name": "Auto Loans Outstanding", "source": "FRED", "region": "US"},
    "student loans": {"symbol": "SLOAS", "name": "Student Loans Outstanding", "source": "FRED", "region": "US"},
    
    # ==================== REAL ESTATE ====================
    "rental vacancy": {"symbol": "RRVRUSQ156N", "name": "Rental Vacancy Rate", "source": "FRED", "region": "US"},
    "homeownership rate": {"symbol": "RSAHORUSQ156S", "name": "Homeownership Rate", "source": "FRED", "region": "US"},
    "median rent": {"symbol": "MEDLISPRIPERSQUAM", "name": "Median Listing Price per SqFt", "source": "FRED", "region": "US"},
    "construction spending": {"symbol": "TTLCONS", "name": "Total Construction Spending", "source": "FRED", "region": "US"},
    
    # ==================== BANKING & FINANCIAL ==================== 
    "bank lending": {"symbol": "TOTLL", "name": "Total Bank Lending", "source": "FRED", "region": "US"},
    "commercial loans": {"symbol": "BUSLOANS", "name": "Commercial & Industrial Loans", "source": "FRED", "region": "US"},
    "bank reserves": {"symbol": "TOTRESNS", "name": "Total Bank Reserves", "source": "FRED", "region": "US"},
    "excess reserves": {"symbol": "EXCSRESNS", "name": "Excess Reserves", "source": "FRED", "region": "US"},
    "monetary velocity": {"symbol": "M2V", "name": "Velocity of M2 Money", "source": "FRED", "region": "US"},
    "monetary base": {"symbol": "BOGMBASE", "name": "Monetary Base", "source": "FRED", "region": "US"},
    
    # ==================== TRADE & GLOBAL FLOWS ====================
    "trade balance": {"symbol": "BOPGSTB", "name": "US Trade Balance", "source": "FRED", "region": "US"},
    "imports": {"symbol": "BOPTIMP", "name": "US Imports", "source": "FRED", "region": "US"},
    "exports": {"symbol": "BOPTEXP", "name": "US Exports", "source": "FRED", "region": "US"},
    "container shipping": {"symbol": "HARPEX", "name": "Harper Petersen Charter Rates", "source": "FRED", "region": "GLOBAL"},
    
    # ==================== VOLATILITY & RISK ====================
    "move index": {"symbol": "MOVE", "name": "MOVE Bond Volatility Index", "source": "YAHOO", "region": "US"},
    "oil volatility": {"symbol": "OVX", "name": "Oil Volatility Index", "source": "YAHOO", "region": "GLOBAL"},
    "gold volatility": {"symbol": "GVZ", "name": "Gold Volatility Index", "source": "YAHOO", "region": "GLOBAL"},
    "currency volatility": {"symbol": "EUVIX", "name": "Euro Currency Volatility", "source": "YAHOO", "region": "EU"},
    
    # ==================== GOVERNMENT & POLICY ====================
    "federal deficit": {"symbol": "FYFSD", "name": "Federal Surplus/Deficit", "source": "FRED", "region": "US"},
    "federal spending": {"symbol": "FGEXPND", "name": "Federal Government Spending", "source": "FRED", "region": "US"},
    "federal receipts": {"symbol": "FGRECPT", "name": "Federal Government Receipts", "source": "FRED", "region": "US"},
    "defense spending": {"symbol": "FDEFX", "name": "Federal Defense Spending", "source": "FRED", "region": "US"},
    
    # ==================== LABOR MARKET DEPTH ====================
    "job openings": {"symbol": "JTSJOL", "name": "Job Openings (JOLTS)", "source": "FRED", "region": "US"},
    "quit rate": {"symbol": "JTSQUR", "name": "Quit Rate (JOLTS)", "source": "FRED", "region": "US"},
    "hire rate": {"symbol": "JTSHIR", "name": "Hire Rate (JOLTS)", "source": "FRED", "region": "US"},
    "layoffs": {"symbol": "JTSLDL", "name": "Layoffs Rate (JOLTS)", "source": "FRED", "region": "US"},
    "labor participation": {"symbol": "CIVPART", "name": "Labor Force Participation", "source": "FRED", "region": "US"},
    "employment ratio": {"symbol": "EMRATIO", "name": "Employment-Population Ratio", "source": "FRED", "region": "US"},
    "u6 unemployment": {"symbol": "U6RATE", "name": "U6 Unemployment (Underemployment)", "source": "FRED", "region": "US"},
    "avg hourly earnings": {"symbol": "CES0500000003", "name": "Average Hourly Earnings", "source": "FRED", "region": "US"},
    "weekly hours": {"symbol": "AWHMAN", "name": "Avg Weekly Hours Manufacturing", "source": "FRED", "region": "US"},
    
    # ==================== MANUFACTURING & INDUSTRY ====================
    "durable goods": {"symbol": "DGORDER", "name": "Durable Goods Orders", "source": "FRED", "region": "US"},
    "factory orders": {"symbol": "AMTMNO", "name": "Manufacturing New Orders", "source": "FRED", "region": "US"},
    "ism manufacturing": {"symbol": "NAPM", "name": "ISM Manufacturing PMI", "source": "FRED", "region": "US"},
    "ism services": {"symbol": "NAPMNOI", "name": "ISM Non-Manufacturing Index", "source": "FRED", "region": "US"},
    "inventory sales ratio": {"symbol": "ISRATIO", "name": "Business Inventory/Sales Ratio", "source": "FRED", "region": "US"},
    
    # ==================== FINANCIAL CONDITIONS ====================
    "financial stress": {"symbol": "STLFSI4", "name": "St. Louis Financial Stress Index", "source": "FRED", "region": "US"},
    "financial conditions": {"symbol": "NFCI", "name": "Chicago Fed Financial Conditions", "source": "FRED", "region": "US"},
    "kansas stress": {"symbol": "KCFSI", "name": "Kansas City Financial Stress", "source": "FRED", "region": "US"},
    "economic activity": {"symbol": "CFNAI", "name": "Chicago Fed National Activity", "source": "FRED", "region": "US"},
}


def fetch_fred_data(symbol: str, name: str) -> Dict[str, Any]:
    """Fetch data from FRED (St. Louis Fed)"""
    cache_key = f"fred:{symbol}"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    try:
        # FRED public data endpoint (no API key needed for basic data)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365 * 10)  # 10 years of data
        
        url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={symbol}"
        
        resp = requests.get(url, headers=HEADERS, timeout=15)
        
        if resp.status_code != 200:
            return {"error": f"FRED API error: {resp.status_code}"}
        
        # Parse CSV data
        lines = resp.text.strip().split('\n')
        if len(lines) < 2:
            return {"error": "No data available"}
        
        headers = lines[0].split(',')
        data_points = []
        
        for line in lines[1:]:
            parts = line.split(',')
            if len(parts) >= 2 and parts[1] != '.':
                try:
                    date = parts[0]
                    value = float(parts[1])
                    data_points.append({"date": date, "value": value})
                except ValueError:
                    continue
        
        if not data_points:
            return {"error": "No valid data points"}
        
        # Sort by date
        data_points.sort(key=lambda x: x['date'])
        
        # Calculate statistics
        values = [d['value'] for d in data_points]
        current = values[-1] if values else 0
        previous = values[-2] if len(values) > 1 else current
        change = current - previous
        change_pct = (change / previous * 100) if previous != 0 else 0
        
        # Year ago comparison
        year_ago_idx = max(0, len(values) - 252)
        year_ago = values[year_ago_idx] if values else current
        yoy_change = ((current - year_ago) / year_ago * 100) if year_ago != 0 else 0
        
        result = {
            "type": "macro",
            "asset_type": "macro",
            "symbol": symbol,
            "name": name,
            "source": "Federal Reserve Economic Data (FRED)",
            "current_value": current,
            "previous_value": previous,
            "change": change,
            "change_pct": round(change_pct, 2),
            "yoy_change_pct": round(yoy_change, 2),
            "high_52w": max(values[-252:]) if len(values) >= 252 else max(values) if values else 0,
            "low_52w": min(values[-252:]) if len(values) >= 252 else min(values) if values else 0,
            "all_time_high": max(values) if values else 0,
            "all_time_low": min(values) if values else 0,
            "data_points": len(data_points),
            "start_date": data_points[0]['date'],
            "end_date": data_points[-1]['date'],
            "last_updated": datetime.now().isoformat(),
            "history": data_points[-252:],  # Last year of data
        }
        
        set_cache(cache_key, result)
        return result
        
    except Exception as e:
        return {"error": f"Failed to fetch FRED data: {str(e)}"}


def fetch_yahoo_macro(symbol: str, name: str) -> Dict[str, Any]:
    """Fetch macro data from Yahoo Finance (VIX, etc.)"""
    result = fetch_yahoo_chart(symbol, "macro", name)
    if result.get("error"):
        return result
    
    result["type"] = "macro"
    result["asset_type"] = "macro"
    result["source"] = "Yahoo Finance"
    return result


class MacroFetcher:
    """Fetches macroeconomic data"""
    
    @staticmethod
    def is_fred_symbol(query: str) -> bool:
        """Check if query looks like a raw FRED symbol (uppercase, alphanumeric)"""
        return query.isupper() and len(query) >= 2 and any(c.isalpha() for c in query)
    
    @staticmethod
    def resolve(query: str) -> Dict[str, str]:
        """Resolve query to macro data info"""
        q = query.lower().strip()
        if q in MACRO_MAP:
            return MACRO_MAP[q]
        
        # Try uppercase version (for FRED symbols)
        if query.upper() in MACRO_MAP:
            return MACRO_MAP[query.upper()]
        
        # Partial match
        for key, info in MACRO_MAP.items():
            if q in key or key in q:
                return info
        
        return None
    
    @staticmethod
    def fetch_data(name: str) -> Dict[str, Any]:
        """Fetch macro data - supports friendly names and raw FRED symbols"""
        info = MacroFetcher.resolve(name)
        
        if info:
            # Found in MACRO_MAP
            if info["source"] == "FRED":
                result = fetch_fred_data(info["symbol"], info["name"])
            else:
                result = fetch_yahoo_macro(info["symbol"], info["name"])
            
            # Add region info
            if not result.get("error"):
                result["region"] = info.get("region", "US")
            
            return result
        
        # Not in MACRO_MAP - try direct FRED fetch if it looks like a FRED symbol
        if MacroFetcher.is_fred_symbol(name):
            result = fetch_fred_data(name, f"FRED: {name}")
            if not result.get("error"):
                result["region"] = "US"
                return result
        
        return {
            "error": f"Unknown macro indicator: {name}. Try: m2, fed funds, us debt, vix, cpi, unemployment, gdp, eu cpi, japan gdp, china pmi"
        }
    
    @staticmethod
    def list_indicators() -> List[Dict[str, str]]:
        """List all available macro indicators"""
        indicators = []
        seen = set()
        for key, info in MACRO_MAP.items():
            if info["symbol"] not in seen:
                indicators.append({
                    "key": key,
                    "symbol": info["symbol"],
                    "name": info["name"],
                    "source": info["source"],
                    "region": info.get("region", "US"),
                })
                seen.add(info["symbol"])
        
        # Sort by region then name
        indicators.sort(key=lambda x: (x["region"], x["name"]))
        return indicators
    
    @staticmethod
    def list_by_region() -> Dict[str, List[Dict]]:
        """List indicators grouped by region"""
        by_region = {}
        for indicator in MacroFetcher.list_indicators():
            region = indicator["region"]
            if region not in by_region:
                by_region[region] = []
            by_region[region].append(indicator)
        return by_region

