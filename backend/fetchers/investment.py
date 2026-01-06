"""
Investment Calculator - Comprehensive investment analysis
Features: Lump sum, DCA, benchmark comparison, risk-adjusted returns
"""
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List
from .analysis import fetch_asset_history, calculate_returns, calculate_volatility


def calculate_investment(
    asset_type: str,
    ticker: str,
    period: str = "1y",
    initial_amount: float = 1000,
    recurring_amount: float = 0,
    frequency: str = "once",  # once, daily, weekly, monthly
    benchmark_ticker: str = "^GSPC",  # S&P 500 as default benchmark
) -> Dict[str, Any]:
    """
    Calculate comprehensive investment returns with initial lump sum + optional recurring DCA.
    
    initial_amount: Amount invested at the start
    recurring_amount: Amount added each period (if frequency != once)
    frequency options:
    - "once": Lump sum only (no recurring)
    - "daily": Add recurring amount daily
    - "weekly": Add recurring amount weekly
    - "monthly": Add recurring amount monthly
    """
    # Fetch historical data
    hist = fetch_asset_history(asset_type, ticker, period)
    
    if hist.get('error') or not hist.get('data'):
        return {"error": hist.get('error', 'No data available')}
    
    # Try to fetch benchmark (S&P 500)
    benchmark_data = None
    try:
        benchmark_hist = fetch_asset_history('stock', benchmark_ticker, period)
        if benchmark_hist.get('data'):
            benchmark_data = {}
            for point in benchmark_hist['data']:
                date = point.get('Date') or point.get('date')
                price = point.get('Close') or point.get('close') or point.get('price')
                if date and price:
                    benchmark_data[date] = float(price)
    except:
        pass
    
    # Extract prices and dates
    data_points = []
    for point in hist['data']:
        price = point.get('Close') or point.get('close') or point.get('price')
        date = point.get('Date') or point.get('date')
        if price and price > 0 and date:
            data_points.append({
                "date": date,
                "price": float(price),
                "benchmark_price": benchmark_data.get(date) if benchmark_data else None
            })
    
    if len(data_points) < 5:
        return {"error": "Insufficient historical data"}
    
    # Sort by date
    data_points.sort(key=lambda x: x['date'])
    
    start_date = data_points[0]['date']
    end_date = data_points[-1]['date']
    start_price = data_points[0]['price']
    end_price = data_points[-1]['price']
    
    # Benchmark comparison
    benchmark_start = data_points[0].get('benchmark_price')
    benchmark_end = data_points[-1].get('benchmark_price')
    
    # Determine recurring investment dates
    investment_dates = set()
    
    if frequency == "daily" and recurring_amount > 0:
        investment_dates = set(dp['date'] for dp in data_points[1:])  # Skip first day (initial)
    
    elif frequency == "weekly" and recurring_amount > 0:
        current_week = None
        for i, dp in enumerate(data_points):
            if i == 0:
                continue  # Skip first day (initial)
            dt = datetime.strptime(dp['date'], '%Y-%m-%d')
            week = dt.isocalendar()[1]
            year = dt.year
            week_key = f"{year}-{week}"
            if week_key != current_week:
                investment_dates.add(dp['date'])
                current_week = week_key
    
    elif frequency == "monthly" and recurring_amount > 0:
        current_month = None
        for i, dp in enumerate(data_points):
            if i == 0:
                continue  # Skip first day (initial)
            month_key = dp['date'][:7]  # YYYY-MM
            if month_key != current_month:
                investment_dates.add(dp['date'])
                current_month = month_key
    
    # Calculate returns with initial + recurring
    shares_bought = 0
    total_invested = 0
    num_purchases = 0
    
    # For benchmark comparison
    benchmark_shares = 0
    
    timeline = []
    is_first = True
    
    # Track peak for drawdown calculation
    peak_value = 0
    max_drawdown = 0
    
    for dp in data_points:
        invested_today = 0
        benchmark_invested_today = 0
        
        if is_first and initial_amount > 0:
            # Initial investment on first day
            new_shares = initial_amount / dp['price']
            shares_bought += new_shares
            total_invested += initial_amount
            invested_today = initial_amount
            num_purchases += 1
            
            # Same for benchmark
            if dp.get('benchmark_price'):
                benchmark_shares += initial_amount / dp['benchmark_price']
            
            is_first = False
        
        if dp['date'] in investment_dates and recurring_amount > 0:
            # Recurring investment
            new_shares = recurring_amount / dp['price']
            shares_bought += new_shares
            total_invested += recurring_amount
            invested_today += recurring_amount
            num_purchases += 1
            
            # Same for benchmark
            if dp.get('benchmark_price'):
                benchmark_shares += recurring_amount / dp['benchmark_price']
        
        current_value = shares_bought * dp['price']
        benchmark_value = benchmark_shares * dp['benchmark_price'] if dp.get('benchmark_price') and benchmark_shares > 0 else None
        
        # Drawdown calculation
        if current_value > peak_value:
            peak_value = current_value
        if peak_value > 0:
            drawdown = (peak_value - current_value) / peak_value * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        else:
            drawdown = 0
        
        timeline.append({
            "date": dp['date'],
            "price": dp['price'],
            "shares": shares_bought,
            "value": current_value,
            "invested": total_invested,
            "invested_today": invested_today,
            "drawdown": drawdown,
            "profit_loss": current_value - total_invested,
            "return_pct": ((current_value / total_invested) - 1) * 100 if total_invested > 0 else 0,
            "benchmark_price": dp.get('benchmark_price'),
            "benchmark_value": benchmark_value,
        })
    
    final_value = shares_bought * end_price
    
    # Calculate returns
    total_return = final_value - total_invested
    total_return_pct = (total_return / total_invested) * 100 if total_invested > 0 else 0
    
    # Calculate time-weighted return
    days = len(data_points)
    years = days / 252
    
    if years > 0 and total_invested > 0:
        cagr = ((final_value / total_invested) ** (1 / years) - 1) * 100
    else:
        cagr = 0
    
    # Calculate buy-and-hold comparison (same total amount invested at start)
    bh_shares = total_invested / start_price if start_price > 0 else 0
    bh_final = bh_shares * end_price
    bh_return = bh_final - total_invested
    bh_return_pct = (bh_return / total_invested) * 100 if total_invested > 0 else 0
    
    # Average cost basis
    avg_cost = total_invested / shares_bought if shares_bought > 0 else 0
    
    # Calculate volatility of portfolio returns
    portfolio_values = [t['value'] for t in timeline if t['value'] > 0]
    portfolio_returns = calculate_returns(portfolio_values)
    portfolio_volatility = calculate_volatility(portfolio_returns) * 100 if portfolio_returns else 0
    
    # Calculate Sharpe ratio (assuming 0 risk-free rate)
    if portfolio_returns and len(portfolio_returns) > 1:
        mean_return = np.mean(portfolio_returns) * 252
        vol = calculate_volatility(portfolio_returns)
        sharpe_ratio = mean_return / vol if vol > 0 else 0
    else:
        sharpe_ratio = 0
    
    # Benchmark comparison results
    benchmark_comparison = None
    if benchmark_start and benchmark_end and benchmark_shares > 0:
        benchmark_final = benchmark_shares * benchmark_end
        benchmark_return_pct = ((benchmark_final / total_invested) - 1) * 100 if total_invested > 0 else 0
        benchmark_price_change = ((benchmark_end / benchmark_start) - 1) * 100
        
        benchmark_comparison = {
            "benchmark_ticker": benchmark_ticker,
            "benchmark_start_price": benchmark_start,
            "benchmark_end_price": benchmark_end,
            "benchmark_price_change_pct": benchmark_price_change,
            "benchmark_final_value": benchmark_final,
            "benchmark_return_pct": benchmark_return_pct,
            "alpha": total_return_pct - benchmark_return_pct,  # Excess return vs benchmark
            "outperformed": total_return_pct > benchmark_return_pct,
        }
    
    # Calculate monthly returns for additional analysis
    monthly_returns = []
    current_month = None
    month_start_value = 0
    
    for t in timeline:
        month_key = t['date'][:7]
        if month_key != current_month:
            if current_month is not None and month_start_value > 0:
                month_return = ((t['value'] / month_start_value) - 1) * 100
                monthly_returns.append({
                    "month": current_month,
                    "return_pct": month_return,
                })
            current_month = month_key
            month_start_value = t['value']
    
    # Winning vs losing months
    winning_months = len([m for m in monthly_returns if m['return_pct'] > 0])
    losing_months = len([m for m in monthly_returns if m['return_pct'] < 0])
    
    # Best and worst month
    best_month = max(monthly_returns, key=lambda x: x['return_pct']) if monthly_returns else None
    worst_month = min(monthly_returns, key=lambda x: x['return_pct']) if monthly_returns else None
    
    return {
        "ticker": ticker,
        "asset_type": asset_type,
        "period": period,
        "frequency": frequency,
        "start_date": start_date,
        "end_date": end_date,
        "start_price": start_price,
        "end_price": end_price,
        "price_change_pct": ((end_price / start_price) - 1) * 100 if start_price > 0 else 0,
        "investment": {
            "initial_amount": initial_amount,
            "recurring_amount": recurring_amount,
            "total_invested": total_invested,
            "num_purchases": num_purchases,
            "shares_bought": shares_bought,
            "avg_cost_basis": avg_cost,
        },
        "results": {
            "final_value": final_value,
            "total_return": total_return,
            "total_return_pct": total_return_pct,
            "cagr": cagr,
        },
        "risk_metrics": {
            "volatility": portfolio_volatility,
            "sharpe_ratio": sharpe_ratio,
            "max_drawdown": max_drawdown,
        },
        "comparison": {
            "buy_hold_return_pct": bh_return_pct,
            "buy_hold_final_value": bh_final,
            "dca_advantage": total_return_pct - bh_return_pct,
        },
        "benchmark_comparison": benchmark_comparison,
        "monthly_analysis": {
            "total_months": len(monthly_returns),
            "winning_months": winning_months,
            "losing_months": losing_months,
            "win_rate": (winning_months / len(monthly_returns) * 100) if monthly_returns else 0,
            "best_month": best_month,
            "worst_month": worst_month,
            "avg_monthly_return": np.mean([m['return_pct'] for m in monthly_returns]) if monthly_returns else 0,
        },
        "timeline": timeline,
    }
