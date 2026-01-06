"""
Analysis Module - Multi-asset comparison and advanced statistical analysis
Supports stocks, crypto, commodities, forex, indices, treasury, and macro data
Includes: Correlation, Volatility, Sharpe, Beta, Alpha, VaR, Rolling Stats
"""
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
from .base import get_cache, set_cache

# Import fetchers
from .crypto import CryptoFetcher
from .stocks import StockFetcher
from .commodities import CommodityFetcher
from .forex import ForexFetcher
from .indices import IndexFetcher
from .treasury import TreasuryFetcher
from .macro import MacroFetcher


def get_fetcher(asset_type: str):
    """Get the appropriate fetcher for asset type"""
    fetchers = {
        'crypto': CryptoFetcher,
        'stock': StockFetcher,
        'commodity': CommodityFetcher,
        'forex': ForexFetcher,
        'index': IndexFetcher,
        'treasury': TreasuryFetcher,
        'macro': MacroFetcher,
    }
    return fetchers.get(asset_type)


def fetch_asset_history(asset_type: str, ticker: str, period: str = "1y") -> Dict[str, Any]:
    """Fetch history for any asset type including macro indicators"""
    fetcher = get_fetcher(asset_type)
    if not fetcher:
        return {"error": f"Unknown asset type: {asset_type}"}
    
    if asset_type == 'crypto':
        period_map = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "5y": 1825}
        days = period_map.get(period, 365)
        return fetcher.fetch_history(ticker, days)
    elif asset_type == 'stock':
        return fetcher.fetch_history(ticker, period, "1d")
    elif asset_type == 'macro':
        # Macro data - fetch full data and extract history
        data = fetcher.fetch_data(ticker)
        if data.get('error'):
            return data
        
        # Convert history format for analysis
        history = data.get('history', [])
        if history:
            return {
                'ticker': data.get('symbol', ticker),
                'data': [
                    {'Date': h['date'], 'Close': h['value'], 'price': h['value']}
                    for h in history
                ],
                'source': 'FRED',
            }
        return {"error": "No macro history data"}
    else:
        return fetcher.fetch_history(ticker, period)


def align_timeseries(datasets: List[Dict]) -> Tuple[List[str], Dict[str, List[float]]]:
    """
    Align multiple time series by date, forward-filling missing values.
    Returns (dates, {ticker: prices})
    """
    # Collect all dates and prices per ticker
    all_dates = set()
    ticker_data = {}
    
    for ds in datasets:
        ticker = ds.get('ticker', 'unknown')
        data = ds.get('data', [])
        
        prices_by_date = {}
        for point in data:
            date = point.get('Date') or point.get('date') or ''
            price = point.get('Close') or point.get('close') or point.get('price')
            if date and price is not None:
                prices_by_date[date] = float(price)
                all_dates.add(date)
        
        ticker_data[ticker] = prices_by_date
    
    # Sort dates
    sorted_dates = sorted(all_dates)
    
    # Forward fill each ticker
    aligned = {}
    for ticker, prices_by_date in ticker_data.items():
        aligned_prices = []
        last_price = None
        
        for date in sorted_dates:
            if date in prices_by_date:
                last_price = prices_by_date[date]
            aligned_prices.append(last_price)
        
        aligned[ticker] = aligned_prices
    
    return sorted_dates, aligned


def calculate_returns(prices: List[float]) -> List[float]:
    """Calculate daily log returns"""
    returns = []
    for i in range(1, len(prices)):
        if prices[i] and prices[i-1] and prices[i-1] > 0 and prices[i] > 0:
            returns.append(np.log(prices[i] / prices[i-1]))
        else:
            returns.append(0.0)
    return returns


def calculate_simple_returns(prices: List[float]) -> List[float]:
    """Calculate simple (non-log) returns"""
    returns = []
    for i in range(1, len(prices)):
        if prices[i] and prices[i-1] and prices[i-1] > 0:
            returns.append((prices[i] - prices[i-1]) / prices[i-1])
        else:
            returns.append(0.0)
    return returns


def calculate_volatility(returns: List[float], annualize: bool = True) -> float:
    """Calculate volatility (standard deviation of returns)"""
    if not returns or len(returns) < 2:
        return 0.0
    vol = float(np.std(returns))
    if annualize:
        vol *= np.sqrt(252)  # Annualize
    return vol


