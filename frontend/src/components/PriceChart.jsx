import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar
} from 'recharts'
import './PriceChart.css'

function PriceChart({ data, assetType }) {
  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="chart-panel empty">
        <span>NO HISTORICAL DATA AVAILABLE</span>
      </div>
    )
  }

  // Format data - handle different field names from various sources
  const chartData = data.data.map((point, index) => {
    // Get date (could be Date, timestamp, or datetime)
    const dateVal = point.Date || point.date || point.Datetime || point.timestamp || ''
    
    // Get price (could be Close, close, or price)
    const priceVal = point.Close ?? point.close ?? point.price ?? null
    
    // Get volume
    const volumeVal = point.Volume ?? point.volume ?? null
    
    return {
      date: dateVal,
      price: priceVal,
      open: point.Open ?? point.open ?? null,
      high: point.High ?? point.high ?? null,
      low: point.Low ?? point.low ?? null,
      volume: volumeVal,
      marketCap: point.market_cap ?? null
    }
  }).filter(point => point.price !== null && point.price !== undefined)

  // Handle empty chart data after filtering
  if (chartData.length === 0) {
    return (
      <div className="chart-panel empty">
        <span>NO VALID PRICE DATA FOR CHART</span>
      </div>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatPrice = (value) => {
    if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'K'
    if (value >= 1) return '$' + value.toFixed(2)
    return '$' + value.toFixed(6)
  }

  const formatVolume = (value) => {
    if (!value) return '—'
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B'
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M'
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K'
    return value.toFixed(0)
  }

  const prices = chartData.map(d => d.price).filter(p => p !== null && p !== undefined)
  const minPrice = Math.min(...prices) * 0.98
  const maxPrice = Math.max(...prices) * 1.02
  const priceChange = prices.length > 1 ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0
  const isPositive = priceChange >= 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null

    const point = payload[0].payload

    return (
      <div className="chart-tooltip">
        <div className="tooltip-date">{formatDate(point.date)}</div>
        <div className="tooltip-row">
          <span className="tooltip-label">Price</span>
          <span className="tooltip-value">{formatPrice(point.price)}</span>
        </div>
        {point.open && (
          <>
            <div className="tooltip-row">
              <span className="tooltip-label">Open</span>
              <span className="tooltip-value">{formatPrice(point.open)}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">High</span>
              <span className="tooltip-value">{formatPrice(point.high)}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Low</span>
              <span className="tooltip-value">{formatPrice(point.low)}</span>
            </div>
          </>
        )}
        <div className="tooltip-row">
          <span className="tooltip-label">Volume</span>
          <span className="tooltip-value">{formatVolume(point.volume)}</span>
        </div>
      </div>
    )
  }

  // Calculate additional stats
  const volumes = chartData.map(d => d.volume).filter(v => v !== null && v !== undefined)
  const avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0
  const startPrice = prices[0]
  const endPrice = prices[prices.length - 1]
  const startDate = chartData[0]?.date
  const endDate = chartData[chartData.length - 1]?.date

  return (
    <div className="chart-panel full-width">
      <div className="chart-header">
        <div className="chart-title">
          <span className="chart-icon">#</span>
          <span>PRICE HISTORY</span>
        </div>
        <div className={`chart-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
        </div>
      </div>

      <div className="chart-stats">
        <div className="stat">
          <span className="stat-label">START</span>
          <span className="stat-value">{formatDate(startDate)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">END</span>
          <span className="stat-value">{formatDate(endDate)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">POINTS</span>
          <span className="stat-value">{chartData.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">START PRICE</span>
          <span className="stat-value">{formatPrice(startPrice)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">END PRICE</span>
          <span className="stat-value">{formatPrice(endPrice)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">HIGH</span>
          <span className="stat-value text-positive">{formatPrice(Math.max(...prices))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">LOW</span>
          <span className="stat-value text-negative">{formatPrice(Math.min(...prices))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">AVG VOLUME</span>
          <span className="stat-value">{formatVolume(avgVolume)}</span>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#00ff88' : '#ff4757'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositive ? '#00ff88' : '#ff4757'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#1e2530" 
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={{ stroke: '#6b7280' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[minPrice, maxPrice]}
              tickFormatter={formatPrice}
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={{ stroke: '#6b7280' }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#00ff88' : '#ff4757'}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: isPositive ? '#00ff88' : '#ff4757' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="volume-container">
        <div className="volume-header">VOLUME</div>
        <ResponsiveContainer width="100%" height={100}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tickFormatter={formatVolume}
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 9 }}
              width={70}
            />
            <Bar 
              dataKey="volume" 
              fill="#ff6b00" 
              fillOpacity={0.5}
              radius={[2, 2, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default PriceChart

