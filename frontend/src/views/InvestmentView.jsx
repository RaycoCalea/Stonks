import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, ComposedChart, ReferenceLine
} from 'recharts'
import './InvestmentView.css'

const PERIODS = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: '5y', label: '5Y' },
  { value: '10y', label: '10Y' },
]

const FREQUENCIES = [
  { value: 'none', label: 'No Recurring' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function InvestmentView({ selectedAssets, onUpdate }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [period, setPeriod] = useState('1y')
  const [initialAmount, setInitialAmount] = useState(10000)
  const [recurringAmount, setRecurringAmount] = useState(500)
  const [frequency, setFrequency] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [investmentData, setInvestmentData] = useState(null)

  const currentAsset = selectedAssets[activeIndex]

  const calculateReturns = useCallback(async () => {
    if (!currentAsset) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/investment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: currentAsset.type,
          ticker: currentAsset.id || currentAsset.ticker,
          period,
          initial_amount: initialAmount,
          recurring_amount: frequency !== 'none' ? recurringAmount : 0,
          frequency: frequency === 'none' ? 'once' : frequency
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Calculation failed' }))
        throw new Error(err.detail)
      }

      const data = await res.json()
      setInvestmentData(data)
      onUpdate?.({ type: 'investment', ticker: data.ticker })
    } catch (err) {
      setError(err.message)
      setInvestmentData(null)
    } finally {
      setLoading(false)
    }
  }, [currentAsset, period, initialAmount, recurringAmount, frequency, onUpdate])

  // Calculate when parameters change
  useEffect(() => {
    if (currentAsset) {
      calculateReturns()
    } else {
      setInvestmentData(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssets.length, activeIndex, period, initialAmount, recurringAmount, frequency])

  // Reset active index when assets change
  useEffect(() => {
    if (selectedAssets.length > 0 && activeIndex >= selectedAssets.length) {
      setActiveIndex(0)
    }
  }, [selectedAssets, activeIndex])

  const formatPrice = (v) => {
    if (!v) return '$0'
    if (v >= 1000000) return '$' + (v / 1000000).toFixed(2) + 'M'
    if (v >= 1000) return '$' + (v / 1000).toFixed(2) + 'K'
    return '$' + v?.toFixed(2)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatPct = (v) => {
    if (v === undefined || v === null) return '—'
    return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
  }

  return (
    <div className="investment-view">
      {/* Controls */}
      <div className="investment-controls">
        <div className="investment-header">
          <h3 className="section-title">💰 INVESTMENT CALCULATOR</h3>
        </div>

        {/* Asset Navigation */}
        {selectedAssets.length > 0 && (
          <div className="asset-selector-bar">
            <span className="selector-label">ASSET:</span>
            {selectedAssets.map((asset, i) => (
              <button
                key={i}
                className={`asset-select-btn ${i === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(i)}
              >
                <span className="btn-ticker">{asset.ticker}</span>
                <span className="btn-type">{asset.type}</span>
              </button>
            ))}
          </div>
        )}

        <div className="period-row">
          <span className="row-label">PERIOD:</span>
          {PERIODS.map(p => (
            <button
              key={p.value}
              className={`period-btn ${period === p.value ? 'active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="investment-params">
          <div className="param-input-group">
            <label>Initial Investment ($)</label>
            <input
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
              className="amount-input"
              min={0}
            />
          </div>

          <div className="param-input-group">
            <label>Recurring Frequency</label>
            <select 
              value={frequency} 
              onChange={(e) => setFrequency(e.target.value)}
              className="frequency-select"
            >
              {FREQUENCIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {frequency !== 'none' && (
            <div className="param-input-group">
              <label>Recurring Amount ($)</label>
              <input
                type="number"
                value={recurringAmount}
                onChange={(e) => setRecurringAmount(Number(e.target.value))}
                className="amount-input"
                min={0}
              />
            </div>
          )}
        </div>

        <div className="frequency-info">
          {frequency === 'none' && <p>💡 One-time investment: Invest ${initialAmount.toLocaleString()} at the start.</p>}
          {frequency !== 'none' && <p>💡 Initial ${initialAmount.toLocaleString()} + ${recurringAmount.toLocaleString()} {frequency} = DCA strategy</p>}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>CALCULATING RETURNS...</span>
        </div>
      )}

      {selectedAssets.length === 0 && !loading && (
        <div className="investment-prompt">
          <div className="prompt-icon">💰</div>
          <h3>Select an asset above</h3>
          <p>Use the search bar to select an asset for investment analysis</p>
          <div className="prompt-info">
            <p>Calculate returns for lump sum or DCA strategies</p>
          </div>
        </div>
      )}

      {investmentData && !loading && (
        <div className="investment-results">
          {/* Summary Cards */}
          <div className="summary-panel">
            <div className="summary-card highlight">
              <span className="summary-label">Final Portfolio Value</span>
              <span className="summary-value large">{formatPrice(investmentData.results.final_value)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Invested</span>
              <span className="summary-value">{formatPrice(investmentData.investment.total_invested)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Return</span>
              <span className={`summary-value ${investmentData.results.total_return >= 0 ? 'positive' : 'negative'}`}>
                {formatPrice(investmentData.results.total_return)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Return %</span>
              <span className={`summary-value ${investmentData.results.total_return_pct >= 0 ? 'positive' : 'negative'}`}>
                {formatPct(investmentData.results.total_return_pct)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">CAGR</span>
              <span className={`summary-value ${investmentData.results.cagr >= 0 ? 'positive' : 'negative'}`}>
                {formatPct(investmentData.results.cagr)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label"># Purchases</span>
              <span className="summary-value">{investmentData.investment.num_purchases}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Shares</span>
              <span className="summary-value">{investmentData.investment.shares_bought?.toFixed(4)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Avg Cost Basis</span>
              <span className="summary-value">{formatPrice(investmentData.investment.avg_cost_basis)}</span>
            </div>
          </div>

          {/* Risk Metrics */}
          {investmentData.risk_metrics && (
            <div className="risk-metrics-panel">
              <h4 className="panel-title">⚠️ RISK METRICS</h4>
              <div className="risk-metrics-grid">
                <div className="risk-metric">
                  <span className="metric-label">Volatility (Ann.)</span>
                  <span className="metric-value">{investmentData.risk_metrics.volatility?.toFixed(2)}%</span>
                </div>
                <div className="risk-metric">
                  <span className="metric-label">Sharpe Ratio</span>
                  <span className={`metric-value ${investmentData.risk_metrics.sharpe_ratio >= 0 ? 'positive' : 'negative'}`}>
                    {investmentData.risk_metrics.sharpe_ratio?.toFixed(3)}
                  </span>
                </div>
                <div className="risk-metric danger">
                  <span className="metric-label">Max Drawdown</span>
                  <span className="metric-value">-{investmentData.risk_metrics.max_drawdown?.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Panel */}
          <div className="comparison-panel">
            <h4 className="panel-title">📊 STRATEGY COMPARISON</h4>
            <div className="comparison-grid">
              <div className="comparison-card your-strategy">
                <span className="comparison-title">Your Strategy</span>
                <span className="comparison-return">{formatPct(investmentData.results.total_return_pct)}</span>
                <span className="comparison-value">{formatPrice(investmentData.results.final_value)}</span>
              </div>
              <div className="comparison-card buy-hold">
                <span className="comparison-title">Buy & Hold (Lump Sum)</span>
                <span className="comparison-return">{formatPct(investmentData.comparison.buy_hold_return_pct)}</span>
                <span className="comparison-value">{formatPrice(investmentData.comparison.buy_hold_final_value)}</span>
              </div>
              <div className={`comparison-card advantage ${investmentData.comparison.dca_advantage >= 0 ? 'positive' : 'negative'}`}>
                <span className="comparison-title">DCA Advantage</span>
                <span className="comparison-return">{formatPct(investmentData.comparison.dca_advantage)}</span>
                <span className="comparison-desc">
                  {investmentData.comparison.dca_advantage >= 0 ? '✓ DCA Outperformed' : '✗ Buy & Hold Was Better'}
                </span>
              </div>
            </div>
          </div>

          {/* Benchmark Comparison */}
          {investmentData.benchmark_comparison && (
            <div className="benchmark-panel">
              <h4 className="panel-title">📈 BENCHMARK (vs S&P 500)</h4>
              <div className="benchmark-grid">
                <div className="benchmark-card">
                  <span className="benchmark-label">Your Return</span>
                  <span className={`benchmark-value ${investmentData.results.total_return_pct >= 0 ? 'positive' : 'negative'}`}>
                    {formatPct(investmentData.results.total_return_pct)}
                  </span>
                </div>
                <div className="benchmark-card">
                  <span className="benchmark-label">S&P 500</span>
                  <span className={`benchmark-value ${investmentData.benchmark_comparison.benchmark_return_pct >= 0 ? 'positive' : 'negative'}`}>
                    {formatPct(investmentData.benchmark_comparison.benchmark_return_pct)}
                  </span>
                </div>
                <div className={`benchmark-card alpha ${investmentData.benchmark_comparison.alpha >= 0 ? 'positive' : 'negative'}`}>
                  <span className="benchmark-label">Alpha</span>
                  <span className="benchmark-value">{formatPct(investmentData.benchmark_comparison.alpha)}</span>
                  <span className="benchmark-desc">
                    {investmentData.benchmark_comparison.outperformed ? '🏆 Beat Market!' : '📉 Underperformed'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Value Chart */}
          <div className="chart-panel">
            <h4 className="panel-title">📈 PORTFOLIO VALUE OVER TIME</h4>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={investmentData.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={formatPrice} width={80} />
                <Tooltip formatter={(v, name) => [formatPrice(v), name]} labelFormatter={formatDate} contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }} />
                <Legend />
                <Area type="monotone" dataKey="invested" stroke="#6b7280" fill="#6b7280" fillOpacity={0.2} name="Total Invested" />
                <Line type="monotone" dataKey="value" stroke="#00ff88" strokeWidth={2} dot={false} name="Portfolio Value" />
                {investmentData.timeline[0]?.benchmark_value && (
                  <Line type="monotone" dataKey="benchmark_value" stroke="#ff6b00" strokeWidth={2} strokeDasharray="5 5" dot={false} name="S&P 500" />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Drawdown Chart */}
          <div className="chart-panel">
            <h4 className="panel-title">📉 DRAWDOWN OVER TIME</h4>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={investmentData.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `-${v.toFixed(0)}%`} width={60} domain={[0, 'dataMax']} reversed />
                <ReferenceLine y={0} stroke="#6b7280" />
                <Tooltip formatter={(v) => [`-${v?.toFixed(2)}%`, 'Drawdown']} labelFormatter={formatDate} contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }} />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Drawdown" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Price Chart */}
          <div className="chart-panel">
            <h4 className="panel-title">💹 ASSET PRICE & SHARES OWNED</h4>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={investmentData.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="price" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={formatPrice} width={70} />
                <YAxis yAxisId="shares" orientation="right" stroke="#ff6b00" tick={{ fill: '#ff6b00', fontSize: 10 }} tickFormatter={(v) => v?.toFixed(2)} width={70} />
                <Tooltip formatter={(v, name) => name === 'Price' ? [formatPrice(v), name] : [v?.toFixed(4), name]} labelFormatter={formatDate} contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }} />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#00d4ff" strokeWidth={2} dot={false} yAxisId="price" name="Price" />
                <Line type="stepAfter" dataKey="shares" stroke="#ff6b00" strokeWidth={2} dot={false} yAxisId="shares" name="Shares Owned" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Details */}
          <div className="details-panel">
            <div className="detail-row">
              <span>Period</span>
              <span>{investmentData.start_date} → {investmentData.end_date}</span>
            </div>
            <div className="detail-row">
              <span>Start Price</span>
              <span>{formatPrice(investmentData.start_price)}</span>
            </div>
            <div className="detail-row">
              <span>End Price</span>
              <span>{formatPrice(investmentData.end_price)}</span>
            </div>
            <div className="detail-row">
              <span>Price Change</span>
              <span className={investmentData.price_change_pct >= 0 ? 'positive' : 'negative'}>
                {formatPct(investmentData.price_change_pct)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvestmentView
