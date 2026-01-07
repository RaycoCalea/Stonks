"""
Macro Deep Analysis Module
Fetches long-term historical data for multiple assets across all asset classes,
performs comprehensive analysis, and exports to Parquet format.
"""

# Suppress Intel MKL warnings BEFORE importing numpy/scipy
import os
os.environ['MKL_SERVICE_FORCE_INTEL'] = '1'
os.environ['MKL_THREADING_LAYER'] = 'sequential'
os.environ['KMP_WARNINGS'] = '0'
os.environ['MKL_DEBUG_CPU_TYPE'] = '5'

import warnings
warnings.filterwarnings('ignore')

import time
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

# Import existing fetchers
from .stocks import StockFetcher
from .crypto import CryptoFetcher
from .commodities import CommodityFetcher
from .forex import ForexFetcher
from .indices import IndexFetcher
from .treasury import TreasuryFetcher
from .macro import MacroFetcher

# Rate limiting protection
REQUEST_DELAY = 1.0  # Delay between requests in seconds (increased)
MAX_RETRIES = 2  # Reduced retries to save time
BATCH_SIZE = 5  # Process assets in batches
BATCH_DELAY = 3  # Delay between batches in seconds

# Default assets to analyze - EXPANDED GLOBAL COVERAGE
DEFAULT_ASSETS = {
    # US STOCKS - Major sectors
    'stocks': [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',  # Tech
        'JPM', 'BAC', 'GS', 'V', 'MA',  # Financials
        'JNJ', 'PFE', 'UNH',  # Healthcare
        'XOM', 'CVX',  # Energy
        'WMT', 'COST', 'HD',  # Consumer
    ],
    # CRYPTO
    'crypto': ['bitcoin', 'ethereum'],  # Limited due to API constraints
    # COMMODITIES
    'commodities': ['gold', 'silver', 'oil', 'natural gas', 'copper', 'wheat', 'corn'],
    # FOREX - Major pairs
    'forex': ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'USDCAD', 'USDCNY'],
    # TREASURY YIELDS
    'treasury': ['^TNX', '^TYX', '^FVX', '^IRX'],
    # GLOBAL INDICES
    'indices': [
        # US
        '^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX',
        # Europe
        '^GDAXI', '^FTSE', '^FCHI', '^STOXX50E',
        # Asia
        '^N225', '^HSI', '000001.SS',
        # Other
        '^BVSP', '^GSPTSE',
    ],
    # MACRO INDICATORS - COMPREHENSIVE
    'macro': [
        # Money & Credit
        'M2', 'M1', 'FEDFUNDS', 'DFF',
        # Inflation
        'CPIAUCSL', 'PCEPI', 'CPILFESL',
        # Employment
        'UNRATE', 'PAYEMS', 'ICSA', 'CIVPART',
        # GDP & Output
        'GDP', 'GDPC1', 'INDPRO',
        # Consumer
        'UMCSENT', 'RSAFS', 'PCE',
        # Housing
        'HOUST', 'PERMIT', 'CSUSHPISA',
        # Debt & Credit
        'GFDEBTN', 'TCMDO', 'BUSLOANS',
        # Manufacturing
        'DGORDER', 'NEWORDER',
        # Trade
        'BOPGSTB', 'NETEXP',
        # Volatility & Risk
        'VIXCLS', 'TEDRATE', 'T10Y2Y', 'T10Y3M',
        # Interest Rates
        'GS10', 'GS2', 'GS5', 'GS30',
        # International
        'DEXUSEU', 'DEXJPUS', 'DEXCHUS',
    ]
}


def get_period_days(period: str) -> int:
    """Convert period string to number of days"""
    periods = {
        '1y': 365,
        '2y': 730,
        '5y': 1825,
        '10y': 3650,
        '20y': 7300,
        'max': 36500  # ~100 years
    }
    return periods.get(period, 3650)


