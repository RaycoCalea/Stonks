import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, ComposedChart, BarChart, Bar, Cell
} from 'recharts'
import './ForecastView.css'

const LOOKBACK_PERIODS = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: '5y', label: '5Y' },
  { value: '10y', label: '10Y' },
]

const FORECAST_HORIZONS = [
  { value: 63, label: '3 Months' },
  { value: 126, label: '6 Months' },
  { value: 252, label: '1 Year' },
  { value: 504, label: '2 Years' },
]

function ForecastView({ selectedAssets, onUpdate }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lookbackPeriod, setLookbackPeriod] = useState('1y')
  const [forecastDays, setForecastDays] = useState(252)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [forecastData, setForecastData] = useState(null)

  const currentAsset = selectedAssets[activeIndex]

  const runForecast = useCallback(async () => {
    if (!currentAsset) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: currentAsset.type,
          ticker: currentAsset.id || currentAsset.ticker,
          lookback_period: lookbackPeriod,
          forecast_days: forecastDays,
          num_simulations: 10000
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Forecast failed' }))
        throw new Error(err.detail)
      }

      const data = await res.json()
      setForecastData(data)
      onUpdate?.({ type: 'forecast', ticker: data.ticker })
    } catch (err) {
      setError(err.message)
      setForecastData(null)
    } finally {
      setLoading(false)
    }
  }, [currentAsset, lookbackPeriod, forecastDays, onUpdate])

  // Run forecast when asset or parameters change
  useEffect(() => {
    if (currentAsset) {
      runForecast()
    } else {
      setForecastData(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssets.length, activeIndex, lookbackPeriod, forecastDays])

  // Reset active index when assets change
  useEffect(() => {
    if (selectedAssets.length > 0 && activeIndex >= selectedAssets.length) {
      setActiveIndex(0)
    }
  }, [selectedAssets, activeIndex])

  // Prepare chart data from forecast stats
  const getChartData = () => {
    if (!forecastData?.forecast_stats) return []
    
    return forecastData.forecast_stats.map((stat) => ({
      day: stat.day,
      mean: stat.mean,
      p5: stat.p5,
      p25: stat.p25,
      p50: stat.p50,
      p75: stat.p75,
      p95: stat.p95,
    }))
  }

  // Sample paths for spaghetti plot
  const getSamplePaths = () => {
    if (!forecastData?.sample_paths) return []
    
    const paths = forecastData.sample_paths.slice(0, 50)
    const numDays = paths[0]?.length || 0
    
    return Array.from({ length: numDays }, (_, day) => {
      const point = { day }
      paths.forEach((path, i) => {
        point[`path${i}`] = path[day]
      })
      return point
    })
  }

  // Return distribution for histogram
  const getReturnBuckets = () => {
    if (!forecastData?.return_distribution?.buckets) return []
    
    return forecastData.return_distribution.buckets.map(([range, pct]) => ({
      range,
      probability: pct,
    }))
  }

  const formatPrice = (v) => {
    if (v >= 1000000) return '$' + (v / 1000000).toFixed(2) + 'M'
    if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'K'
    return '$' + v?.toFixed(2)
  }

  const formatPct = (v) => {
    if (v === undefined || v === null) return '—'
    return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
  }

  return (
    <div className="forecast-view">
      {/* Controls */}
      <div className="forecast-controls">
        <div className="forecast-header">
          <h3 className="section-title">🎯 MONTE CARLO PRICE FORECAST (GBM)</h3>
          <span className="sim-count">10,000 simulations</span>
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

        <div className="params-row">
          <div className="param-group">
            <span className="param-label">LOOKBACK:</span>
            {LOOKBACK_PERIODS.map(p => (
              <button
                key={p.value}
                className={`param-btn ${lookbackPeriod === p.value ? 'active' : ''}`}
                onClick={() => setLookbackPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          
          <div className="param-group">
            <span className="param-label">FORECAST:</span>
            {FORECAST_HORIZONS.map(h => (
              <button
                key={h.value}
                className={`param-btn ${forecastDays === h.value ? 'active' : ''}`}
                onClick={() => setForecastDays(h.value)}
              >
                {h.label}
              </button>
            ))}
          </div>
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
          <span>RUNNING 10,000 SIMULATIONS...</span>
        </div>
      )}

      {selectedAssets.length === 0 && !loading && (
        <div className="forecast-prompt">
          <div className="prompt-icon">🎯</div>
          <h3>Select an asset above</h3>
          <p>Use the search bar to select an asset for price forecasting</p>
          <div className="prompt-info">
            <p>The forecast uses Geometric Brownian Motion (GBM) with historical CAGR and volatility</p>
          </div>
        </div>
      )}

      {forecastData && !loading && (
        <div className="forecast-results">
          {/* Historical Parameters */}
          <div className="params-panel">
            <h4 className="panel-title">📊 HISTORICAL PARAMETERS</h4>
            <div className="params-grid">
              <div className="param-card">
                <span className="param-label">Current Price</span>
                <span className="param-value">{formatPrice(forecastData.current_price)}</span>
              </div>
              <div className="param-card">
                <span className="param-label">CAGR</span>
                <span className={`param-value ${forecastData.parameters.cagr >= 0 ? 'positive' : 'negative'}`}>
                  {formatPct(forecastData.parameters.cagr)}
                </span>
              </div>
              <div className="param-card">
                <span className="param-label">Ann. Volatility</span>
                <span className="param-value">{forecastData.parameters.annualized_volatility?.toFixed(2)}%</span>
              </div>
              <div className="param-card">
                <span className="param-label">Skewness</span>
                <span className="param-value">{forecastData.parameters.skewness?.toFixed(3)}</span>
              </div>
              <div className="param-card">
                <span className="param-label">Kurtosis</span>
                <span className="param-value">{forecastData.parameters.kurtosis?.toFixed(3)}</span>
              </div>
              <div className="param-card">
                <span className="param-label">Data Points</span>
                <span className="param-value">{forecastData.historical.data_points}</span>
              </div>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="risk-panel">
            <h4 className="panel-title">⚠️ RISK METRICS</h4>
            <div className="risk-grid">
              <div className="risk-card danger">
                <span className="risk-label">VaR (95%)</span>
                <span className="risk-value">{formatPct(forecastData.risk_metrics?.var_95)}</span>
                <span className="risk-desc">5% chance of losing more</span>
              </div>
              <div className="risk-card danger">
                <span className="risk-label">VaR (99%)</span>
                <span className="risk-value">{formatPct(forecastData.risk_metrics?.var_99)}</span>
                <span className="risk-desc">1% chance of losing more</span>
              </div>
              <div className="risk-card severe">
                <span className="risk-label">CVaR (95%)</span>
                <span className="risk-value">{formatPct(forecastData.risk_metrics?.cvar_95)}</span>
                <span className="risk-desc">Expected loss in worst 5%</span>
              </div>
              <div className="risk-card severe">
                <span className="risk-label">CVaR (99%)</span>
                <span className="risk-value">{formatPct(forecastData.risk_metrics?.cvar_99)}</span>
                <span className="risk-desc">Expected loss in worst 1%</span>
              </div>
              <div className="risk-card warning">
                <span className="risk-label">Mean Max Drawdown</span>
                <span className="risk-value">-{forecastData.risk_metrics?.mean_max_drawdown?.toFixed(2)}%</span>
              </div>
              <div className="risk-card warning">
                <span className="risk-label">Worst Drawdown</span>
                <span className="risk-value">-{forecastData.risk_metrics?.worst_drawdown?.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Scenario Analysis */}
          {forecastData.scenarios && (
            <div className="scenarios-panel">
              <h4 className="panel-title">🎭 SCENARIO ANALYSIS</h4>
              <div className="scenarios-grid">
                <div className="scenario-card extreme-bull">
                  <span className="scenario-name">🚀 Extreme Bull</span>
                  <span className="scenario-price">{formatPrice(forecastData.scenarios.extreme_bull?.final_price)}</span>
                  <span className="scenario-return">{formatPct(forecastData.scenarios.extreme_bull?.return_pct)}</span>
                  <span className="scenario-desc">99th Percentile</span>
                </div>
                <div className="scenario-card bull">
                  <span className="scenario-name">🐂 Bull Case</span>
                  <span className="scenario-price">{formatPrice(forecastData.scenarios.bull_case?.final_price)}</span>
                  <span className="scenario-return">{formatPct(forecastData.scenarios.bull_case?.return_pct)}</span>
                  <span className="scenario-desc">90th Percentile</span>
                </div>
                <div className="scenario-card base">
                  <span className="scenario-name">📊 Base Case</span>
                  <span className="scenario-price">{formatPrice(forecastData.scenarios.base_case?.final_price)}</span>
                  <span className="scenario-return">{formatPct(forecastData.scenarios.base_case?.return_pct)}</span>
                  <span className="scenario-desc">Median (50th)</span>
                </div>
                <div className="scenario-card bear">
                  <span className="scenario-name">🐻 Bear Case</span>
                  <span className="scenario-price">{formatPrice(forecastData.scenarios.bear_case?.final_price)}</span>
                  <span className="scenario-return">{formatPct(forecastData.scenarios.bear_case?.return_pct)}</span>
                  <span className="scenario-desc">10th Percentile</span>
                </div>
                <div className="scenario-card extreme-bear">
                  <span className="scenario-name">💀 Extreme Bear</span>
                  <span className="scenario-price">{formatPrice(forecastData.scenarios.extreme_bear?.final_price)}</span>
                  <span className="scenario-return">{formatPct(forecastData.scenarios.extreme_bear?.return_pct)}</span>
                  <span className="scenario-desc">1st Percentile</span>
                </div>
              </div>
            </div>
          )}

          {/* Probability Analysis */}
          {forecastData.probability_analysis && (
            <div className="probability-panel">
              <h4 className="panel-title">📈 PROBABILITY ANALYSIS</h4>
              <div className="probability-grid">
                <div className="prob-item positive">
                  <span className="prob-label">Positive Return</span>
                  <span className="prob-value">{forecastData.probability_analysis.prob_positive?.toFixed(1)}%</span>
                </div>
                <div className="prob-item positive">
                  <span className="prob-label">Up &gt;10%</span>
                  <span className="prob-value">{forecastData.probability_analysis.prob_up_10pct?.toFixed(1)}%</span>
                </div>
                <div className="prob-item positive">
                  <span className="prob-label">Up &gt;25%</span>
                  <span className="prob-value">{forecastData.probability_analysis.prob_up_25pct?.toFixed(1)}%</span>
                </div>
                <div className="prob-item positive">
                  <span className="prob-label">Double (2x)</span>
                  <span className="prob-value">{forecastData.probability_analysis.prob_double?.toFixed(1)}%</span>
                </div>
                <div className="prob-item negative">
                  <span className="prob-label">Negative Return</span>
                  <span className="prob-value">{forecastData.probability_analysis.prob_negative?.toFixed(1)}%</span>
                </div>
                <div className="prob-item negative">
                  <span className="prob-label">Down &gt;10%</span>
                  <span className="prob-value">{forecastData.probability_analysis.prob_down_10pct?.toFixed(1)}%</span>
                </div>
                <div className="prob-item negative">
                  <span className="prob-label">Down &gt;25%</span>
                  <span className="prob-value">{forecastData.probability_analysis.prob_down_25pct?.toFixed(1)}%</span>
                </div>
                <div className="prob-item negative">
                  <span className="prob-label">Halve (0.5x)</span>
                  <span className="prob-value">{forecastData.probability_analysis.prob_halve?.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Cone Chart */}
          <div className="chart-panel">
            <h4 className="panel-title">📈 FORECAST CONE (Percentiles)</h4>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                <XAxis 
                  dataKey="day" 
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  label={{ value: 'Days', position: 'bottom', fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={formatPrice}
                  width={70}
                />
                <Tooltip 
                  formatter={(v) => formatPrice(v)}
                  labelFormatter={(l) => `Day ${l}`}
                  contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }}
                />
                <Legend />
                <Area type="monotone" dataKey="p95" stroke="none" fill="#00ff88" fillOpacity={0.1} name="95th %ile" />
                <Area type="monotone" dataKey="p75" stroke="none" fill="#00ff88" fillOpacity={0.2} name="75th %ile" />
                <Line type="monotone" dataKey="p50" stroke="#00ff88" strokeWidth={2} dot={false} name="Median" />
                <Area type="monotone" dataKey="p25" stroke="none" fill="#ff4757" fillOpacity={0.2} name="25th %ile" />
                <Area type="monotone" dataKey="p5" stroke="none" fill="#ff4757" fillOpacity={0.1} name="5th %ile" />
                <Line type="monotone" dataKey="mean" stroke="#ff6b00" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Mean" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Return Distribution Histogram */}
          {getReturnBuckets().length > 0 && (
            <div className="chart-panel">
              <h4 className="panel-title">📊 RETURN DISTRIBUTION</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={getReturnBuckets()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                  <XAxis type="number" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="range" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} width={80} />
                  <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, 'Probability']} contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }} />
                  <Bar dataKey="probability">
                    {getReturnBuckets().map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.range.startsWith('-') || entry.range.startsWith('<') ? '#ef4444' : 
                              entry.range.startsWith('>') || entry.range.includes('50%') ? '#22c55e' : '#6b7280'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sample Paths */}
          <div className="chart-panel">
            <h4 className="panel-title">🍝 SAMPLE PRICE PATHS (50 of 10,000)</h4>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={getSamplePaths()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                <XAxis dataKey="day" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={formatPrice} width={70} />
                {Array.from({ length: 50 }, (_, i) => (
                  <Line key={i} type="monotone" dataKey={`path${i}`} stroke={`hsl(${(i * 7) % 360}, 70%, 50%)`} strokeWidth={0.5} strokeOpacity={0.4} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Final Distribution Stats */}
          <div className="stats-panel">
            <h4 className="panel-title">📊 FINAL PRICE DISTRIBUTION</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Median Final Price</span>
                <span className="stat-value">{formatPrice(forecastData.final_distribution.p50)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Mean Final Price</span>
                <span className="stat-value">{formatPrice(forecastData.final_distribution.mean)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">1st Percentile</span>
                <span className="stat-value negative">{formatPrice(forecastData.final_distribution.p1)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">5th Percentile</span>
                <span className="stat-value negative">{formatPrice(forecastData.final_distribution.p5)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">95th Percentile</span>
                <span className="stat-value positive">{formatPrice(forecastData.final_distribution.p95)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">99th Percentile</span>
                <span className="stat-value positive">{formatPrice(forecastData.final_distribution.p99)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Expected Return</span>
                <span className={`stat-value ${forecastData.return_distribution.mean >= 0 ? 'positive' : 'negative'}`}>
                  {formatPct(forecastData.return_distribution.mean)}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Return Std Dev</span>
                <span className="stat-value">{forecastData.return_distribution.std?.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ForecastView