def calculate_correlation(returns1: List[float], returns2: List[float]) -> float:
    """Calculate correlation between two return series"""
    if len(returns1) != len(returns2) or len(returns1) < 2:
        return 0.0
    
    # Remove pairs where either is None/0
    valid_pairs = [(r1, r2) for r1, r2 in zip(returns1, returns2) if r1 != 0 or r2 != 0]
    if len(valid_pairs) < 2:
        return 0.0
    
    r1, r2 = zip(*valid_pairs)
    corr = np.corrcoef(r1, r2)[0, 1]
    return float(corr) if not np.isnan(corr) else 0.0


def calculate_beta(asset_returns: List[float], market_returns: List[float]) -> float:
    """Calculate beta relative to market (covariance / market variance)"""
    if len(asset_returns) != len(market_returns) or len(asset_returns) < 2:
        return 1.0
    
    valid_pairs = [(a, m) for a, m in zip(asset_returns, market_returns) if a != 0 or m != 0]
    if len(valid_pairs) < 2:
        return 1.0
    
    a_returns, m_returns = zip(*valid_pairs)
    cov = np.cov(a_returns, m_returns)[0, 1]
    var = np.var(m_returns)
    
    if var == 0:
        return 1.0
    
    beta = cov / var
    return float(beta) if not np.isnan(beta) else 1.0


def calculate_alpha(asset_returns: List[float], market_returns: List[float], risk_free_rate: float = 0.0) -> float:
    """Calculate Jensen's Alpha (annualized)"""
    if len(asset_returns) < 2:
        return 0.0
    
    beta = calculate_beta(asset_returns, market_returns)
    
    avg_asset = np.mean(asset_returns) * 252  # Annualized
    avg_market = np.mean(market_returns) * 252  # Annualized
    
    alpha = avg_asset - (risk_free_rate + beta * (avg_market - risk_free_rate))
    return float(alpha) if not np.isnan(alpha) else 0.0


def calculate_var(returns: List[float], confidence_level: float = 0.95) -> float:
    """Calculate Value at Risk (VaR) at given confidence level"""
    if not returns or len(returns) < 10:
        return 0.0
    
    percentile = (1 - confidence_level) * 100
    var = np.percentile(returns, percentile)
    return float(var) * 100  # As percentage


def calculate_cvar(returns: List[float], confidence_level: float = 0.95) -> float:
    """Calculate Conditional VaR (Expected Shortfall)"""
    if not returns or len(returns) < 10:
        return 0.0
    
    percentile = (1 - confidence_level) * 100
    var_threshold = np.percentile(returns, percentile)
    
    # Average of returns below VaR
    tail_returns = [r for r in returns if r <= var_threshold]
    if not tail_returns:
        return float(var_threshold) * 100
    
    cvar = np.mean(tail_returns)
    return float(cvar) * 100  # As percentage


def calculate_sortino_ratio(returns: List[float], risk_free_rate: float = 0.0) -> float:
    """Calculate Sortino ratio (uses downside deviation instead of std dev)"""
    if not returns or len(returns) < 2:
        return 0.0
    
    avg_return = np.mean(returns) * 252  # Annualized
    
    # Downside deviation (only negative returns)
    negative_returns = [r for r in returns if r < 0]
    if not negative_returns:
        return 0.0
    
    downside_dev = np.std(negative_returns) * np.sqrt(252)
    
    if downside_dev == 0:
        return 0.0
    
    sortino = (avg_return - risk_free_rate) / downside_dev
    return float(sortino) if not np.isnan(sortino) else 0.0


def calculate_rolling_stats(prices: List[float], window: int = 20) -> Dict[str, List[float]]:
    """Calculate rolling statistics"""
    if len(prices) < window:
        return {"rolling_volatility": [], "rolling_mean": []}
    
    returns = calculate_returns(prices)
    
    rolling_vol = []
    rolling_mean = []
    
    for i in range(len(returns)):
        if i < window - 1:
            rolling_vol.append(None)
            rolling_mean.append(None)
        else:
            window_returns = returns[i - window + 1:i + 1]
            vol = np.std(window_returns) * np.sqrt(252) * 100
            mean = np.mean(window_returns) * 252 * 100
            rolling_vol.append(float(vol))
            rolling_mean.append(float(mean))
    
    return {
        "rolling_volatility": rolling_vol,
        "rolling_mean": rolling_mean,
    }