def calculate_cagr(start_price: float, end_price: float, years: float) -> float:
    """Calculate Compound Annual Growth Rate"""
    if start_price <= 0 or end_price <= 0 or years <= 0:
        return 0.0
    return ((end_price / start_price) ** (1 / years) - 1) * 100


def calculate_volatility(returns: List[float]) -> float:
    """Calculate annualized volatility"""
    if len(returns) < 2:
        return 0.0
    return np.std(returns) * np.sqrt(252) * 100


def calculate_sharpe(returns: List[float], risk_free_rate: float = 0.02) -> float:
    """Calculate Sharpe ratio"""
    if len(returns) < 2:
        return 0.0
    mean_return = np.mean(returns) * 252  # Annualize
    volatility = np.std(returns) * np.sqrt(252)
    if volatility == 0:
        return 0.0
    return (mean_return - risk_free_rate) / volatility


def calculate_max_drawdown(prices: List[float]) -> float:
    """Calculate maximum drawdown"""
    if len(prices) < 2:
        return 0.0
    
    peak = prices[0]
    max_dd = 0.0
    
    for price in prices:
        if price > peak:
            peak = price
        dd = (peak - price) / peak * 100
        if dd > max_dd:
            max_dd = dd
    
    return max_dd


def determine_trend(prices: List[float]) -> str:
    """Determine price trend using linear regression"""
    if len(prices) < 20:
        return "NEUTRAL"
    
    # Use last 60 data points for trend
    recent = prices[-min(60, len(prices)):]
    x = np.arange(len(recent))
    
    try:
        slope = np.polyfit(x, recent, 1)[0]
        pct_change = slope * len(recent) / recent[0] * 100 if recent[0] != 0 else 0
        
        if pct_change > 15:
            return "STRONG_UP"
        elif pct_change > 5:
            return "UP"
        elif pct_change < -15:
            return "STRONG_DOWN"
        elif pct_change < -5:
            return "DOWN"
        else:
            return "NEUTRAL"
    except:
        return "NEUTRAL"


def get_period_days_for_crypto(period: str) -> int:
    """Convert period string to days for crypto API - limited to 365 for free API"""
    # CoinGecko free API only allows up to 365 days without API key
    MAX_CRYPTO_DAYS = 365
    period_map = {
        '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365,
        '2y': MAX_CRYPTO_DAYS, '5y': MAX_CRYPTO_DAYS, 
        '10y': MAX_CRYPTO_DAYS, '20y': MAX_CRYPTO_DAYS, 'max': MAX_CRYPTO_DAYS
    }
    return min(period_map.get(period, 365), MAX_CRYPTO_DAYS)


def fetch_asset_data(asset_type: str, ticker: str, period: str) -> Optional[Dict[str, Any]]:
    """Fetch data for a single asset with rate limiting protection"""
    time.sleep(REQUEST_DELAY)  # Rate limiting
    
    retries = 0
    while retries < MAX_RETRIES:
        try:
            data = None
            
            if asset_type == 'stocks':
                data = StockFetcher.fetch_history(ticker, period)
            elif asset_type == 'crypto':
                # CoinGecko free API limited to 365 days
                days = get_period_days_for_crypto(period)
                data = CryptoFetcher.fetch_history(ticker, days)
            elif asset_type == 'commodities':
                data = CommodityFetcher.fetch_history(ticker, period)
            elif asset_type == 'forex':
                data = ForexFetcher.fetch_history(ticker, period)
            elif asset_type == 'indices':
                data = IndexFetcher.fetch_history(ticker, period)
            elif asset_type == 'treasury':
                data = TreasuryFetcher.fetch_history(ticker, period)
            elif asset_type == 'macro':
                data = MacroFetcher.fetch_data(ticker)
            else:
                return None
            
            # Check if we got valid data - handle different key names
            if data:
                # Try 'data' key first, then 'history' for macro data
                records = data.get('data') or data.get('history')
                
                if records and len(records) > 0:
                    return {
                        'ticker': ticker,
                        'asset_type': asset_type,
                        'name': data.get('name', ticker),
                        'data': records,
                        'current_price': data.get('current_price') or data.get('price') or data.get('current_value'),
                    }
                elif data.get('error'):
                    print(f"[MACRO] {asset_type}:{ticker} returned error: {data.get('error')}")
                    return None
                else:
                    # Data structure might be different
                    print(f"[MACRO] {asset_type}:{ticker} no records found. Keys: {list(data.keys())}")
                    return None
            return None
                
        except Exception as e:
            retries += 1
            if "429" in str(e) or "rate" in str(e).lower():
                # Rate limited - wait longer
                print(f"[MACRO] Rate limited on {ticker}, waiting 5s...")
                time.sleep(5)
            else:
                print(f"[MACRO] Error fetching {asset_type}:{ticker}: {e}")
                if retries < MAX_RETRIES:
                    time.sleep(1)
    
    return None


