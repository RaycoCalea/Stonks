import React, { useState, useEffect, useCallback } from 'react'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Area, ComposedChart, Line, ReferenceLine, Legend
} from 'recharts'
import './SentimentView.css'

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#6b7280',
}

function SentimentView({ selectedAssets, onUpdate }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sentimentData, setSentimentData] = useState(null)

  const currentAsset = selectedAssets[activeIndex]

  const analyzeSentiment = useCallback(async () => {
    if (!currentAsset) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: (currentAsset.id || currentAsset.ticker).toUpperCase(),
          asset_type: currentAsset.type
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Sentiment analysis failed' }))
        throw new Error(err.detail)
      }

      const data = await res.json()
      setSentimentData(data)
      onUpdate?.({ type: 'sentiment', query: data.query })
    } catch (err) {
      setError(err.message)
      setSentimentData(null)
    } finally {
      setLoading(false)
    }
  }, [currentAsset, onUpdate])

  // Run analysis when asset changes
  useEffect(() => {
    if (currentAsset) {
      analyzeSentiment()
    } else {
      setSentimentData(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssets.length, activeIndex])

  // Reset active index when assets change
  useEffect(() => {
    if (selectedAssets.length > 0 && activeIndex >= selectedAssets.length) {
      setActiveIndex(0)
    }
  }, [selectedAssets, activeIndex])

  const getSentimentIcon = (label) => {
    switch (label) {
      case 'positive': return '🟢'
      case 'negative': return '🔴'
      default: return '⚪'
    }
  }

  const getSentimentEmoji = (overall) => {
    switch (overall) {
      case 'VERY BULLISH': return '🚀'
      case 'BULLISH': return '🐂'
      case 'VERY BEARISH': return '💀'
      case 'BEARISH': return '🐻'
      default: return '😐'
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'IMPROVING': return '📈'
      case 'DETERIORATING': return '📉'
      default: return '➡️'
    }
  }

  const pieData = sentimentData ? [
    { name: 'Positive', value: sentimentData.aggregate.positive_count, color: SENTIMENT_COLORS.positive },
    { name: 'Negative', value: sentimentData.aggregate.negative_count, color: SENTIMENT_COLORS.negative },
    { name: 'Neutral', value: sentimentData.aggregate.neutral_count, color: SENTIMENT_COLORS.neutral },
  ].filter(d => d.value > 0) : []

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      })
    } catch {
      return dateStr
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getCumulativeColor = (value) => {
    if (value > 0) return '#22c55e'
    if (value < 0) return '#ef4444'
    return '#6b7280'
  }

  return (
    <div className="sentiment-view">
      {/* Controls */}
      <div className="sentiment-controls">
        <div className="sentiment-header">
          <h3 className="section-title">📰 SENTIMENT ANALYSIS</h3>
          <span className="scan-info">30-day lookback • 8+ sources</span>
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

        <div className="info-text">
          💡 Scans Google News, Yahoo Finance, Reddit, StockTwits, Finviz, Seeking Alpha & more.
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
          <span>SCANNING NEWS SOURCES...</span>
        </div>
      )}

      {selectedAssets.length === 0 && !loading && (
        <div className="sentiment-prompt">
          <div className="prompt-icon">📰</div>
          <h3>Select an asset above</h3>
          <p>Use the search bar to select an asset for sentiment analysis</p>
          <div className="feature-list">
            <div className="feature">🔍 Search by ticker or keyword</div>
            <div className="feature">📈 Cumulative +1/-1 scoring</div>
            <div className="feature">📊 Sentiment timeline & trends</div>
            <div className="feature">🐂 / 🐻 Bullish/Bearish signals</div>
          </div>
          <div className="source-list">
            <span className="source-tag">Google News</span>
            <span className="source-tag">Yahoo Finance</span>
            <span className="source-tag">Reddit</span>
            <span className="source-tag">StockTwits</span>
            <span className="source-tag">Finviz</span>
            <span className="source-tag">Seeking Alpha</span>
          </div>
        </div>
      )}

      {sentimentData && !loading && (
        <div className="sentiment-results">
          {/* Overall Sentiment */}
          <div className="overall-sentiment">
            <div className="sentiment-hero">
              <span className="sentiment-emoji">{getSentimentEmoji(sentimentData.aggregate.overall)}</span>
              <div className="sentiment-info">
                <span className="sentiment-label">{sentimentData.aggregate.overall}</span>
                <span className="sentiment-signal">
                  Signal: <strong className={sentimentData.aggregate.signal.toLowerCase().replace(' ', '-')}>
                    {sentimentData.aggregate.signal}
                  </strong>
                </span>
              </div>
              <div className="sentiment-score">
                <span className="score-value">{(sentimentData.aggregate.weighted_score * 100).toFixed(0)}%</span>
                <span className="score-label">Weighted Score</span>
              </div>
              <div className="cumulative-score">
                <span 
                  className="cumulative-value" 
                  style={{ color: getCumulativeColor(sentimentData.aggregate.cumulative_score) }}
                >
                  {sentimentData.aggregate.cumulative_score > 0 ? '+' : ''}{sentimentData.aggregate.cumulative_score}
                </span>
                <span className="score-label">Cumulative (+1/-1)</span>
              </div>
              <div className="trend-indicator">
                <span className="trend-icon">{getTrendIcon(sentimentData.aggregate.trend)}</span>
                <span className={`trend-label ${sentimentData.aggregate.trend.toLowerCase()}`}>
                  {sentimentData.aggregate.trend}
                </span>
              </div>
            </div>
          </div>

          {/* Sources */}
          {sentimentData.sources_scanned && (
            <div className="sources-info">
              <span className="sources-label">📡 Sources:</span>
              {sentimentData.sources_scanned.map((src, i) => (
                <span key={i} className="source-badge">{src}</span>
              ))}
            </div>
          )}

          {/* Stats Grid */}
          <div className="sentiment-stats">
            <div className="stat-card positive">
              <span className="stat-icon">🟢</span>
              <span className="stat-value">{sentimentData.aggregate.positive_count}</span>
              <span className="stat-label">Positive (+1)</span>
            </div>
            <div className="stat-card negative">
              <span className="stat-icon">🔴</span>
              <span className="stat-value">{sentimentData.aggregate.negative_count}</span>
              <span className="stat-label">Negative (-1)</span>
            </div>
            <div className="stat-card neutral">
              <span className="stat-icon">⚪</span>
              <span className="stat-value">{sentimentData.aggregate.neutral_count}</span>
              <span className="stat-label">Neutral (0)</span>
            </div>
            <div className="stat-card total">
              <span className="stat-icon">📰</span>
              <span className="stat-value">{sentimentData.articles_analyzed}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-card cumulative">
              <span className="stat-icon">📊</span>
              <span 
                className="stat-value"
                style={{ color: getCumulativeColor(sentimentData.aggregate.cumulative_score) }}
              >
                {sentimentData.aggregate.cumulative_score > 0 ? '+' : ''}{sentimentData.aggregate.cumulative_score}
              </span>
              <span className="stat-label">Net Score</span>
            </div>
          </div>

          {/* Cumulative Sentiment Timeline */}
          {sentimentData.timeline && sentimentData.timeline.length > 0 && (
            <div className="chart-panel timeline-panel">
              <h4 className="panel-title">📈 CUMULATIVE SENTIMENT (Running +1/-1 Total)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={sentimentData.timeline} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={formatDate} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} width={50} />
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                  <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px' }} labelFormatter={formatDate} />
                  <Legend />
                  <Area type="monotone" dataKey="running_cumulative" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} name="Cumulative Score" />
                  <Bar dataKey="daily_cumulative" name="Daily +/-">
                    {sentimentData.timeline.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.daily_cumulative >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sentiment Score Timeline */}
          {sentimentData.timeline && sentimentData.timeline.length > 0 && (
            <div className="chart-panel timeline-panel">
              <h4 className="panel-title">
                📊 SENTIMENT SCORE OVER TIME
                {sentimentData.aggregate.trend && (
                  <span className={`trend-badge ${sentimentData.aggregate.trend.toLowerCase()}`}>
                    {getTrendIcon(sentimentData.aggregate.trend)} {sentimentData.aggregate.trend}
                  </span>
                )}
              </h4>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={sentimentData.timeline} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="50%" stopColor="#6b7280" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={formatDate} />
                  <YAxis domain={[-1, 1]} stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} width={50} />
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                  <ReferenceLine y={0.2} stroke="#22c55e" strokeDasharray="2 2" strokeOpacity={0.5} />
                  <ReferenceLine y={-0.2} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.5} />
                  <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="avg_sentiment" stroke="#8b5cf6" fill="url(#sentimentGradient)" strokeWidth={2} name="Daily Sentiment" dot={{ fill: '#8b5cf6', r: 3 }} />
                  {sentimentData.timeline[0]?.rolling_avg_7d !== undefined && (
                    <Line type="monotone" dataKey="rolling_avg_7d" stroke="#ff6b00" strokeWidth={2} dot={false} name="7-Day Moving Avg" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie Chart */}
          {pieData.length > 0 && (
            <div className="chart-panel">
              <h4 className="panel-title">📊 SENTIMENT DISTRIBUTION</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* News Feed */}
          <div className="news-panel">
            <h4 className="panel-title">📰 NEWS TIMELINE (Newest First)</h4>
            <div className="news-timeline">
              {sentimentData.news.map((article, i) => {
                const score = article.sentiment?.score || 0
                const label = article.sentiment?.label || 'neutral'
                const scorePercent = (score * 100).toFixed(0)
                const barWidth = Math.abs(score) * 50
                const cumulativePoint = label === 'positive' ? '+1' : label === 'negative' ? '-1' : '0'
                const pointColor = label === 'positive' ? '#22c55e' : label === 'negative' ? '#ef4444' : '#6b7280'
                
                return (
                  <div key={i} className={`timeline-item ${label}`}>
                    <div className="timeline-marker">
                      <span className="timeline-date">{article.date || formatTime(article.published)}</span>
                      <div className="timeline-dot"></div>
                      <span className="cumulative-point" style={{ color: pointColor }}>{cumulativePoint}</span>
                    </div>
                    <div className="timeline-content">
                      <div className="news-header">
                        <span className="news-sentiment">{getSentimentIcon(label)}</span>
                        <span className="news-source">{article.source}</span>
                        <span className={`sentiment-score-badge ${label}`}>{score >= 0 ? '+' : ''}{scorePercent}%</span>
                      </div>
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="news-title">{article.title}</a>
                      <div className="sentiment-bar-container">
                        <div className={`sentiment-bar ${label}`} style={{ width: `${barWidth}%` }} />
                      </div>
                      {article.sentiment?.positive_words?.length > 0 && (
                        <div className="news-words positive">+{article.sentiment.positive_words.slice(0, 5).join(', ')}</div>
                      )}
                      {article.sentiment?.negative_words?.length > 0 && (
                        <div className="news-words negative">−{article.sentiment.negative_words.slice(0, 5).join(', ')}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SentimentView