def calculate_drawdown_series(prices: List[float]) -> List[float]:
    """Calculate drawdown at each point"""
    if not prices:
        return []
    
    # Find first valid price for peak initialization
    peak = None
    for p in prices:
        if p is not None and p > 0:
            peak = p
            break
    
    if peak is None:
        return [0] * len(prices)
    
    drawdowns = []
    
    for price in prices:
        if price is not None and price > 0:
            if price > peak:
                peak = price
            dd = (peak - price) / peak if peak > 0 else 0
            drawdowns.append(dd * 100)  # As percentage
        else:
            # For None/invalid prices, use 0 drawdown
            drawdowns.append(0)
    
    return drawdowns


def calculate_statistics(prices: List[float], returns: List[float], 
                         benchmark_returns: List[float] = None) -> Dict[str, float]:
    """Calculate comprehensive statistics for a price series"""
    valid_prices = [p for p in prices if p is not None and p > 0]
    
    if not valid_prices:
        return {}
    
    stats = {
        "current_price": valid_prices[-1],
        "start_price": valid_prices[0],
        "min_price": min(valid_prices),
        "max_price": max(valid_prices),
        "mean_price": float(np.mean(valid_prices)),
        "total_return": (valid_prices[-1] / valid_prices[0] - 1) * 100 if valid_prices[0] > 0 else 0,
        "volatility": calculate_volatility(returns) * 100,  # As percentage
        "sharpe_ratio": 0.0,
        "sortino_ratio": 0.0,
        "var_95": 0.0,
        "cvar_95": 0.0,
        "beta": 1.0,
        "alpha": 0.0,
    }
    
    # Calculate Sharpe ratio (assuming risk-free rate = 0 for simplicity)
    if returns and len(returns) > 1:
        mean_return = float(np.mean(returns)) * 252  # Annualized
        vol = calculate_volatility(returns)
        if vol > 0:
            stats["sharpe_ratio"] = mean_return / vol
        
        # Sortino ratio
        stats["sortino_ratio"] = calculate_sortino_ratio(returns)
        
        # VaR and CVaR
        stats["var_95"] = calculate_var(returns, 0.95)
        stats["cvar_95"] = calculate_cvar(returns, 0.95)
        
        # Beta and Alpha (if benchmark provided)
        if benchmark_returns and len(benchmark_returns) == len(returns):
            stats["beta"] = calculate_beta(returns, benchmark_returns)
            stats["alpha"] = calculate_alpha(returns, benchmark_returns) * 100  # As percentage
    
    # Drawdown
    peak = valid_prices[0]
    max_dd = 0
    for p in valid_prices:
        if p > peak:
            peak = p
        dd = (peak - p) / peak
        if dd > max_dd:
            max_dd = dd
    stats["max_drawdown"] = max_dd * 100
    
    return stats


