import React, { useEffect, useRef, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Bar
} from 'recharts'
import './CandlestickChart.css'

// Try to import lightweight-charts, fallback to recharts if not available
let createChart, ColorType
try {
  const lw = require('lightweight-charts')
  createChart = lw.createChart
  ColorType = lw.ColorType
} catch (e) {
  console.log('[CandlestickChart] Using recharts fallback')
}

function CandlestickChart({ data, assetType, title }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const [chartMode, setChartMode] = useState('line')
  const [useFallback, setUseFallback] = useState(!createChart)

  useEffect(() => {
    if (useFallback || !createChart || !data?.data?.length) return
    if (!chartContainerRef.current) return

    let chart = null
    let resizeHandler = null

    try {
      // Clean up previous chart
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }

      // Format data for lightweight-charts
      const chartData = data.data
        .map((point) => {
          const dateVal = point.Date || point.date || point.Datetime || point.timestamp || ''
          let time
          
          try {
            const d = new Date(dateVal)
            if (isNaN(d.getTime())) return null
            time = Math.floor(d.getTime() / 1000)
          } catch {
            return null
          }

          const open = parseFloat(point.Open ?? point.open ?? point.price) || null
          const high = parseFloat(point.High ?? point.high ?? point.price) || null
          const low = parseFloat(point.Low ?? point.low ?? point.price) || null
          const close = parseFloat(point.Close ?? point.close ?? point.price) || null
          const volume = parseFloat(point.Volume ?? point.volume) || 0

          if (!close || !time || time <= 0) return null

          return { time, open: open || close, high: high || close, low: low || close, close, volume }
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time)

      // Remove duplicate timestamps
      const uniqueData = []
      const seenTimes = new Set()
      for (const d of chartData) {
        if (!seenTimes.has(d.time)) {
          seenTimes.add(d.time)
          uniqueData.push(d)
        }
      }

      if (uniqueData.length === 0) {
        setUseFallback(true)
        return
      }

      // Create chart
      chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { type: ColorType.Solid, color: '#0a0f14' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#1e2530' },
          horzLines: { color: '#1e2530' },
        },
        rightPriceScale: { borderColor: '#2d3748' },
        timeScale: { borderColor: '#2d3748', timeVisible: true },
      })

      chartRef.current = chart

      // Add series based on mode
      if (chartMode === 'candle') {
        const hasOHLC = uniqueData.some(d => d.open !== d.close || d.high !== d.close)
        if (hasOHLC) {
          const series = chart.addCandlestickSeries({
            upColor: '#22c55e', downColor: '#ef4444',
            borderUpColor: '#22c55e', borderDownColor: '#ef4444',
            wickUpColor: '#22c55e', wickDownColor: '#ef4444',
          })
          series.setData(uniqueData)
        } else {
          const series = chart.addLineSeries({ color: '#ff6b00', lineWidth: 2 })
          series.setData(uniqueData.map(d => ({ time: d.time, value: d.close })))
        }
      } else if (chartMode === 'area') {
        const series = chart.addAreaSeries({
          topColor: 'rgba(255, 107, 0, 0.4)',
          bottomColor: 'rgba(255, 107, 0, 0.0)',
          lineColor: '#ff6b00', lineWidth: 2,
        })
        series.setData(uniqueData.map(d => ({ time: d.time, value: d.close })))
      } else {
        const series = chart.addLineSeries({ color: '#ff6b00', lineWidth: 2 })
        series.setData(uniqueData.map(d => ({ time: d.time, value: d.close })))
      }

      // Volume
      if (uniqueData.some(d => d.volume > 0)) {
        const volSeries = chart.addHistogramSeries({
          color: '#ff6b00', priceFormat: { type: 'volume' }, priceScaleId: 'volume',
        })
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
        volSeries.setData(uniqueData.map(d => ({
          time: d.time, value: d.volume,
          color: d.close >= d.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        })))
      }

      chart.timeScale().fitContent()

      resizeHandler = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth })
        }
      }
      window.addEventListener('resize', resizeHandler)

    } catch (err) {
      console.error('[CandlestickChart] Error:', err)
      setUseFallback(true)
    }

    return () => {
      if (resizeHandler) window.removeEventListener('resize', resizeHandler)
      if (chart) chart.remove()
      chartRef.current = null
    }
  }, [data, chartMode, useFallback])

  if (!data?.data?.length) {
    return (
      <div className="candlestick-panel empty">
        <span>NO HISTORICAL DATA AVAILABLE</span>
      </div>
    )
  }

  // Calculate stats
  const prices = data.data
    .map(p => parseFloat(p.Close ?? p.close ?? p.price))
    .filter(p => p != null && !isNaN(p))
  
  const startPrice = prices[0] || 0
  const endPrice = prices[prices.length - 1] || 0
  const priceChange = startPrice ? ((endPrice - startPrice) / startPrice) * 100 : 0
  const isPositive = priceChange >= 0
  const high = prices.length ? Math.max(...prices) : 0
  const low = prices.length ? Math.min(...prices) : 0

  const formatPrice = (v) => {
    if (!v || isNaN(v)) return '$0'
    if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'K'
    if (v >= 1) return '$' + v.toFixed(2)
    return '$' + v.toFixed(6)
  }

  return (
    <div className="candlestick-panel">
      <div className="chart-header">
        <div className="chart-title">
          <span className="chart-icon">#</span>
          <span>{title || 'PRICE HISTORY'}</span>
        </div>
        {!useFallback && (
          <div className="chart-controls">
            <button 
              className={`mode-btn ${chartMode === 'line' ? 'active' : ''}`}
              onClick={() => setChartMode('line')}
            >━ Line</button>
            <button 
              className={`mode-btn ${chartMode === 'candle' ? 'active' : ''}`}
              onClick={() => setChartMode('candle')}
            >◧ Candles</button>
            <button 
              className={`mode-btn ${chartMode === 'area' ? 'active' : ''}`}
              onClick={() => setChartMode('area')}
            >▤ Area</button>
          </div>
        )}
        <div className={`chart-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
        </div>
      </div>

      <div className="chart-stats">
        <div className="stat"><span className="stat-label">OPEN</span><span className="stat-value">{formatPrice(startPrice)}</span></div>
        <div className="stat"><span className="stat-label">CLOSE</span><span className="stat-value">{formatPrice(endPrice)}</span></div>
        <div className="stat"><span className="stat-label">HIGH</span><span className="stat-value text-positive">{formatPrice(high)}</span></div>
        <div className="stat"><span className="stat-label">LOW</span><span className="stat-value text-negative">{formatPrice(low)}</span></div>
        <div className="stat"><span className="stat-label">POINTS</span><span className="stat-value">{data.data.length}</span></div>
      </div>

      {useFallback ? (
        <RechartsChart data={data} isPositive={isPositive} />
      ) : (
        <div className="chart-container" ref={chartContainerRef} />
      )}
    </div>
  )
}

// Recharts fallback component
function RechartsChart({ data, isPositive }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatPrice = (v) => {
    if (!v || isNaN(v)) return '$0'
    if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'K'
    if (v >= 1) return '$' + v.toFixed(2)
    return '$' + v.toFixed(6)
  }

  const chartData = data.data.map(point => ({
    date: point.Date || point.date || point.Datetime || point.timestamp || '',
    price: parseFloat(point.Close ?? point.close ?? point.price) || 0,
    volume: parseFloat(point.Volume ?? point.volume) || 0
  })).filter(d => d.price > 0)

  const prices = chartData.map(d => d.price)
  const minPrice = Math.min(...prices) * 0.98
  const maxPrice = Math.max(...prices) * 1.02

  return (
    <div className="fallback-chart">
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={[minPrice, maxPrice]}
            tickFormatter={formatPrice}
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            width={70}
          />
          <Tooltip 
            contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px' }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(value, name) => [formatPrice(value), name === 'price' ? 'Price' : 'Volume']}
            labelFormatter={formatDate}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={isPositive ? '#22c55e' : '#ef4444'}
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      <div className="volume-section">
        <ResponsiveContainer width="100%" height={80}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Bar dataKey="volume" fill="#ff6b00" fillOpacity={0.4} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default CandlestickChart