def extract_price(record: Dict) -> Optional[float]:
    """Extract price from a data record, handling various field names"""
    # Try different field names
    for field in ['close', 'price', 'value', 'Close', 'Price', 'Value', 'adj_close', 'adjClose']:
        val = record.get(field)
        if val is not None:
            try:
                return float(val)
            except (ValueError, TypeError):
                continue
    return None


def analyze_asset(asset_data: Dict[str, Any]) -> Dict[str, Any]:
    """Perform comprehensive analysis on a single asset"""
    data = asset_data.get('data', [])
    
    if not data:
        print(f"[MACRO ANALYZE] {asset_data['ticker']}: No data")
        return None
    
    # Extract prices
    prices = []
    for record in data:
        price = extract_price(record)
        if price is not None and price > 0:
            prices.append(price)
    
    if len(prices) < 10:
        print(f"[MACRO ANALYZE] {asset_data['ticker']}: Only {len(prices)} valid prices (need 10+)")
        return None
    
    # Calculate returns
    returns = []
    for i in range(1, len(prices)):
        if prices[i-1] > 0:
            returns.append((prices[i] - prices[i-1]) / prices[i-1])
    
    # Get dates
    dates = [d.get('date') or d.get('Date') for d in data]
    dates = [d for d in dates if d]  # Filter None
    start_date = dates[0] if dates else None
    end_date = dates[-1] if dates else None
    
    # Calculate years
    years = max(len(prices) / 252, 0.1)  # At least 0.1 year to avoid division issues
    
    print(f"[MACRO ANALYZE] {asset_data['ticker']}: {len(prices)} prices, {len(returns)} returns")
    
    return {
        'ticker': asset_data['ticker'],
        'name': asset_data.get('name', asset_data['ticker']),
        'asset_class': asset_data['asset_type'],
        'data_points': len(prices),
        'start_date': start_date,
        'end_date': end_date,
        'start_price': prices[0] if prices else 0,
        'end_price': prices[-1] if prices else 0,
        'current_price': asset_data.get('current_price'),
        'total_return': ((prices[-1] / prices[0]) - 1) * 100 if prices[0] > 0 else 0,
        'cagr': calculate_cagr(prices[0], prices[-1], years),
        'volatility': calculate_volatility(returns),
        'sharpe_ratio': calculate_sharpe(returns),
        'max_drawdown': calculate_max_drawdown(prices),
        'trend': determine_trend(prices),
        'prices': prices,  # Keep for correlation calculation
        'returns': returns,
    }


def calculate_spearman_correlation(x: List[float], y: List[float]) -> float:
    """Calculate Spearman rank correlation"""
    from scipy import stats
    if len(x) < 10 or len(y) < 10:
        return 0.0
    try:
        corr, _ = stats.spearmanr(x, y)
        return float(corr) if not np.isnan(corr) else 0.0
    except:
        return 0.0


