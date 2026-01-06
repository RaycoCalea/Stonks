"""
Forecast Module - GBM Monte Carlo simulations with advanced risk metrics
Includes: VaR, CVaR, scenario analysis, probability distributions
"""
import numpy as np
from typing import Dict, Any, List
from .analysis import fetch_asset_history, calculate_returns, calculate_volatility


def run_gbm_forecast(
    asset_type: str,
    ticker: str,
    lookback_period: str = "1y",
    forecast_days: int = 252,
    num_simulations: int = 10000
) -> Dict[str, Any]:
    """
    Run Geometric Brownian Motion Monte Carlo simulation with comprehensive risk metrics.
    
    Steps:
    1. Fetch historical data for lookback period
    2. Calculate CAGR (drift) and volatility
    3. Run GBM simulations
    4. Calculate VaR, CVaR, scenario analysis
    5. Return paths and statistics
    """
    # Fetch historical data
    hist = fetch_asset_history(asset_type, ticker, lookback_period)
    
    if hist.get('error') or not hist.get('data'):
        return {"error": hist.get('error', 'No data available')}
    
    # Extract prices
    prices = []
    dates = []
    for point in hist['data']:
        price = point.get('Close') or point.get('close') or point.get('price')
        date = point.get('Date') or point.get('date')
        if price and price > 0:
            prices.append(float(price))
            dates.append(date)
    
    if len(prices) < 20:
        return {"error": "Insufficient historical data (need at least 20 points)"}
    
    prices = np.array(prices)
    
    # Calculate log returns
    log_returns = np.diff(np.log(prices))
    
    # Calculate annualized drift (CAGR) and volatility
    trading_days = 252
    daily_mean = np.mean(log_returns)
    daily_vol = np.std(log_returns)
    
    annualized_return = daily_mean * trading_days
    annualized_vol = daily_vol * np.sqrt(trading_days)
    
    # CAGR from first to last price
    years = len(prices) / trading_days
    cagr = (prices[-1] / prices[0]) ** (1 / years) - 1 if years > 0 else 0
    
    # Current price (starting point for simulation)
    current_price = prices[-1]
    
    # Historical statistics for context
    hist_min = np.min(prices)
    hist_max = np.max(prices)
    hist_mean = np.mean(prices)
    
    # Skewness and kurtosis of returns
    skewness = float(np.mean(((log_returns - daily_mean) / daily_vol) ** 3)) if daily_vol > 0 else 0
    kurtosis = float(np.mean(((log_returns - daily_mean) / daily_vol) ** 4)) if daily_vol > 0 else 3
    
    # GBM Parameters
    dt = 1 / trading_days  # Daily time step
    mu = annualized_return  # Drift
    sigma = annualized_vol  # Volatility
    
    # Run Monte Carlo simulation
    np.random.seed(42)  # For reproducibility
    
    # Generate random walks
    random_walks = np.random.normal(
        loc=(mu - 0.5 * sigma**2) * dt,
        scale=sigma * np.sqrt(dt),
        size=(num_simulations, forecast_days)
    )
    
    # Calculate price paths
    price_paths = current_price * np.exp(np.cumsum(random_walks, axis=1))
    
    # Add starting price column
    price_paths = np.column_stack([
        np.full(num_simulations, current_price),
        price_paths
    ])
    
    # Calculate statistics for each day
    percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99]
    path_stats = []
    
    for day in range(forecast_days + 1):
        day_prices = price_paths[:, day]
        stats = {
            "day": day,
            "mean": float(np.mean(day_prices)),
            "std": float(np.std(day_prices)),
            "min": float(np.min(day_prices)),
            "max": float(np.max(day_prices)),
        }
        for p in percentiles:
            stats[f"p{p}"] = float(np.percentile(day_prices, p))
        path_stats.append(stats)
    
    # Final day statistics
    final_prices = price_paths[:, -1]
    final_returns = (final_prices / current_price - 1) * 100
    
    # VaR and CVaR calculations
    var_95 = float(np.percentile(final_returns, 5))  # 95% VaR
    var_99 = float(np.percentile(final_returns, 1))  # 99% VaR
    
    # CVaR (Expected Shortfall)
    cvar_95 = float(np.mean(final_returns[final_returns <= var_95]))
    cvar_99 = float(np.mean(final_returns[final_returns <= var_99]))
    
    # Time-based VaR (at different horizons)
    var_horizons = {}
    for horizon in [21, 63, 126, 252]:  # 1mo, 3mo, 6mo, 1yr
        if horizon < forecast_days:
            horizon_prices = price_paths[:, horizon]
            horizon_returns = (horizon_prices / current_price - 1) * 100
            var_horizons[f"{horizon}d_var_95"] = float(np.percentile(horizon_returns, 5))
            var_horizons[f"{horizon}d_var_99"] = float(np.percentile(horizon_returns, 1))
    
    # Scenario Analysis
    scenarios = {
        "base_case": {
            "description": "Expected outcome (median)",
            "final_price": float(np.percentile(final_prices, 50)),
            "return_pct": float(np.percentile(final_returns, 50)),
        },
        "bull_case": {
            "description": "Optimistic scenario (90th percentile)",
            "final_price": float(np.percentile(final_prices, 90)),
            "return_pct": float(np.percentile(final_returns, 90)),
        },
        "bear_case": {
            "description": "Pessimistic scenario (10th percentile)",
            "final_price": float(np.percentile(final_prices, 10)),
            "return_pct": float(np.percentile(final_returns, 10)),
        },
        "extreme_bull": {
            "description": "Extreme upside (99th percentile)",
            "final_price": float(np.percentile(final_prices, 99)),
            "return_pct": float(np.percentile(final_returns, 99)),
        },
        "extreme_bear": {
            "description": "Extreme downside (1st percentile)",
            "final_price": float(np.percentile(final_prices, 1)),
            "return_pct": float(np.percentile(final_returns, 1)),
        },
    }
    
    # Probability analysis
    prob_analysis = {
        "prob_positive": float(np.mean(final_returns > 0) * 100),
        "prob_negative": float(np.mean(final_returns < 0) * 100),
        "prob_up_10pct": float(np.mean(final_returns > 10) * 100),
        "prob_up_25pct": float(np.mean(final_returns > 25) * 100),
        "prob_up_50pct": float(np.mean(final_returns > 50) * 100),
        "prob_double": float(np.mean(final_prices > current_price * 2) * 100),
        "prob_down_10pct": float(np.mean(final_returns < -10) * 100),
        "prob_down_25pct": float(np.mean(final_returns < -25) * 100),
        "prob_down_50pct": float(np.mean(final_returns < -50) * 100),
        "prob_halve": float(np.mean(final_prices < current_price * 0.5) * 100),
    }
    
    # Return distribution buckets
    return_buckets = [
        ("<-50%", float(np.mean(final_returns < -50) * 100)),
        ("-50% to -25%", float(np.mean((final_returns >= -50) & (final_returns < -25)) * 100)),
        ("-25% to -10%", float(np.mean((final_returns >= -25) & (final_returns < -10)) * 100)),
        ("-10% to 0%", float(np.mean((final_returns >= -10) & (final_returns < 0)) * 100)),
        ("0% to 10%", float(np.mean((final_returns >= 0) & (final_returns < 10)) * 100)),
        ("10% to 25%", float(np.mean((final_returns >= 10) & (final_returns < 25)) * 100)),
        ("25% to 50%", float(np.mean((final_returns >= 25) & (final_returns < 50)) * 100)),
        ("50% to 100%", float(np.mean((final_returns >= 50) & (final_returns < 100)) * 100)),
        (">100%", float(np.mean(final_returns >= 100) * 100)),
    ]
    
    # Maximum drawdown in simulations
    max_drawdowns = []
    for i in range(min(1000, num_simulations)):  # Sample 1000 paths for efficiency
        path = price_paths[i]
        peak = path[0]
        max_dd = 0
        for price in path:
            if price > peak:
                peak = price
            dd = (peak - price) / peak
            if dd > max_dd:
                max_dd = dd
        max_drawdowns.append(max_dd * 100)
    
    drawdown_stats = {
        "mean_max_drawdown": float(np.mean(max_drawdowns)),
        "median_max_drawdown": float(np.median(max_drawdowns)),
        "p95_max_drawdown": float(np.percentile(max_drawdowns, 95)),
        "worst_drawdown": float(np.max(max_drawdowns)),
    }
    
    # Sample paths for visualization (100 paths)
    sample_indices = np.linspace(0, num_simulations - 1, 100, dtype=int)
    sample_paths = price_paths[sample_indices, :].tolist()
    
    return {
        "ticker": ticker,
        "asset_type": asset_type,
        "current_price": float(current_price),
        "lookback_period": lookback_period,
        "forecast_days": forecast_days,
        "num_simulations": num_simulations,
        "historical": {
            "start_date": dates[0],
            "end_date": dates[-1],
            "start_price": float(prices[0]),
            "end_price": float(prices[-1]),
            "min_price": float(hist_min),
            "max_price": float(hist_max),
            "mean_price": float(hist_mean),
            "data_points": len(prices),
        },
        "parameters": {
            "cagr": float(cagr * 100),  # As percentage
            "annualized_return": float(annualized_return * 100),
            "annualized_volatility": float(annualized_vol * 100),
            "daily_drift": float(daily_mean * 100),
            "daily_volatility": float(daily_vol * 100),
            "skewness": float(skewness),
            "kurtosis": float(kurtosis),
        },
        "risk_metrics": {
            "var_95": var_95,
            "var_99": var_99,
            "cvar_95": cvar_95,
            "cvar_99": cvar_99,
            **var_horizons,
            **drawdown_stats,
        },
        "scenarios": scenarios,
        "probability_analysis": prob_analysis,
        "return_distribution": {
            "mean": float(np.mean(final_returns)),
            "std": float(np.std(final_returns)),
            "skew": float(skewness),
            "buckets": return_buckets,
            "p1": float(np.percentile(final_returns, 1)),
            "p5": float(np.percentile(final_returns, 5)),
            "p10": float(np.percentile(final_returns, 10)),
            "p25": float(np.percentile(final_returns, 25)),
            "p50": float(np.percentile(final_returns, 50)),
            "p75": float(np.percentile(final_returns, 75)),
            "p90": float(np.percentile(final_returns, 90)),
            "p95": float(np.percentile(final_returns, 95)),
            "p99": float(np.percentile(final_returns, 99)),
        },
        "forecast_stats": path_stats,
        "sample_paths": sample_paths,
        "final_distribution": {
            "mean": float(np.mean(final_prices)),
            "std": float(np.std(final_prices)),
            "min": float(np.min(final_prices)),
            "max": float(np.max(final_prices)),
            "p1": float(np.percentile(final_prices, 1)),
            "p5": float(np.percentile(final_prices, 5)),
            "p10": float(np.percentile(final_prices, 10)),
            "p25": float(np.percentile(final_prices, 25)),
            "p50": float(np.percentile(final_prices, 50)),
            "p75": float(np.percentile(final_prices, 75)),
            "p90": float(np.percentile(final_prices, 90)),
            "p95": float(np.percentile(final_prices, 95)),
            "p99": float(np.percentile(final_prices, 99)),
            "prob_positive": float(np.mean(final_returns > 0) * 100),
            "prob_double": float(np.mean(final_prices > current_price * 2) * 100),
            "prob_halve": float(np.mean(final_prices < current_price * 0.5) * 100),
        },
    }
