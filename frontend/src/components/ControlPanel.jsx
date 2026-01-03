import React, { useState, useEffect, useRef } from 'react'
import './ControlPanel.css'

function ControlPanel({
  assetType,
  setAssetType,
  ticker,
  setTicker,
  period,
  setPeriod,
  interval,
  setInterval,
  onFetch,
  loading
}) {
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef(null)
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setShowDropdown(false)
    onFetch()
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setTicker(value)

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    if (value.length >= 2) {
      setSearching(true)
      searchTimeout.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/search/${value}`)
          if (response.ok) {
            const data = await response.json()
            setSearchResults(data.results || [])
            setShowDropdown(true)
          }
        } catch (err) {
          console.error('Search error:', err)
        } finally {
          setSearching(false)
        }
      }, 300)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }

  const handleSelectResult = (result) => {
    // For crypto, use the ID (e.g., "bitcoin"), for stocks use symbol (e.g., "AAPL")
    const tickerValue = result.type === 'crypto' ? result.id : (result.symbol || result.id)
    
    // Update state
    setTicker(tickerValue)
    if (result.type) {
      setAssetType(result.type)
    }
    
    setShowDropdown(false)
    setSearchResults([])
    
    // Don't auto-fetch - let user click the button
    // This avoids React state timing issues
  }

  const handleClickOutside = (e) => {
    if (inputRef.current && !inputRef.current.contains(e.target)) {
      setShowDropdown(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const assetTypes = [
    { value: 'stock', label: 'STOCKS', icon: '📈' },
    { value: 'crypto', label: 'CRYPTO', icon: '₿' },
    { value: 'commodity', label: 'COMMODITIES', icon: '🛢️' },
    { value: 'forex', label: 'FOREX', icon: '💱' },
    { value: 'index', label: 'INDICES', icon: '📊' },
    { value: 'treasury', label: 'TREASURY', icon: '🏛️' },
  ]

  const periods = [
    { value: '1d', label: '1D' },
    { value: '5d', label: '5D' },
    { value: '1mo', label: '1M' },
    { value: '3mo', label: '3M' },
    { value: '6mo', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '2y', label: '2Y' },
    { value: '5y', label: '5Y' },
    { value: 'max', label: 'MAX' }
  ]

  const intervals = [
    { value: '1d', label: '1D' },
    { value: '1wk', label: '1W' },
    { value: '1mo', label: '1M' },
  ]

  const getPlaceholder = () => {
    switch (assetType) {
      case 'crypto': return 'BTC, ETH, Solana...'
      case 'commodity': return 'Gold, Oil, Silver...'
      case 'forex': return 'EUR, GBP, JPY...'
      case 'index': return 'SPY, VIX, Nasdaq...'
      case 'treasury': return '10y, 2y, 30y...'
      default: return 'AAPL, Tesla, MSFT...'
    }
  }

  const getHint = () => {
    switch (assetType) {
      case 'crypto': return 'Enter symbol (BTC) or name (Bitcoin)'
      case 'commodity': return 'Enter commodity name (gold, oil, silver)'
      case 'forex': return 'Enter currency (EUR, GBP) or pair (EURUSD)'
      case 'index': return 'Enter index name (SPY, VIX, Dow)'
      case 'treasury': return 'Enter maturity (10y, 2y, 30y)'
      default: return 'Enter ticker (AAPL) or company name (Apple)'
    }
  }

  return (
    <form className="control-panel" onSubmit={handleSubmit}>
      <div className="control-section asset-types">
        <label className="control-label">ASSET TYPE</label>
        <div className="toggle-group">
          {assetTypes.map(type => (
            <button
              key={type.value}
              type="button"
              className={`toggle-btn ${assetType === type.value ? 'active' : ''}`}
              onClick={() => {
                setAssetType(type.value)
                setTicker('')
                setSearchResults([])
              }}
            >
              <span className="toggle-icon">{type.icon}</span>
              <span className="toggle-label">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="control-section search-section" ref={inputRef}>
        <label className="control-label">SEARCH</label>
        <div className="input-wrapper">
          <span className="input-prefix">▶</span>
          <input
            type="text"
            className="control-input"
            value={ticker}
            onChange={handleInputChange}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            placeholder={getPlaceholder()}
            spellCheck="false"
            autoComplete="off"
          />
          {searching && <span className="search-spinner">⟳</span>}
        </div>
        <span className="input-hint">{getHint()}</span>

        {showDropdown && searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map((result, idx) => (
              <div
                key={`${result.id}-${idx}`}
                className="search-result"
                onClick={() => handleSelectResult(result)}
              >
                <span className="result-symbol">{result.symbol}</span>
                <span className="result-name">{result.name}</span>
                <span className={`result-type ${result.type}`}>
                  {result.type?.toUpperCase()}
                </span>
                {result.market_cap_rank && (
                  <span className="result-rank">#{result.market_cap_rank}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="control-section">
        <label className="control-label">PERIOD</label>
        <div className="period-grid">
          {periods.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`period-btn ${period === p.value ? 'active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {assetType !== 'crypto' && assetType !== 'treasury' && (
        <div className="control-section">
          <label className="control-label">INTERVAL</label>
          <div className="interval-grid">
            {intervals.map((int) => (
              <button
                key={int.value}
                type="button"
                className={`interval-btn ${interval === int.value ? 'active' : ''}`}
                onClick={() => setInterval(int.value)}
              >
                {int.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="control-section control-actions">
        <button 
          type="submit" 
          className="fetch-btn"
          disabled={loading || !ticker.trim()}
        >
          {loading ? (
            <>
              <span className="loading-dots">...</span>
              <span>LOADING</span>
            </>
          ) : (
            <>
              <span className="fetch-icon">⚡</span>
              <span>FETCH DATA</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default ControlPanel
