import React, { useState, useEffect, useCallback } from 'react'
import DataPanel from '../components/DataPanel'
import TradingViewChart from '../components/TradingViewChart'
import './MarketsView.css'

function MarketsView({ selectedAssets, onUpdate }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [assetData, setAssetData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
      case 'macro':
        return `/api/macro/${ticker.toLowerCase()}`
      default:
        return `/api/stocks/${ticker.toUpperCase()}`
    }
  }

  const fetchData = useCallback(async (asset) => {
    if (!asset) return

    setLoading(true)
    setError(null)

    try {
      const infoEndpoint = getApiEndpoint(asset.type, asset.id || asset.ticker)
      console.log('[FETCH]', asset.type, asset.ticker, '->', infoEndpoint)
      
      const infoRes = await fetch(infoEndpoint)
      
      if (!infoRes.ok) {
        const err = await infoRes.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail || `Failed to fetch ${asset.type} data`)
      }

      const info = await infoRes.json()
      console.log('[DATA RECEIVED]', asset.type, info.current_price || info.name || info.id)
      
      setAssetData({ type: asset.type, asset_type: asset.type, ticker: asset.ticker, ...info })
      setError(null)
      onUpdate?.({ type: asset.type, ...info })
      
    } catch (err) {
      console.error('[FETCH ERROR]', err)
      setError(err.message)
      setAssetData(null)
    } finally {
      setLoading(false)
    }
  }, [onUpdate])

  // Fetch data when selected asset changes
  useEffect(() => {
    if (selectedAssets.length > 0) {
      const safeIndex = Math.min(activeIndex, selectedAssets.length - 1)
      if (safeIndex !== activeIndex) {
        setActiveIndex(safeIndex)
        return // Will re-trigger with correct index
      }
      const asset = selectedAssets[safeIndex]
      if (asset) {
        fetchData(asset)
      }
    } else {
      setAssetData(null)
    }
    // Only depend on selectedAssets and activeIndex, not fetchData to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssets.length, activeIndex])

  const currentAsset = selectedAssets[activeIndex]

  return (
    <div className="markets-view">
      {/* Asset Navigation (when multiple selected) */}
      {selectedAssets.length > 1 && (
        <div className="asset-navigator">
          <span className="nav-label">VIEWING:</span>
          {selectedAssets.map((asset, i) => (
            <button
              key={i}
              className={`nav-asset-btn ${i === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(i)}
            >
              <span className="nav-ticker">{asset.ticker}</span>
              <span className="nav-type">{asset.type}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="error-banner animate-slide-in">
          <span className="error-icon">!</span>
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
        <div className="markets-data animate-fade-in">
          <TradingViewChart 
            symbol={assetData.symbol || assetData.ticker || currentAsset?.ticker} 
            assetType={currentAsset?.type} 
          />
          <DataPanel data={assetData} />
        </div>
      )}

      {selectedAssets.length === 0 && !loading && (
        <div className="welcome-screen">
          <div className="welcome-content">
            <div className="terminal-prompt">
              <span className="prompt-symbol">▶</span>
              <span className="prompt-text">SELECT ASSETS ABOVE</span>
              <span className="cursor-blink">_</span>
            </div>
            <p className="welcome-hint">
              Use the search bar above to select assets you want to analyze
            </p>
            <div className="quick-examples">
              <span className="examples-label">TIP: Select multiple assets to compare across tabs</span>
              <code>STOCKS: AAPL, Tesla, Microsoft</code>
              <code>CRYPTO: BTC, ETH, Solana</code>
              <code>COMMODITIES: Gold, Oil, Silver</code>
              <code>MACRO: M2, VIX, Unemployment</code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MarketsView
