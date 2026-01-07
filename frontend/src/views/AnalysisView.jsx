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
          <h3 className="section-title">MULTI-ASSET ANALYSIS</h3>
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
          <span className="error-icon">!</span>
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
            <h3 className="panel-title">COMPREHENSIVE STATISTICS</h3>
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
            <h3 className="panel-title">CORRELATION MATRIX</h3>
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
            <h3 className="panel-title">NORMALIZED PRICES (Base = 100)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={analysisData.chart_data} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
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
                    width={70}
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
            <h3 className="panel-title">TREND LINES (Support & Resistance)</h3>
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

          {/* Drawdown Comparison Chart */}
          <div className="chart-panel">
            <h3 className="panel-title">DRAWDOWN COMPARISON</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analysisData.chart_data} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
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
                    tickFormatter={(v) => `-${Math.abs(v).toFixed(0)}%`}
                    width={60}
                    domain={[0, 'dataMax']}
                    reversed
                  />
                  <Tooltip 
                    formatter={(v, name) => [`-${Math.abs(v).toFixed(2)}%`, name.replace('_dd', '')]}
                    labelFormatter={(l) => l}
                    contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }}
                  />
                  <Legend 
                    formatter={(value) => <span style={{ color: '#c9d1d9' }}>{value.replace('_dd', '')}</span>}
                  />
                  {analysisData.tickers.map((ticker, i) => (
                    <Line
                      key={`${ticker}_dd`}
                      type="monotone"
                      dataKey={`${ticker}_dd`}
                      stroke={ASSET_COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                      name={`${ticker}_dd`}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rolling Volatility Chart */}
          <div className="chart-panel">
            <h3 className="panel-title">ROLLING VOLATILITY (20-Day)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analysisData.chart_data} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
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
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    width={60}
                  />
                  <Tooltip 
                    formatter={(v, name) => [`${(v * 100).toFixed(2)}%`, name.replace('_vol', ' Vol')]}
                    labelFormatter={(l) => l}
                    contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }}
                  />
                  <Legend 
                    formatter={(value) => <span style={{ color: '#c9d1d9' }}>{value.replace('_vol', ' Volatility')}</span>}
                  />
                  {analysisData.tickers.map((ticker, i) => (
                    <Line
                      key={`${ticker}_vol`}
                      type="monotone"
                      dataKey={`${ticker}_vol`}
                      stroke={ASSET_COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                      name={`${ticker}_vol`}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rolling Correlation Chart */}
          {analysisData.rolling_correlations && Object.keys(analysisData.rolling_correlations).length > 0 && (
            <div className="chart-panel">
              <h3 className="panel-title">ROLLING CORRELATION (20-Day)</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analysisData.chart_data} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
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
                      domain={[-1, 1]}
                      tickFormatter={(v) => v.toFixed(1)}
                      width={40}
                    />
                    <Tooltip 
                      formatter={(v, name) => [v?.toFixed(3), name.replace('corr_', '').replace('_vs_', ' vs ')]}
                      labelFormatter={(l) => l}
                      contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }}
                    />
                    <Legend 
                      formatter={(value) => <span style={{ color: '#c9d1d9' }}>{value.replace('corr_', '').replace('_vs_', ' vs ')}</span>}
                    />
                    {Object.keys(analysisData.rolling_correlations).map((key, i) => (
                      <Line
                        key={`corr_${key}`}
                        type="monotone"
                        dataKey={`corr_${key}`}
                        stroke={ASSET_COLORS[i % ASSET_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        name={`corr_${key}`}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Risk Comparison Panel */}
          <div className="risk-comparison-panel">
            <h3 className="panel-title">RISK-ADJUSTED PERFORMANCE RANKING</h3>
            <div className="ranking-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Asset</th>
                    <th>Return</th>
                    <th>Volatility</th>
                    <th>Sharpe</th>
                    <th>Sortino</th>
                    <th>Max DD</th>
                    <th>Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisData.tickers
                    .map((ticker, i) => ({
                      ticker,
                      color: ASSET_COLORS[i],
                      ...analysisData.statistics[ticker]
                    }))
                    .sort((a, b) => (b.sharpe_ratio || 0) - (a.sharpe_ratio || 0))
                    .map((asset, rank) => (
                      <tr key={asset.ticker}>
                        <td className="rank">{rank + 1}</td>
                        <td style={{ color: asset.color }}>{asset.ticker}</td>
                        <td className={asset.total_return >= 0 ? 'positive' : 'negative'}>
                          {asset.total_return?.toFixed(2)}%
                        </td>
                        <td>{asset.volatility?.toFixed(2)}%</td>
                        <td className={asset.sharpe_ratio >= 0 ? 'positive' : 'negative'}>
                          {asset.sharpe_ratio?.toFixed(3)}
                        </td>
                        <td className={asset.sortino_ratio >= 0 ? 'positive' : 'negative'}>
                          {asset.sortino_ratio?.toFixed(3)}
                        </td>
                        <td className="negative">-{asset.max_drawdown?.toFixed(2)}%</td>
                        <td className={getRiskClass(asset.volatility)}>
                          {getRiskLabel(asset.volatility)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedAssets.length < 2 && !loading && (
        <div className="analysis-prompt">
          <div className="prompt-icon">+</div>
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

function getRiskClass(volatility) {
  if (!volatility) return 'unknown'
  if (volatility < 15) return 'low-risk'
  if (volatility < 30) return 'medium-risk'
  if (volatility < 50) return 'high-risk'
  return 'extreme-risk'
}

function getRiskLabel(volatility) {
  if (!volatility) return 'N/A'
  if (volatility < 15) return 'LOW'
  if (volatility < 30) return 'MEDIUM'
  if (volatility < 50) return 'HIGH'
  return 'EXTREME'
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

  // Calculate price bounds from actual prices
  const validPrices = chartData.map(d => d.price).filter(p => p > 0)
  let minPrice = Math.min(...validPrices)
  let maxPrice = Math.max(...validPrices)

  // Create straight trend line from two points, extended across entire chart
  const createStraightLine = (lineData) => {
    if (!lineData || !lineData.point1 || !lineData.point2) return { values: null, extents: null }
    
    const p1 = lineData.point1
    const p2 = lineData.point2
    
    if (p2.index === p1.index) return { values: null, extents: null }
    
    // Calculate slope in index space
    const slope = (p2.price - p1.price) / (p2.index - p1.index)
    
    // Calculate the line values across all chart data points
    const lineValues = chartData.map((d) => {
      const linePrice = p1.price + slope * (d.index - p1.index)
      // Only return positive values (needed for log scale)
      return linePrice > 0 ? linePrice : null
    })
    
    // Get the min/max of the line for domain expansion
    const validLineValues = lineValues.filter(v => v !== null && v > 0)
    const lineMin = validLineValues.length > 0 ? Math.min(...validLineValues) : null
    const lineMax = validLineValues.length > 0 ? Math.max(...validLineValues) : null
    
    return { values: lineValues, extents: { min: lineMin, max: lineMax } }
  }

  // Generate trend line data
  const supportResult = createStraightLine(trendLines?.support)
  const resistanceResult = createStraightLine(trendLines?.resistance)
  
  const supportLine = supportResult.values
  const resistanceLine = resistanceResult.values

  // Expand domain to include trend lines
  if (supportResult.extents?.min) minPrice = Math.min(minPrice, supportResult.extents.min)
  if (supportResult.extents?.max) maxPrice = Math.max(maxPrice, supportResult.extents.max)
  if (resistanceResult.extents?.min) minPrice = Math.min(minPrice, resistanceResult.extents.min)
  if (resistanceResult.extents?.max) maxPrice = Math.max(maxPrice, resistanceResult.extents.max)
  
  // Add some padding to the domain
  minPrice = minPrice * 0.95
  maxPrice = maxPrice * 1.05

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
            Support: ${trendLines.support.point1.price?.toFixed(2)} - ${trendLines.support.point2.price?.toFixed(2)}
          </span>
        )}
        {trendLines?.resistance && (
          <span className="trend-info resistance">
            Resistance: ${trendLines.resistance.point1.price?.toFixed(2)} - ${trendLines.resistance.point2.price?.toFixed(2)}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={enhancedChartData} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            scale="log"
            domain={[minPrice, maxPrice]}
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v) => '$' + v?.toLocaleString()}
            width={70}
          />
          <Tooltip 
            formatter={(v, name) => {
              if (name === 'Price') return ['$' + v?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 'Price']
              if (name === 'Support') return ['$' + v?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 'Support']
              if (name === 'Resistance') return ['$' + v?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 'Resistance']
              return [v, name]
            }}
            labelFormatter={formatDate}
            contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }}
          />
          <Legend />
          <Line
            type="linear"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            name="Price"
          />
          {supportLine && (
            <Line
              type="linear"
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
              type="linear"
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