def calculate_kendall_correlation(x: List[float], y: List[float]) -> float:
    """Calculate Kendall tau correlation"""
    from scipy import stats
    if len(x) < 10 or len(y) < 10:
        return 0.0
    try:
        corr, _ = stats.kendalltau(x, y)
        return float(corr) if not np.isnan(corr) else 0.0
    except:
        return 0.0


def calculate_mutual_information(x: List[float], y: List[float], bins: int = 20) -> float:
    """Calculate normalized mutual information (non-linear dependence)"""
    if len(x) < 20 or len(y) < 20:
        return 0.0
    try:
        # Discretize continuous data
        x_binned = np.digitize(x, np.linspace(min(x), max(x), bins))
        y_binned = np.digitize(y, np.linspace(min(y), max(y), bins))
        
        # Calculate joint and marginal histograms
        joint_hist = np.histogram2d(x_binned, y_binned, bins=bins)[0]
        joint_hist = joint_hist / joint_hist.sum()
        
        # Marginals
        px = joint_hist.sum(axis=1)
        py = joint_hist.sum(axis=0)
        
        # Remove zeros
        px = px[px > 0]
        py = py[py > 0]
        joint_hist = joint_hist[joint_hist > 0]
        
        # Entropies
        hx = -np.sum(px * np.log2(px))
        hy = -np.sum(py * np.log2(py))
        hxy = -np.sum(joint_hist * np.log2(joint_hist))
        
        # Mutual information
        mi = hx + hy - hxy
        
        # Normalize by min entropy
        nmi = mi / min(hx, hy) if min(hx, hy) > 0 else 0
        return float(nmi)
    except:
        return 0.0


def align_returns_by_date(analyzed_assets: List[Dict]) -> Dict[str, List[float]]:
    """
    Align all asset returns to the same date range using forward fill.
    Returns a dictionary of ticker -> aligned returns.
    """
    # Filter assets with valid data
    valid_assets = [a for a in analyzed_assets if a.get('returns') and len(a['returns']) >= 20]
    
    if len(valid_assets) < 2:
        return {}
    
    # Find the common date range (use the shortest overlapping period)
    # Take the last N returns where N is the minimum length
    min_len = min(len(a['returns']) for a in valid_assets)
    
    # Align by taking the last min_len returns from each asset
    aligned = {}
    for asset in valid_assets:
        returns = asset['returns'][-min_len:]
        # Clean up any None or NaN values
        clean_returns = []
        for r in returns:
            if r is None or (isinstance(r, float) and np.isnan(r)):
                clean_returns.append(0.0)
            else:
                clean_returns.append(float(r))
        aligned[asset['ticker']] = clean_returns
    
    print(f"[MACRO ALIGN] Aligned {len(aligned)} assets to {min_len} data points")
    return aligned


