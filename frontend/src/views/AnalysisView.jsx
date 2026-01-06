import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import './AnalysisView.css'

const ASSET_COLORS = [
  '#00ff88', '#ff6b00', '#00d4ff', '#ff4757', '#ffa502',
  '#2ed573', '#1e90ff', '#ff6348', '#7bed9f', '#70a1ff'
]

const PERIODS = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
]

function AnalysisView({ selectedAssets, onUpdate }) {
  const [period, setPeriod] = useState('1y')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)

  const runAnalysis = useCallback(async () => {
    if (selectedAssets.length < 2) {
      setAnalysisData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Convert to the format expected by the API
      const assets = selectedAssets.map(a => ({
        type: a.type,
        ticker: a.id || a.ticker
      }))

      const res = await fetch('/api/analysis/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets, period })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Analysis failed' }))
        throw new Error(err.detail)
      }

      const data = await res.json()
      setAnalysisData(data)
      onUpdate?.({ type: 'analysis', assets: selectedAssets.length })
    } catch (err) {
      setError(err.message)
      setAnalysisData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedAssets, period, onUpdate])

  // Auto-run analysis when assets or period changes
  useEffect(() => {
    if (selectedAssets.length >= 2) {
      runAnalysis()
    } else {
      setAnalysisData(null)
    }
    // Only depend on selectedAssets.length and period to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssets.length, period])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="analysis-view">
      {/* Controls */}
      <div className="analysis-controls">
        <div className="analysis-header">
          <h3 className="section-title">🔬 MULTI-ASSET ANALYSIS</h3>
          <span className="asset-count">
            {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
            {selectedAssets.length < 2 && ' (need at least 2)'}
          </span>
        </div>

        {/* Selected Assets Display */}
        <div className="selected-display">
          {selectedAssets.map((asset, i) => (
            <div 
              key={i} 
              className="analysis-asset-tag"
              style={{ borderColor: ASSET_COLORS[i % ASSET_COLORS.length] }}
            >
              <span className="asset-color-dot" style={{ background: ASSET_COLORS[i % ASSET_COLORS.length] }} />
              <span className="tag-ticker">{asset.ticker}</span>
              <span className="tag-type">{asset.type}</span>
            </div>
          ))}
        </div>

        <div className="period-selector">
          <span className="period-label">PERIOD:</span>
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
          <span>RUNNING ANALYSIS...</span>
        </div>
      )}

      {analysisData && !loading && (
        <div className="analysis-results">
          {/* Statistics Panel */}
          <div className="stats-panel">
            <h3 className="panel-title">📈 COMPREHENSIVE STATISTICS</h3>
            <div className="stats-grid">
              {analysisData.tickers.map((ticker, i) => (
                <div key={ticker} className="stat-card" style={{ borderTopColor: ASSET_COLORS[i] }}>
                  <div className="stat-header">
                    <span className="stat-ticker">{ticker}</span>
                  </div>
                  <div className="stat-rows">
                    <div className="stat-row">
                      <span>Total Return</span>
                      <span className={analysisData.statistics[ticker]?.total_return >= 0 ? 'positive' : 'negative'}>
                        {analysisData.statistics[ticker]?.total_return?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="stat-row">
                      <span>Volatility (Ann.)</span>
                      <span>{analysisData.statistics[ticker]?.volatility?.toFixed(2)}%</span>
                    </div>
                    <div className="stat-row">
                      <span>Sharpe Ratio</span>
                      <span className={analysisData.statistics[ticker]?.sharpe_ratio >= 0 ? 'positive' : 'negative'}>
                        {analysisData.statistics[ticker]?.sharpe_ratio?.toFixed(3)}
                      </span>
                    </div>
                    <div className="stat-row">
                      <span>Sortino Ratio</span>
                      <span className={analysisData.statistics[ticker]?.sortino_ratio >= 0 ? 'positive' : 'negative'}>
                        {analysisData.statistics[ticker]?.sortino_ratio?.toFixed(3)}
                      </span>
                    </div>
                    <div className="stat-row">
                      <span>Max Drawdown</span>
                      <span className="negative">-{analysisData.statistics[ticker]?.max_drawdown?.toFixed(2)}%</span>
                    </div>
                    <div className="stat-row risk">
                      <span>VaR (95%)</span>
                      <span className="negative">{analysisData.statistics[ticker]?.var_95?.toFixed(2)}%</span>
                    </div>
                    <div className="stat-row risk">
                      <span>CVaR (95%)</span>
                      <span className="negative">{analysisData.statistics[ticker]?.cvar_95?.toFixed(2)}%</span>
                    </div>
                    {analysisData.statistics[ticker]?.beta !== undefined && analysisData.statistics[ticker]?.beta !== 1.0 && (
                      <div className="stat-row">
                        <span>Beta</span>
                        <span>{analysisData.statistics[ticker]?.beta?.toFixed(3)}</span>
                      </div>
                    )}
                    {analysisData.statistics[ticker]?.alpha !== undefined && analysisData.statistics[ticker]?.alpha !== 0 && (
                      <div className="stat-row">
                        <span>Alpha</span>
                        <span className={analysisData.statistics[ticker]?.alpha >= 0 ? 'positive' : 'negative'}>
                          {analysisData.statistics[ticker]?.alpha?.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Correlation Matrix */}
          <div className="correlation-panel">
            <h3 className="panel-title">🔗 CORRELATION MATRIX</h3>
            <div className="correlation-matrix">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    {analysisData.tickers.map((t, i) => (
                      <th key={t} style={{ color: ASSET_COLORS[i] }}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysisData.correlation_matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="row-header" style={{ color: ASSET_COLORS[i] }}>
                        {analysisData.tickers[i]}
                      </td>
                      {row.map((val, j) => (
                        <td 
                          key={j}
                          className={`corr-cell ${getCorrelationClass(val)}`}
                        >
                          {val.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Log Price Chart */}
          <div className="chart-panel">
            <h3 className="panel-title">📊 NORMALIZED PRICES (Base = 100)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={analysisData.chart_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    tickFormatter={(v) => v?.toFixed(0)}
                    width={60}
                    domain={['dataMin - 10', 'dataMax + 10']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span style={{ color: '#c9d1d9' }}>{value}</span>}
                  />
                  {analysisData.tickers.map((ticker, i) => (
                    <Line
                      key={ticker}
                      type="monotone"
                      dataKey={ticker}
                      stroke={ASSET_COLORS[i]}
                      strokeWidth={2.5}
                      dot={false}
                      name={ticker}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend Lines Chart */}
          <div className="chart-panel">
            <h3 className="panel-title">📐 TREND LINES (Support & Resistance)</h3>
            {analysisData.tickers.map((ticker, idx) => (
              <TrendLineChart 
                key={ticker}
                ticker={ticker}
                dates={analysisData.dates}
                prices={analysisData.aligned_prices[ticker]}
                trendLines={analysisData.trend_lines[ticker]}
                color={ASSET_COLORS[idx]}
              />
            ))}
          </div>
        </div>
      )}

      {selectedAssets.length < 2 && !loading && (
        <div className="analysis-prompt">
          <div className="prompt-icon">🔬</div>
          <h3>Select at least 2 assets</h3>
          <p>Use the search bar above to add assets for comparison</p>
          <div className="prompt-suggestions">
            <p>Popular comparisons:</p>
            <ul>
              <li>S&P 500 vs BTC vs Gold</li>
              <li>AAPL vs MSFT vs GOOGL</li>
              <li>VIX vs Treasury Yields</li>
              <li>M2 Money Supply vs Bitcoin</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function getCorrelationClass(val) {
  if (val >= 0.7) return 'high-positive'
  if (val >= 0.3) return 'medium-positive'
  if (val >= -0.3) return 'neutral'
  if (val >= -0.7) return 'medium-negative'
  return 'high-negative'
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null
  
  return (
    <div className="analysis-tooltip">
      <div className="tooltip-date">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-row" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span>{p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

function TrendLineChart({ ticker, dates, prices, trendLines, color }) {
  // Prepare chart data - filter valid prices for log scale
  const chartData = dates.map((date, i) => ({
    date,
    price: prices[i] > 0 ? prices[i] : null,
    index: i
  })).filter(d => d.price !== null && d.price > 0)

  if (chartData.length === 0) return null

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Calculate extended trend lines that reach chart borders
  const validPrices = chartData.map(d => d.price).filter(p => p > 0)
  const minPrice = Math.min(...validPrices) * 0.9
  const maxPrice = Math.max(...validPrices) * 1.1
  const totalDays = chartData.length

  const extendLine = (point1, point2) => {
    if (!point1 || !point2) return null
    
    const idx1 = point1.index
    const idx2 = point2.index
    const p1 = point1.price
    const p2 = point2.price
    
    if (idx2 === idx1) return null
    
    const slope = (p2 - p1) / (idx2 - idx1)
    
    // Create line data points
    return chartData.map((d, i) => {
      const linePrice = p1 + slope * (i - idx1)
      return linePrice > 0 ? linePrice : null
    })
  }

  // Add extended trend line data to chart
  const supportLine = trendLines?.support ? extendLine(trendLines.support.point1, trendLines.support.point2) : null
  const resistanceLine = trendLines?.resistance ? extendLine(trendLines.resistance.point1, trendLines.resistance.point2) : null

  const enhancedChartData = chartData.map((d, i) => ({
    ...d,
    support: supportLine ? supportLine[i] : null,
    resistance: resistanceLine ? resistanceLine[i] : null,
  }))

  return (
    <div className="trend-chart-container">
      <div className="trend-chart-header">
        <span className="trend-ticker" style={{ color }}>{ticker}</span>
        {trendLines?.support && (
          <span className="trend-info support">
            ▲ Support: {trendLines.support.point1.date} → {trendLines.support.point2.date}
          </span>
        )}
        {trendLines?.resistance && (
          <span className="trend-info resistance">
            ▼ Resistance: {trendLines.resistance.point1.date} → {trendLines.resistance.point2.date}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={enhancedChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <YAxis 
            scale="log"
            domain={[minPrice, maxPrice]}
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v) => '$' + v.toLocaleString()}
            width={80}
          />
          <Tooltip 
            formatter={(v, name) => {
              if (name === 'price') return ['$' + v?.toLocaleString(), 'Price']
              if (name === 'support') return ['$' + v?.toLocaleString(), 'Support Line']
              if (name === 'resistance') return ['$' + v?.toLocaleString(), 'Resistance Line']
              return [v, name]
            }}
            labelFormatter={formatDate}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            name="Price"
          />
          {supportLine && (
            <Line
              type="monotone"
              dataKey="support"
              stroke="#00ff88"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              name="Support"
              connectNulls
            />
          )}
          {resistanceLine && (
            <Line
              type="monotone"
              dataKey="resistance"
              stroke="#ff4757"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              name="Resistance"
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default AnalysisView
