import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, ComposedChart, Bar
} from 'recharts'
import './MacroView.css'

const ASSET_COLORS = [
  '#00ff88', '#ff6b00', '#00d4ff', '#ff4757', '#ffa502',
  '#2ed573', '#1e90ff', '#ff6348', '#7bed9f', '#70a1ff',
  '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'
]

const LOOKBACK_PERIODS = [
  { value: '5y', label: '5 Years' },
  { value: '10y', label: '10 Years' },
  { value: '20y', label: '20 Years' },
  { value: 'max', label: 'Max Available' },
]

const ASSET_CLASSES = [
  { id: 'all', label: 'ALL' },
  { id: 'stocks', label: 'STOCKS' },
  { id: 'crypto', label: 'CRYPTO' },
  { id: 'commodities', label: 'COMMODITIES' },
  { id: 'forex', label: 'FOREX' },
  { id: 'treasury', label: 'TREASURY' },
  { id: 'macro', label: 'MACRO' },
]

const ASSETS_PER_PAGE = 30

function MacroView({ selectedAssets, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [macroData, setMacroData] = useState(null)
  const [lookbackPeriod, setLookbackPeriod] = useState('10y')
  const [selectedClass, setSelectedClass] = useState('all')
  const [showTrends, setShowTrends] = useState(true)
  const [heatmapTooltip, setHeatmapTooltip] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [assetPage, setAssetPage] = useState(1)

  const runMacroAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    setProgress({ stage: 'Initializing...', percent: 0 })

    try {
      const res = await fetch('/api/macro/deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lookback_period: lookbackPeriod,
          asset_class_filter: selectedClass !== 'all' ? selectedClass : null,
          include_user_assets: selectedAssets.map(a => ({
            type: a.type,
            ticker: a.id || a.ticker
          }))
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Macro analysis failed' }))
        throw new Error(err.detail)
      }

      const data = await res.json()
      setMacroData(data)
      setProgress(null)
      onUpdate?.({ type: 'macro', assets_analyzed: data.assets_analyzed })
    } catch (err) {
      setError(err.message)
      setMacroData(null)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }, [lookbackPeriod, selectedClass, selectedAssets, onUpdate])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  const formatValue = (v) => {
    if (v === undefined || v === null) return 'N/A'
    if (Math.abs(v) >= 1e12) return (v / 1e12).toFixed(2) + 'T'
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B'
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M'
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + 'K'
    return v.toFixed(2)
  }

  const formatPct = (v) => {
    if (v === undefined || v === null) return 'N/A'
    return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
  }

  const getTrendClass = (trend) => {
    if (!trend) return ''
    if (trend === 'STRONG_UP') return 'trend-strong-up'
    if (trend === 'UP') return 'trend-up'
    if (trend === 'STRONG_DOWN') return 'trend-strong-down'
    if (trend === 'DOWN') return 'trend-down'
    return 'trend-neutral'
  }

  const getHeatmapColor = (value) => {
    // Interpolate between red (-1) -> gray (0) -> green (+1)
    if (value === undefined || value === null || isNaN(value)) return '#1a1f26'
    
    const v = Math.max(-1, Math.min(1, value))
    
    if (v >= 0) {
      // Green scale: 0 = gray, 1 = bright green
      const intensity = Math.floor(v * 180)
      return `rgb(${30 - v * 30}, ${60 + intensity}, ${50 + v * 30})`
    } else {
      // Red scale: -1 = bright red, 0 = gray
      const intensity = Math.floor(Math.abs(v) * 180)
      return `rgb(${60 + intensity}, ${30 + Math.abs(v) * 20}, ${50 - Math.abs(v) * 30})`
    }
  }

  return (
    <div className="macro-view">
      {/* Controls */}
      <div className="macro-controls">
        <div className="macro-header">
          <h3 className="section-title">MACRO DEEP DIVE ANALYSIS</h3>
          <span className="macro-info">Long-term data extraction and trend analysis</span>
        </div>

        <div className="control-row">
          <div className="control-group">
            <span className="control-label">LOOKBACK:</span>
            {LOOKBACK_PERIODS.map(p => (
              <button
                key={p.value}
                className={`control-btn ${lookbackPeriod === p.value ? 'active' : ''}`}
                onClick={() => setLookbackPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-row">
          <div className="control-group">
            <span className="control-label">ASSET CLASS:</span>
            {ASSET_CLASSES.map(c => (
              <button
                key={c.id}
                className={`control-btn ${selectedClass === c.id ? 'active' : ''}`}
                onClick={() => setSelectedClass(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="action-row">
          <button 
            className="run-btn" 
            onClick={runMacroAnalysis}
            disabled={loading}
          >
            {loading ? 'ANALYZING...' : 'RUN MACRO ANALYSIS'}
          </button>
          <label className="toggle-label">
            <input 
              type="checkbox" 
              checked={showTrends}
              onChange={(e) => setShowTrends(e.target.checked)}
            />
            Show Trend Indicators
          </label>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      {loading && progress && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span className="loading-stage">{progress.stage}</span>
          {progress.percent > 0 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
            </div>
          )}
        </div>
      )}

      {!macroData && !loading && (
        <div className="macro-prompt">
          <div className="prompt-icon">M</div>
          <h3>Macro Deep Dive Analysis</h3>
          <p>Extract and analyze long-term data across all asset classes</p>
          <div className="feature-list">
            <div className="feature">Historical data up to 20+ years</div>
            <div className="feature">Cross-asset class correlations</div>
            <div className="feature">Trend identification and regime analysis</div>
            <div className="feature">Export to Parquet for further analysis</div>
          </div>
          <p className="warning-text">
            Note: This analysis may take several minutes due to rate limiting protections
          </p>
        </div>
      )}

      {macroData && !loading && (
        <div className="macro-results">
          {/* Summary Panel */}
          <div className="summary-panel">
            <h4 className="panel-title">ANALYSIS SUMMARY</h4>
            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-label">Assets Analyzed</span>
                <span className="summary-value">{macroData.assets_analyzed}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Data Points</span>
                <span className="summary-value">{formatValue(macroData.total_data_points)}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Date Range</span>
                <span className="summary-value">{macroData.date_range?.start} - {macroData.date_range?.end}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Parquet File</span>
                <span className="summary-value file">{macroData.parquet_file || 'Generated'}</span>
              </div>
            </div>
          </div>

          {/* Asset Class Performance */}
          <div className="performance-panel">
            <h4 className="panel-title">ASSET CLASS PERFORMANCE</h4>
            <div className="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Asset Class</th>
                    <th>Count</th>
                    <th>Avg Return</th>
                    <th>Avg Volatility</th>
                    <th>Best Performer</th>
                    <th>Worst Performer</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {macroData.class_summary && Object.entries(macroData.class_summary).map(([cls, data]) => (
                    <tr key={cls}>
                      <td className="class-name">{cls.toUpperCase()}</td>
                      <td>{data.count}</td>
                      <td className={data.avg_return >= 0 ? 'positive' : 'negative'}>
                        {formatPct(data.avg_return)}
                      </td>
                      <td>{data.avg_volatility?.toFixed(2)}%</td>
                      <td className="best">{data.best?.ticker} ({formatPct(data.best?.return)})</td>
                      <td className="worst">{data.worst?.ticker} ({formatPct(data.worst?.return)})</td>
                      <td className={getTrendClass(data.trend)}>{data.trend || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Asset Details with Pagination */}
          <div className="assets-panel">
            <div className="assets-header">
              <h4 className="panel-title">INDIVIDUAL ASSET ANALYSIS ({macroData.assets?.length || 0} assets)</h4>
              {macroData.assets?.length > ASSETS_PER_PAGE && (
                <div className="pagination">
                  <button 
                    className="page-btn"
                    disabled={assetPage === 1}
                    onClick={() => setAssetPage(p => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <span className="page-info">
                    Page {assetPage} of {Math.ceil(macroData.assets.length / ASSETS_PER_PAGE)}
                  </span>
                  <button 
                    className="page-btn"
                    disabled={assetPage >= Math.ceil(macroData.assets.length / ASSETS_PER_PAGE)}
                    onClick={() => setAssetPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
            <div className="assets-table">
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Data Points</th>
                    <th>Start Date</th>
                    <th>Total Return</th>
                    <th>CAGR</th>
                    <th>Volatility</th>
                    <th>Sharpe</th>
                    <th>Max DD</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {macroData.assets
                    ?.slice((assetPage - 1) * ASSETS_PER_PAGE, assetPage * ASSETS_PER_PAGE)
                    .map((asset, i) => (
                    <tr key={asset.ticker}>
                      <td className="ticker" style={{ color: ASSET_COLORS[(i + (assetPage - 1) * ASSETS_PER_PAGE) % ASSET_COLORS.length] }}>
                        {asset.ticker}
                      </td>
                      <td className="name">{asset.name || '-'}</td>
                      <td className="class-tag">{asset.asset_class}</td>
                      <td>{asset.data_points}</td>
                      <td>{asset.start_date}</td>
                      <td className={asset.total_return >= 0 ? 'positive' : 'negative'}>
                        {formatPct(asset.total_return)}
                      </td>
                      <td className={asset.cagr >= 0 ? 'positive' : 'negative'}>
                        {formatPct(asset.cagr)}
                      </td>
                      <td>{asset.volatility?.toFixed(2)}%</td>
                      <td className={asset.sharpe_ratio >= 0 ? 'positive' : 'negative'}>
                        {asset.sharpe_ratio?.toFixed(3)}
                      </td>
                      <td className="negative">-{asset.max_drawdown?.toFixed(2)}%</td>
                      <td className={getTrendClass(asset.trend)}>{asset.trend || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cross-Class Analysis Summary */}
          {macroData.cross_class_pairs_count > 0 && (
            <div className="analysis-summary-panel">
              <h4 className="panel-title">CROSS-CLASS ANALYSIS</h4>
              <div className="analysis-stats">
                <div className="stat-item">
                  <span className="stat-value">{macroData.cross_class_pairs_count}</span>
                  <span className="stat-label">Cross-Class Pairs</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{macroData.leading_indicators?.length || 0}</span>
                  <span className="stat-label">Leading Indicators</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{macroData.crash_correlations?.length || 0}</span>
                  <span className="stat-label">Crash Correlated</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{macroData.regime_dependent?.length || 0}</span>
                  <span className="stat-label">Regime Dependent</span>
                </div>
              </div>
            </div>
          )}

          {/* Leading Indicators - Assets that predict others */}
          {macroData.leading_indicators && macroData.leading_indicators.length > 0 && (
            <div className="category-panel leading-panel">
              <h4 className="panel-title">LEADING INDICATORS</h4>
              <div className="correlation-note">
                Assets where one appears to lead the other by days - potential predictive signals
              </div>
              <div className="category-grid">
                {macroData.leading_indicators.slice(0, 8).map((pair, i) => (
                  <div key={i} className="category-card leading">
                    <div className="card-header">
                      <span className="asset-ticker">{pair.leads === 'asset1' ? pair.asset1 : pair.asset2}</span>
                      <span className="leads-arrow">--&gt;</span>
                      <span className="asset-ticker">{pair.leads === 'asset1' ? pair.asset2 : pair.asset1}</span>
                    </div>
                    <div className="card-detail">
                      <span className="detail-label">Lag:</span>
                      <span className="detail-value">{Math.abs(pair.optimal_lag || 0)} days</span>
                    </div>
                    <div className="card-detail">
                      <span className="detail-label">Lag Corr:</span>
                      <span className={`detail-value ${pair.lag_corr >= 0 ? 'positive' : 'negative'}`}>
                        {pair.lag_corr?.toFixed(3)}
                      </span>
                    </div>
                    <div className="card-classes">
                      <span className="class-badge">{pair.class1}</span>
                      <span className="class-badge">{pair.class2}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crash Correlations - Assets that crash together */}
          {macroData.crash_correlations && macroData.crash_correlations.length > 0 && (
            <div className="category-panel crash-panel">
              <h4 className="panel-title">CRASH CORRELATIONS</h4>
              <div className="correlation-note">
                Assets that tend to crash together - important for risk management
              </div>
              <div className="category-grid">
                {macroData.crash_correlations.slice(0, 8).map((pair, i) => (
                  <div key={i} className="category-card crash">
                    <div className="card-header">
                      <span className="asset-ticker">{pair.asset1}</span>
                      <span className="crash-icon">X</span>
                      <span className="asset-ticker">{pair.asset2}</span>
                    </div>
                    <div className="card-detail">
                      <span className="detail-label">Left Tail:</span>
                      <span className="detail-value negative">{(pair.left_tail * 100)?.toFixed(1)}%</span>
                    </div>
                    <div className="card-detail">
                      <span className="detail-label">Right Tail:</span>
                      <span className="detail-value positive">{(pair.right_tail * 100)?.toFixed(1)}%</span>
                    </div>
                    <div className="card-classes">
                      <span className="class-badge">{pair.class1}</span>
                      <span className="class-badge">{pair.class2}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Surprising Correlations - Cross-Asset Class Relationships */}
          {macroData.surprising_correlations && macroData.surprising_correlations.length > 0 && (
            <div className="surprising-panel">
              <h4 className="panel-title">HIGHEST SURPRISE SCORE (Cross-Class)</h4>
              <div className="correlation-note">
                Strongest unexpected correlations between different asset classes
              </div>
              <div className="surprising-grid">
                {macroData.surprising_correlations.slice(0, 12).map((pair, i) => (
                  <div key={i} className={`surprising-card ${pair.pearson >= 0 ? 'positive' : 'negative'}`}>
                    <div className="surprising-assets">
                      <span className="asset-ticker">{pair.asset1}</span>
                      <span className="vs">vs</span>
                      <span className="asset-ticker">{pair.asset2}</span>
                    </div>
                    <div className="surprising-classes">
                      <span className="class-badge">{pair.class1}</span>
                      <span className="class-badge">{pair.class2}</span>
                    </div>
                    <div className="surprising-value">
                      <span className="corr-type">Pearson:</span>
                      <span className={`corr-value ${pair.pearson >= 0 ? 'positive' : 'negative'}`}>
                        {pair.pearson?.toFixed(3)}
                      </span>
                    </div>
                    <div className="surprising-value">
                      <span className="corr-type">Type:</span>
                      <span className="corr-value relationship-type">
                        {pair.relationship_type?.replace(/_/g, ' ') || 'LINEAR'}
                      </span>
                    </div>
                    {pair.optimal_lag !== 0 && (
                      <div className="surprising-value">
                        <span className="corr-type">Lead:</span>
                        <span className="corr-value">
                          {pair.leads === 'asset1' ? pair.asset1 : pair.asset2} by {Math.abs(pair.optimal_lag)}d
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correlation Heatmap */}
          {macroData.heatmap && macroData.heatmap.cells && (
            <div className="heatmap-panel">
              <h4 className="panel-title">CORRELATION HEATMAP ({macroData.heatmap.size}x{macroData.heatmap.size})</h4>
              
              <div className="heatmap-container">
                <div 
                  className="heatmap-grid" 
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: `repeat(${macroData.heatmap.size}, 1fr)`,
                    gap: '1px',
                    maxWidth: '100%',
                    aspectRatio: '1'
                  }}
                  onMouseLeave={() => setHeatmapTooltip(null)}
                >
                  {macroData.heatmap.cells.map((cell, i) => (
                    <div
                      key={i}
                      className={`heatmap-cell ${heatmapTooltip && heatmapTooltip.ticker1 === cell.ticker1 && heatmapTooltip.ticker2 === cell.ticker2 ? 'active' : ''}`}
                      style={{
                        backgroundColor: getHeatmapColor(cell.value),
                        aspectRatio: '1'
                      }}
                      onMouseEnter={(e) => {
                        setHeatmapTooltip(cell)
                        setTooltipPosition({ x: e.clientX, y: e.clientY })
                      }}
                      onMouseMove={(e) => {
                        setTooltipPosition({ x: e.clientX, y: e.clientY })
                      }}
                    />
                  ))}
                </div>
                <div className="heatmap-legend">
                  <span className="legend-label">-1.0 (Anti-correlated)</span>
                  <div className="legend-gradient" />
                  <span className="legend-label">+1.0 (Correlated)</span>
                </div>
              </div>
              
              {/* Floating Tooltip Popup */}
              {heatmapTooltip && (
                <div 
                  className="heatmap-floating-tooltip"
                  style={{
                    position: 'fixed',
                    left: tooltipPosition.x + 15,
                    top: tooltipPosition.y + 15,
                    zIndex: 9999,
                    pointerEvents: 'none'
                  }}
                >
                  <div className="floating-header">
                    <div className="floating-asset">
                      <span className="floating-ticker">{heatmapTooltip.ticker1}</span>
                      {heatmapTooltip.name1 && <span className="floating-name">{heatmapTooltip.name1}</span>}
                      <span className="floating-class">{heatmapTooltip.class1}</span>
                    </div>
                    <span className="floating-vs">vs</span>
                    <div className="floating-asset">
                      <span className="floating-ticker">{heatmapTooltip.ticker2}</span>
                      {heatmapTooltip.name2 && <span className="floating-name">{heatmapTooltip.name2}</span>}
                      <span className="floating-class">{heatmapTooltip.class2}</span>
                    </div>
                  </div>
                  <div className="floating-divider" />
                  <div className="floating-correlation">
                    <span className="floating-label">PEARSON CORRELATION</span>
                    <span className={`floating-value ${heatmapTooltip.value >= 0 ? 'positive' : 'negative'}`}>
                      {heatmapTooltip.value >= 0 ? '+' : ''}{heatmapTooltip.value.toFixed(4)}
                    </span>
                  </div>
                  <div className="floating-stats">
                    <div className="floating-stat">
                      <span className="stat-label">Strength</span>
                      <span className={`stat-value ${
                        Math.abs(heatmapTooltip.value) > 0.7 ? 'strong' : 
                        Math.abs(heatmapTooltip.value) > 0.4 ? 'moderate' : 'weak'
                      }`}>
                        {Math.abs(heatmapTooltip.value) > 0.7 ? 'STRONG' : 
                         Math.abs(heatmapTooltip.value) > 0.4 ? 'MODERATE' : 
                         Math.abs(heatmapTooltip.value) > 0.2 ? 'WEAK' : 'NEGLIGIBLE'}
                      </span>
                    </div>
                    <div className="floating-stat">
                      <span className="stat-label">Direction</span>
                      <span className={`stat-value ${heatmapTooltip.value >= 0 ? 'positive' : 'negative'}`}>
                        {heatmapTooltip.value >= 0 ? 'POSITIVE' : 'INVERSE'}
                      </span>
                    </div>
                    <div className="floating-stat">
                      <span className="stat-label">Cross-Class</span>
                      <span className={`stat-value ${heatmapTooltip.class1 !== heatmapTooltip.class2 ? 'highlight' : ''}`}>
                        {heatmapTooltip.class1 !== heatmapTooltip.class2 ? 'YES' : 'SAME CLASS'}
                      </span>
                    </div>
                  </div>
                  {heatmapTooltip.spearman && (
                    <div className="floating-extra">
                      <div className="extra-row">
                        <span>Spearman:</span>
                        <span>{heatmapTooltip.spearman?.toFixed(3)}</span>
                      </div>
                      {heatmapTooltip.mutual_info && (
                        <div className="extra-row">
                          <span>Mutual Info:</span>
                          <span>{heatmapTooltip.mutual_info?.toFixed(3)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Global Correlation Pairs */}
          {macroData.correlation_matrix && (
            <div className="correlation-panel">
              <h4 className="panel-title">TOP CORRELATION PAIRS</h4>
              <div className="correlation-note">
                Pearson linear correlation analysis
              </div>
              <div className="correlation-pairs">
                <div className="pairs-section">
                  <h5>Strongest Positive</h5>
                  {macroData.top_correlations?.slice(0, 10).map((pair, i) => (
                    <div key={i} className="pair-item positive">
                      <span className="pair-assets">{pair.asset1} / {pair.asset2}</span>
                      <span className="pair-value">{(pair.pearson || pair.correlation)?.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
                <div className="pairs-section">
                  <h5>Strongest Negative</h5>
                  {macroData.bottom_correlations?.slice(0, 10).map((pair, i) => (
                    <div key={i} className="pair-item negative">
                      <span className="pair-assets">{pair.asset1} / {pair.asset2}</span>
                      <span className="pair-value">{(pair.pearson || pair.correlation)?.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Regime Analysis */}
          {macroData.regime_analysis && (
            <div className="regime-panel">
              <h4 className="panel-title">MARKET REGIME ANALYSIS</h4>
              <div className="regime-grid">
                {Object.entries(macroData.regime_analysis).map(([regime, data]) => (
                  <div key={regime} className={`regime-card ${regime.toLowerCase()}`}>
                    <span className="regime-name">{regime}</span>
                    <span className="regime-periods">{data.periods} periods</span>
                    <span className="regime-duration">Avg: {data.avg_duration} months</span>
                    <div className="regime-returns">
                      <span>Avg Return: </span>
                      <span className={data.avg_return >= 0 ? 'positive' : 'negative'}>
                        {formatPct(data.avg_return)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Normalized Price Chart */}
          {macroData.chart_data && macroData.chart_data.length > 0 && (
            <div className="chart-panel">
              <h4 className="panel-title">NORMALIZED PERFORMANCE (Base = 100)</h4>
              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={macroData.chart_data} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
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
                    scale="log"
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    formatter={(v, name) => [v?.toFixed(2), name]}
                    labelFormatter={formatDate}
                    contentStyle={{ background: '#0d1117', border: '1px solid #30363d' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  {macroData.tickers?.slice(0, 10).map((ticker, i) => (
                    <Line
                      key={ticker}
                      type="monotone"
                      dataKey={ticker}
                      stroke={ASSET_COLORS[i % ASSET_COLORS.length]}
                      strokeWidth={1.5}
                      dot={false}
                      name={ticker}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Export Section */}
          <div className="export-panel">
            <h4 className="panel-title">DATA EXPORT</h4>
            <p>Full dataset has been saved to: <code>{macroData.parquet_file || 'macro_data.parquet'}</code></p>
            <p className="export-note">
              The Parquet file contains {formatValue(macroData.total_data_points)} data points across 
              {' '}{macroData.assets_analyzed} assets for advanced analysis in Python, Pandas, or other tools.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MacroView