def calculate_correlations(analyzed_assets: List[Dict], top_n: int = 20) -> Dict[str, Any]:
    """Calculate multiple correlation types and find interesting relationships"""
    if len(analyzed_assets) < 2:
        return {'pearson_matrix': None, 'spearman_matrix': None, 'tickers': [], 
                'asset_classes': {}, 'top_positive': [], 'top_negative': [], 
                'surprising': [], 'all_pairs': []}
    
    # Filter assets with valid returns
    valid_assets = [a for a in analyzed_assets if a.get('returns') and len(a['returns']) >= 20]
    
    if len(valid_assets) < 2:
        return {'pearson_matrix': None, 'spearman_matrix': None, 'tickers': [], 
                'asset_classes': {}, 'top_positive': [], 'top_negative': [], 
                'surprising': [], 'all_pairs': []}
    
    # Align returns using date-based alignment
    returns_data = align_returns_by_date(valid_assets)
    
    if len(returns_data) < 2:
        return {'pearson_matrix': None, 'spearman_matrix': None, 'tickers': [], 
                'asset_classes': {}, 'top_positive': [], 'top_negative': [], 
                'surprising': [], 'all_pairs': []}
    
    # Build ticker list and asset class map
    tickers = list(returns_data.keys())
    asset_classes = {a['ticker']: a['asset_class'] for a in valid_assets if a['ticker'] in tickers}
    
    n = len(tickers)
    
    # Calculate correlation matrices
    pearson_matrix = np.zeros((n, n))
    spearman_matrix = np.zeros((n, n))
    
    print(f"[MACRO CORR] Calculating correlations for {n} assets...")
    
    correlations = []
    
    for i in range(n):
        pearson_matrix[i, i] = 1.0
        spearman_matrix[i, i] = 1.0
        
        for j in range(i + 1, n):
            r1 = returns_data[tickers[i]]
            r2 = returns_data[tickers[j]]
            
            # Pearson (linear)
            pearson = np.corrcoef(r1, r2)[0, 1]
            pearson = float(pearson) if not np.isnan(pearson) else 0.0
            pearson_matrix[i, j] = pearson
            pearson_matrix[j, i] = pearson
            
            # Spearman (rank)
            spearman = calculate_spearman_correlation(r1, r2)
            spearman_matrix[i, j] = spearman
            spearman_matrix[j, i] = spearman
            
            # Check if correlation is "surprising" (different asset classes with high correlation)
            same_class = asset_classes[tickers[i]] == asset_classes[tickers[j]]
            
            correlations.append({
                'asset1': tickers[i],
                'asset2': tickers[j],
                'class1': asset_classes[tickers[i]],
                'class2': asset_classes[tickers[j]],
                'pearson': pearson,
                'spearman': spearman,
                'same_class': same_class,
                # Surprising = high correlation between different asset classes
                'surprising_score': abs(pearson) * (0 if same_class else 1.5)
            })
    
    # Sort by different criteria
    by_pearson = sorted(correlations, key=lambda x: x['pearson'], reverse=True)
    by_pearson_neg = sorted(correlations, key=lambda x: x['pearson'])
    by_surprising = sorted(correlations, key=lambda x: x['surprising_score'], reverse=True)
    
    # Find surprising correlations (cross-asset class with high correlation)
    surprising = [c for c in by_surprising if c['surprising_score'] > 0.4][:top_n]
    
    print(f"[MACRO CORR] Found {len(surprising)} surprising cross-class correlations")
    
    return {
        'pearson_matrix': pearson_matrix.tolist(),
        'spearman_matrix': spearman_matrix.tolist(),
        'tickers': tickers,
        'asset_classes': asset_classes,
        'top_positive': by_pearson[:top_n],
        'top_negative': by_pearson_neg[:top_n],
        'surprising': surprising,
        'all_pairs': correlations  # For heatmap
    }