def find_trend_lines(dates: List[str], prices: List[float], min_interval_days: int = 15) -> Dict[str, Any]:
    """
    Find support and resistance trend lines.
    - Support: Line through first two consecutive local minima (at least min_interval_days apart)
    - Resistance: Line through first two consecutive local maxima (at least min_interval_days apart)
    """
    if len(prices) < 20:
        return {"support": None, "resistance": None}
    
    # Convert dates to indices for calculations
    valid_data = [(i, dates[i], prices[i]) for i in range(len(prices)) if prices[i] is not None]
    if len(valid_data) < 20:
        return {"support": None, "resistance": None}
    
    indices, date_list, price_list = zip(*valid_data)
    prices_arr = np.array(price_list)
    
    # Find local minima and maxima using a window approach
    window = 5  # Look 5 days on each side
    local_minima = []
    local_maxima = []
    
    for i in range(window, len(prices_arr) - window):
        # Check if local minimum
        if all(prices_arr[i] <= prices_arr[i-j] for j in range(1, window+1)) and \
           all(prices_arr[i] <= prices_arr[i+j] for j in range(1, window+1)):
            local_minima.append((indices[i], date_list[i], prices_arr[i]))
        
        # Check if local maximum
        if all(prices_arr[i] >= prices_arr[i-j] for j in range(1, window+1)) and \
           all(prices_arr[i] >= prices_arr[i+j] for j in range(1, window+1)):
            local_maxima.append((indices[i], date_list[i], prices_arr[i]))
    
    def find_valid_pair(extrema: List, min_gap: int) -> Tuple:
        """Find first two extrema with at least min_gap indices between them"""
        for i in range(len(extrema)):
            for j in range(i+1, len(extrema)):
                if extrema[j][0] - extrema[i][0] >= min_gap:
                    return extrema[i], extrema[j]
        return None, None
    
    # Find support line (two lowest points)
    sorted_minima = sorted(local_minima, key=lambda x: x[2])  # Sort by price (lowest first)
    support_p1, support_p2 = find_valid_pair(sorted_minima, min_interval_days)
    
    # Find resistance line (two highest points)
    sorted_maxima = sorted(local_maxima, key=lambda x: x[2], reverse=True)  # Sort by price (highest first)
    resist_p1, resist_p2 = find_valid_pair(sorted_maxima, min_interval_days)
    
    def create_trend_line(p1, p2, all_indices):
        """Create trend line data for plotting"""
        if not p1 or not p2:
            return None
        
        idx1, date1, price1 = p1
        idx2, date2, price2 = p2
        
        # Ensure correct order
        if idx1 > idx2:
            idx1, idx2 = idx2, idx1
            date1, date2 = date2, date1
            price1, price2 = price2, price1
        
        # Calculate slope and extend line
        slope = (price2 - price1) / (idx2 - idx1) if idx2 != idx1 else 0
        
        # Extend to full range
        start_idx = min(all_indices)
        end_idx = max(all_indices)
        
        start_price = price1 + slope * (start_idx - idx1)
        end_price = price1 + slope * (end_idx - idx1)
        
        return {
            "point1": {"date": date1, "price": float(price1), "index": int(idx1)},
            "point2": {"date": date2, "price": float(price2), "index": int(idx2)},
            "slope": float(slope),
            "extended": {
                "start": {"index": int(start_idx), "price": float(start_price)},
                "end": {"index": int(end_idx), "price": float(end_price)},
            }
        }
    
    return {
        "support": create_trend_line(support_p1, support_p2, indices),
        "resistance": create_trend_line(resist_p1, resist_p2, indices),
    }


def calculate_rolling_correlation(returns1: List[float], returns2: List[float], window: int = 20) -> List[float]:
    """Calculate rolling correlation between two return series"""
    if len(returns1) != len(returns2) or len(returns1) < window:
        return []
    
    rolling_corr = []
    for i in range(len(returns1)):
        if i < window - 1:
            rolling_corr.append(None)
        else:
            window_r1 = returns1[i - window + 1:i + 1]
            window_r2 = returns2[i - window + 1:i + 1]
            corr = calculate_correlation(window_r1, window_r2)
            rolling_corr.append(corr)
    
    return rolling_corr


