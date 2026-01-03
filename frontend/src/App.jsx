import React, { useState } from 'react'
import Header from './components/Header'
import ControlPanel from './components/ControlPanel'
import DataPanel from './components/DataPanel'
import PriceChart from './components/PriceChart'
import StatusBar from './components/StatusBar'
import './App.css'

function App() {
  const [assetType, setAssetType] = useState('stock')
  const [ticker, setTicker] = useState('')
  const [period, setPeriod] = useState('3mo')
  const [interval, setInterval] = useState('1d')
  
  const [assetData, setAssetData] = useState(null)
  const [historyData, setHistoryData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const getApiEndpoint = (type, ticker) => {
    switch (type) {
      case 'crypto':
        return `/api/crypto/${ticker.toLowerCase()}`
      case 'commodity':
        return `/api/commodities/${ticker.toLowerCase()}`
      case 'forex':
        return `/api/forex/${ticker.toLowerCase()}`
      case 'index':
        return `/api/indices/${ticker}`
      case 'treasury':
        return `/api/treasury/${ticker}`
      default:
        return `/api/stocks/${ticker.toUpperCase()}`
    }
  }

  const getHistoryEndpoint = (type, ticker, period, interval) => {
    const baseEndpoint = getApiEndpoint(type, ticker)
    if (type === 'crypto') {
      return `${baseEndpoint}/history?period=${period}`
    }
    return `${baseEndpoint}/history?period=${period}&interval=${interval}`
  }

  const fetchData = async () => {
    if (!ticker.trim()) {
      setError('Please enter a ticker or asset name')
      return
    }

    setLoading(true)
    setError(null)

    const currentType = assetType
    const currentTicker = ticker

    try {
      const infoEndpoint = getApiEndpoint(currentType, currentTicker)
      const historyEndpoint = getHistoryEndpoint(currentType, currentTicker, period, interval)

      console.log('[FETCH]', currentType, currentTicker, '->', infoEndpoint)
      
      // Fetch main data first
      const infoRes = await fetch(infoEndpoint)
      
      if (!infoRes.ok) {
        const err = await infoRes.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail || `Failed to fetch ${currentType} data`)
      }

      const info = await infoRes.json()
      console.log('[DATA RECEIVED]', currentType, info.current_price || info.id)
      
      // Set the data - don't clear on history failure
      setAssetData({ type: currentType, asset_type: currentType, ...info })
      setLastUpdate(new Date())
      setError(null)
      
      // Fetch history separately (don't block main data display)
      fetch(historyEndpoint)
        .then(res => res.ok ? res.json() : null)
        .then(history => {
          if (history && history.data) {
            setHistoryData(history)
          }
        })
        .catch(e => console.log('[HISTORY] Failed:', e.message))
      
    } catch (err) {
      console.error('[FETCH ERROR]', err)
      setError(err.message)
      setAssetData(null)
      setHistoryData(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <ControlPanel
          assetType={assetType}
          setAssetType={setAssetType}
          ticker={ticker}
          setTicker={setTicker}
          period={period}
          setPeriod={setPeriod}
          interval={interval}
          setInterval={setInterval}
          onFetch={fetchData}
          loading={loading}
        />

        {error && (
          <div className="error-banner animate-slide-in">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span>FETCHING DATA...</span>
          </div>
        )}

        {assetData && !loading && (
          <div className="data-grid animate-fade-in">
            <DataPanel data={assetData} />
            {historyData && <PriceChart data={historyData} assetType={assetType} />}
          </div>
        )}

        {!assetData && !loading && !error && (
          <div className="welcome-screen">
            <div className="welcome-content">
              <div className="terminal-prompt">
                <span className="prompt-symbol">▶</span>
                <span className="prompt-text">READY FOR INPUT</span>
                <span className="cursor-blink">_</span>
              </div>
              <p className="welcome-hint">
                Select asset type, enter ticker/name, and press FETCH
              </p>
              <div className="quick-examples">
                <span className="examples-label">EXAMPLES:</span>
                <code>STOCKS: AAPL, Tesla, Microsoft</code>
                <code>CRYPTO: BTC, ETH, Solana</code>
                <code>COMMODITIES: Gold, Oil, Silver</code>
                <code>FOREX: EUR, GBP, JPY</code>
                <code>INDICES: SPY, VIX, Nasdaq</code>
                <code>TREASURY: 10y, 2y, 30y</code>
              </div>
            </div>
          </div>
        )}
      </main>

      <StatusBar lastUpdate={lastUpdate} assetData={assetData} />
    </div>
  )
}

export default App