def detect_market_regimes(analyzed_assets: List[Dict]) -> Dict[str, Any]:
    """Detect market regimes based on broad market performance"""
    # Use S&P 500 or aggregate if available
    market_asset = None
    for asset in analyzed_assets:
        if asset['ticker'] in ['^GSPC', 'SPY', 'S&P 500']:
            market_asset = asset
            break
    
    if not market_asset or not market_asset.get('prices'):
        return {}
    
    prices = market_asset['prices']
    if len(prices) < 252:
        return {}
    
    regimes = {
        'BULL': {'periods': 0, 'total_duration': 0, 'returns': []},
        'BEAR': {'periods': 0, 'total_duration': 0, 'returns': []},
        'SIDEWAYS': {'periods': 0, 'total_duration': 0, 'returns': []},
        'VOLATILE': {'periods': 0, 'total_duration': 0, 'returns': []}
    }
    
    # Analyze in 6-month windows
    window = 126
    for i in range(0, len(prices) - window, window // 2):
        window_prices = prices[i:i + window]
        ret = (window_prices[-1] / window_prices[0] - 1) * 100
        vol = np.std(np.diff(window_prices) / window_prices[:-1]) * np.sqrt(252) * 100
        
        if vol > 30:
            regime = 'VOLATILE'
        elif ret > 10:
            regime = 'BULL'
        elif ret < -10:
            regime = 'BEAR'
        else:
            regime = 'SIDEWAYS'
        
        regimes[regime]['periods'] += 1
        regimes[regime]['total_duration'] += window // 21  # Approx months
        regimes[regime]['returns'].append(ret)
    
    # Calculate averages
    for regime in regimes:
        returns = regimes[regime]['returns']
        regimes[regime]['avg_return'] = np.mean(returns) if returns else 0
        regimes[regime]['avg_duration'] = (
            regimes[regime]['total_duration'] / regimes[regime]['periods']
            if regimes[regime]['periods'] > 0 else 0
        )
        del regimes[regime]['returns']
        del regimes[regime]['total_duration']
    
    return regimes


def create_chart_data(analyzed_assets: List[Dict], max_points: int = 500) -> List[Dict]:
    """Create normalized chart data for visualization"""
    if not analyzed_assets:
        return []
    
    # Find common date range
    min_len = min(len(a['prices']) for a in analyzed_assets if a.get('prices'))
    
    if min_len < 10:
        return []
    
    # Sample if too many points
    step = max(1, min_len // max_points)
    
    chart_data = []
    for i in range(0, min_len, step):
        point = {'date': analyzed_assets[0].get('start_date', 'Day ' + str(i))}
        for asset in analyzed_assets:
            if asset.get('prices') and i < len(asset['prices']):
                # Normalize to 100
                base = asset['prices'][0]
                if base > 0:
                    point[asset['ticker']] = round((asset['prices'][i] / base) * 100, 2)
        chart_data.append(point)
    
    return chart_data


def create_heatmap_data(correlations: Dict[str, Any]) -> Dict[str, Any]:
    """Create heatmap data structure for frontend visualization"""
    if not correlations.get('tickers'):
        return {}
    
    tickers = correlations['tickers']
    asset_classes = correlations.get('asset_classes', {})
    pearson_matrix = correlations.get('pearson_matrix', [])
    
    # Group tickers by asset class for organized heatmap
    class_groups = {}
    for ticker in tickers:
        cls = asset_classes.get(ticker, 'unknown')
        if cls not in class_groups:
            class_groups[cls] = []
        class_groups[cls].append(ticker)
    
    # Create ordered ticker list (grouped by class)
    ordered_tickers = []
    class_order = ['indices', 'stocks', 'macro', 'commodities', 'forex', 'treasury', 'crypto']
    for cls in class_order:
        if cls in class_groups:
            ordered_tickers.extend(sorted(class_groups[cls]))
    # Add any remaining classes
    for cls in class_groups:
        if cls not in class_order:
            ordered_tickers.extend(sorted(class_groups[cls]))
    
    # Create cells for heatmap
    cells = []
    ticker_to_idx = {t: i for i, t in enumerate(tickers)}
    
    for i, t1 in enumerate(ordered_tickers):
        for j, t2 in enumerate(ordered_tickers):
            if t1 in ticker_to_idx and t2 in ticker_to_idx:
                idx1, idx2 = ticker_to_idx[t1], ticker_to_idx[t2]
                if pearson_matrix and idx1 < len(pearson_matrix) and idx2 < len(pearson_matrix[idx1]):
                    val = pearson_matrix[idx1][idx2]
                    cells.append({
                        'x': j,
                        'y': i,
                        'ticker1': t1,
                        'ticker2': t2,
                        'class1': asset_classes.get(t1, ''),
                        'class2': asset_classes.get(t2, ''),
                        'value': round(val, 3) if val else 0
                    })
    
    return {
        'tickers': ordered_tickers,
        'class_boundaries': {cls: (ordered_tickers.index(class_groups[cls][0]) if cls in class_groups and class_groups[cls] else -1) for cls in class_order},
        'cells': cells,
        'size': len(ordered_tickers)
    }


def save_to_parquet(analyzed_assets: List[Dict], correlations: Dict[str, Any], output_dir: str = './data') -> str:
    """Save all data to a Parquet file"""
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Save asset summaries
    asset_filename = f'macro_assets_{timestamp}.parquet'
    asset_filepath = os.path.join(output_dir, asset_filename)
    
    df_assets = pd.DataFrame([{
        'ticker': a['ticker'],
        'name': a['name'],
        'asset_class': a['asset_class'],
        'data_points': a['data_points'],
        'start_date': a.get('start_date'),
        'end_date': a.get('end_date'),
        'total_return': a['total_return'],
        'cagr': a['cagr'],
        'volatility': a['volatility'],
        'sharpe_ratio': a['sharpe_ratio'],
        'max_drawdown': a['max_drawdown'],
        'trend': a['trend']
    } for a in analyzed_assets])
    
    df_assets.to_parquet(asset_filepath)
    
    # Save correlation pairs
    if correlations.get('all_pairs'):
        corr_filename = f'macro_correlations_{timestamp}.parquet'
        corr_filepath = os.path.join(output_dir, corr_filename)
        df_corr = pd.DataFrame(correlations['all_pairs'])
        df_corr.to_parquet(corr_filepath)
    
    return asset_filename


def run_macro_analysis(
    lookback_period: str = '10y',
    asset_class_filter: Optional[str] = None,
    include_user_assets: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    Run comprehensive macro analysis across all asset classes.
    
    Args:
        lookback_period: How far back to fetch data ('5y', '10y', '20y', 'max')
        asset_class_filter: Optional filter for specific asset class
        include_user_assets: Optional list of user-selected assets to include
    
    Returns:
        Comprehensive analysis results
    """
    start_time = time.time()
    
    # Determine which assets to analyze
    assets_to_fetch = []
    
    if asset_class_filter:
        # Only fetch specified class
        if asset_class_filter in DEFAULT_ASSETS:
            for ticker in DEFAULT_ASSETS[asset_class_filter]:
                assets_to_fetch.append({'type': asset_class_filter, 'ticker': ticker})
    else:
        # Fetch all default assets
        for asset_class, tickers in DEFAULT_ASSETS.items():
            for ticker in tickers:
                assets_to_fetch.append({'type': asset_class, 'ticker': ticker})
    
    # Add user-selected assets
    if include_user_assets:
        for asset in include_user_assets:
            if asset not in assets_to_fetch:
                assets_to_fetch.append(asset)
    
    print(f"[MACRO] Starting analysis of {len(assets_to_fetch)} assets for {lookback_period}")
    
    # Fetch all asset data with rate limiting
    fetched_data = []
    for i, asset in enumerate(assets_to_fetch):
        print(f"[MACRO] Fetching {asset['ticker']} ({i+1}/{len(assets_to_fetch)})")
        data = fetch_asset_data(asset['type'], asset['ticker'], lookback_period)
        if data:
            fetched_data.append(data)
            print(f"[MACRO] Got {len(data.get('data', []))} records for {asset['ticker']}")
        
        # Extra delay every batch to avoid rate limits
        if (i + 1) % BATCH_SIZE == 0:
            print(f"[MACRO] Batch pause ({i+1}/{len(assets_to_fetch)})...")
            time.sleep(BATCH_DELAY)
    
    print(f"[MACRO] Successfully fetched {len(fetched_data)} assets")
    
    # Analyze each asset
    analyzed_assets = []
    for data in fetched_data:
        analysis = analyze_asset(data)
        if analysis:
            analyzed_assets.append(analysis)
    
    print(f"[MACRO] Analyzed {len(analyzed_assets)} assets")
    
    if not analyzed_assets:
        return {'error': 'No assets could be analyzed'}
    
    # Group by asset class
    class_summary = {}
    for asset in analyzed_assets:
        cls = asset['asset_class']
        if cls not in class_summary:
            class_summary[cls] = {
                'count': 0,
                'returns': [],
                'volatilities': [],
                'assets': []
            }
        class_summary[cls]['count'] += 1
        class_summary[cls]['returns'].append(asset['total_return'])
        class_summary[cls]['volatilities'].append(asset['volatility'])
        class_summary[cls]['assets'].append(asset)
    
    # Calculate class-level statistics
    for cls in class_summary:
        returns = class_summary[cls]['returns']
        vols = class_summary[cls]['volatilities']
        assets = class_summary[cls]['assets']
        
        class_summary[cls]['avg_return'] = np.mean(returns) if returns else 0
        class_summary[cls]['avg_volatility'] = np.mean(vols) if vols else 0
        
        # Best and worst performers
        sorted_assets = sorted(assets, key=lambda x: x['total_return'], reverse=True)
        class_summary[cls]['best'] = {
            'ticker': sorted_assets[0]['ticker'],
            'return': sorted_assets[0]['total_return']
        } if sorted_assets else None
        class_summary[cls]['worst'] = {
            'ticker': sorted_assets[-1]['ticker'],
            'return': sorted_assets[-1]['total_return']
        } if sorted_assets else None
        
        # Determine class trend
        trends = [a['trend'] for a in assets]
        up_count = sum(1 for t in trends if t in ['STRONG_UP', 'UP'])
        down_count = sum(1 for t in trends if t in ['STRONG_DOWN', 'DOWN'])
        if up_count > down_count * 1.5:
            class_summary[cls]['trend'] = 'UP' if up_count > len(trends) * 0.7 else 'NEUTRAL'
        elif down_count > up_count * 1.5:
            class_summary[cls]['trend'] = 'DOWN' if down_count > len(trends) * 0.7 else 'NEUTRAL'
        else:
            class_summary[cls]['trend'] = 'NEUTRAL'
        
        # Clean up temporary data
        del class_summary[cls]['returns']
        del class_summary[cls]['volatilities']
        del class_summary[cls]['assets']
    
    # Calculate correlations (multiple types)
    print(f"[MACRO] Computing correlations...")
    correlations = calculate_correlations(analyzed_assets)
    
    # Create heatmap data
    heatmap_data = create_heatmap_data(correlations)
    
    # Detect market regimes
    regimes = detect_market_regimes(analyzed_assets)
    
    # Create chart data
    chart_data = create_chart_data(analyzed_assets)
    
    # Save to parquet
    parquet_file = save_to_parquet(analyzed_assets, correlations)
    
    # Clean up prices/returns from result (too large for JSON)
    clean_assets = []
    for asset in analyzed_assets:
        clean = {k: v for k, v in asset.items() if k not in ['prices', 'returns']}
        clean_assets.append(clean)
    
    # Calculate total data points
    total_points = sum(a['data_points'] for a in analyzed_assets)
    
    # Get date range
    start_dates = [a.get('start_date') for a in analyzed_assets if a.get('start_date')]
    end_dates = [a.get('end_date') for a in analyzed_assets if a.get('end_date')]
    
    elapsed = time.time() - start_time
    print(f"[MACRO] Analysis complete in {elapsed:.1f}s")
    
    return {
        'assets_analyzed': len(analyzed_assets),
        'total_data_points': total_points,
        'analysis_duration_seconds': round(elapsed, 1),
        'date_range': {
            'start': min(start_dates) if start_dates else None,
            'end': max(end_dates) if end_dates else None
        },
        'class_summary': class_summary,
        'assets': clean_assets,
        # Correlation data
        'correlation_matrix': correlations.get('pearson_matrix'),
        'spearman_matrix': correlations.get('spearman_matrix'),
        'tickers': correlations.get('tickers', []),
        'asset_class_map': correlations.get('asset_classes', {}),
        'top_correlations': correlations.get('top_positive', []),
        'bottom_correlations': correlations.get('top_negative', []),
        'surprising_correlations': correlations.get('surprising', []),
        # Heatmap for visualization
        'heatmap': heatmap_data,
        # Regimes and chart
        'regime_analysis': regimes,
        'chart_data': chart_data,
        'parquet_file': parquet_file
    }