def analyze_assets(assets: List[Dict[str, str]], period: str = "1y") -> Dict[str, Any]:
    """
    Analyze multiple assets together with comprehensive statistics.
    assets: List of {"type": "stock", "ticker": "AAPL"}
    """
    if len(assets) < 2:
        return {"error": "Need at least 2 assets for comparison"}
    
    # Create cache key
    asset_keys = [a['type'] + ':' + a['ticker'] for a in assets]
    cache_key = f"analysis:{'-'.join(asset_keys)}:{period}:v2"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    # Fetch all histories
    histories = []
    for asset in assets:
        hist = fetch_asset_history(asset['type'], asset['ticker'], period)
        if hist.get('data'):
            hist['asset_type'] = asset['type']
            hist['original_ticker'] = asset['ticker']
            histories.append(hist)
        else:
            print(f"[ANALYSIS] No data for {asset['type']}:{asset['ticker']}")
    
    if len(histories) < 2:
        return {"error": "Could not fetch data for enough assets"}
    
    # Align time series
    dates, aligned = align_timeseries(histories)
    
    if not dates:
        return {"error": "No overlapping dates found"}
    
    # Calculate returns for each
    tickers = list(aligned.keys())
    returns_data = {}
    stats_data = {}
    trend_data = {}
    rolling_stats_data = {}
    drawdown_data = {}
    
    # Use first asset as benchmark for beta/alpha if it's an index
    benchmark_returns = None
    first_asset = assets[0] if assets else None
    if first_asset and first_asset.get('type') == 'index':
        first_ticker = histories[0].get('ticker', tickers[0]) if histories else tickers[0]
        if first_ticker in aligned:
            benchmark_returns = calculate_returns(aligned[first_ticker])
    
    for ticker in tickers:
        prices = aligned[ticker]
        returns = calculate_returns(prices)
        returns_data[ticker] = returns
        stats_data[ticker] = calculate_statistics(prices, returns, benchmark_returns)
        trend_data[ticker] = find_trend_lines(dates, prices, min_interval_days=15)
        rolling_stats_data[ticker] = calculate_rolling_stats(prices, window=20)
        drawdown_data[ticker] = calculate_drawdown_series(prices)
    
    # Calculate correlation matrix
    n = len(tickers)
    correlation_matrix = [[0.0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i == j:
                correlation_matrix[i][j] = 1.0
            elif i < j:
                corr = calculate_correlation(returns_data[tickers[i]], returns_data[tickers[j]])
                correlation_matrix[i][j] = corr
                correlation_matrix[j][i] = corr
    
    # Calculate rolling correlations (for first pair)
    rolling_correlations = {}
    if len(tickers) >= 2:
        for i in range(len(tickers)):
            for j in range(i + 1, len(tickers)):
                key = f"{tickers[i]}_vs_{tickers[j]}"
                rolling_correlations[key] = calculate_rolling_correlation(
                    returns_data[tickers[i]], 
                    returns_data[tickers[j]], 
                    window=20
                )
    
    # Find first valid price for each ticker (for normalization)
    first_valid = {}
    for ticker in tickers:
        for price in aligned[ticker]:
            if price and price > 0:
                first_valid[ticker] = price
                break
        if ticker not in first_valid:
            first_valid[ticker] = 1  # Fallback
    
    # Prepare chart data (prices normalized to start at 100)
    chart_data = []
    for idx, date in enumerate(dates):
        point = {"date": date}
        for ticker in tickers:
            price = aligned[ticker][idx]
            if price and price > 0 and first_valid[ticker] > 0:
                # Normalize to 100 at start for comparison
                normalized = (price / first_valid[ticker]) * 100
                point[ticker] = round(normalized, 2)
                point[f"{ticker}_raw"] = round(price, 4)
                point[f"{ticker}_dd"] = round(drawdown_data[ticker][idx], 2) if idx < len(drawdown_data[ticker]) else 0
            else:
                # Use last known value or 100 if no data yet
                if idx > 0 and chart_data and ticker in chart_data[-1]:
                    point[ticker] = chart_data[-1][ticker]
                    point[f"{ticker}_raw"] = chart_data[-1].get(f"{ticker}_raw", 0)
                    point[f"{ticker}_dd"] = chart_data[-1].get(f"{ticker}_dd", 0)
                else:
                    point[ticker] = 100
                    point[f"{ticker}_raw"] = first_valid[ticker]
                    point[f"{ticker}_dd"] = 0
        chart_data.append(point)
    
    # Add rolling stats to chart data
    for idx, point in enumerate(chart_data):
        for ticker in tickers:
            rs = rolling_stats_data.get(ticker, {})
            if rs.get('rolling_volatility') and idx < len(rs['rolling_volatility']):
                point[f"{ticker}_vol"] = rs['rolling_volatility'][idx]
            if rs.get('rolling_mean') and idx < len(rs['rolling_mean']):
                point[f"{ticker}_mean"] = rs['rolling_mean'][idx]
    
    # Add rolling correlations to chart data
    for idx, point in enumerate(chart_data):
        for key, values in rolling_correlations.items():
            if idx < len(values):
                point[f"corr_{key}"] = values[idx]
    
    result = {
        "period": period,
        "data_points": len(dates),
        "tickers": tickers,
        "dates": dates,
        "chart_data": chart_data,
        "statistics": stats_data,
        "correlation_matrix": correlation_matrix,
        "correlation_labels": tickers,
        "rolling_correlations": rolling_correlations,
        "trend_lines": trend_data,
        "aligned_prices": aligned,
    }
    
    set_cache(cache_key, result)
    return result
