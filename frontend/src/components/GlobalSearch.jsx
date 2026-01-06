import React, { useState, useRef, useEffect } from 'react'
import './GlobalSearch.css'

const ASSET_COLORS = [
  '#00d67f', '#ff7a00', '#0ea5e9', '#f43f5e', '#fbbf24',
  '#22c55e', '#3b82f6', '#ef4444', '#84cc16', '#6366f1'
]

const TYPE_LABELS = {
  stock: 'STK',
  crypto: 'CRY',
  commodity: 'CMD',
  forex: 'FX',
  index: 'IDX',
  treasury: 'TRS',
  macro: 'MAC',
}

function GlobalSearch({ selectedAssets, onAssetsChange }) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef(null)
  const wrapperRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (value) => {
    setQuery(value)
    setShowDropdown(true)
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }
    
    if (value.length >= 2) {
      setSearching(true)
      searchTimeout.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search/${encodeURIComponent(value)}`)
          if (res.ok) {
            const results = await res.json()
            setSearchResults(results.slice(0, 10))
          }
        } catch (e) {
          console.error('Search error:', e)
        } finally {
          setSearching(false)
        }
      }, 300)
    } else {
      setSearchResults([])
      setSearching(false)
    }
  }

  const addAsset = (result) => {
    const newAsset = {
      id: result.id,
      type: result.type,
      ticker: result.symbol || result.id,
      name: result.name,
      region: result.region,
    }
    
    // Check if already selected
    const exists = selectedAssets.some(
      a => a.type === newAsset.type && a.ticker.toLowerCase() === newAsset.ticker.toLowerCase()
    )
    
    if (!exists && selectedAssets.length < 10) {
      onAssetsChange([...selectedAssets, newAsset])
    }
    
    setQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  const removeAsset = (index) => {
    onAssetsChange(selectedAssets.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    onAssetsChange([])
  }

  return (
    <div className="global-search" ref={wrapperRef}>
      <div className="search-container">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder="Search stocks, crypto, macro, forex, indices..."
          className="search-input"
        />
        {searching && <div className="search-spinner" />}
        
        {showDropdown && searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map((result, i) => {
              const isSelected = selectedAssets.some(
                a => a.type === result.type && (a.ticker === result.symbol || a.id === result.id)
              )
              return (
                <div
                  key={i}
                  className={`search-result ${isSelected ? 'selected' : ''}`}
                  onClick={() => !isSelected && addAsset(result)}
                >
                  <span className="result-type-badge">{TYPE_LABELS[result.type] || 'OTH'}</span>
                  <span className="result-symbol">{result.symbol}</span>
                  <span className="result-name">{result.name}</span>
                  {result.region && <span className="result-region">{result.region}</span>}
                  {isSelected && <span className="result-check">✓</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Assets */}
      {selectedAssets.length > 0 && (
        <div className="selected-assets-bar">
          <span className="selected-label">{selectedAssets.length} Selected</span>
          <div className="selected-assets-list">
            {selectedAssets.map((asset, i) => (
              <div 
                key={i} 
                className="asset-chip"
                style={{ borderLeftColor: ASSET_COLORS[i % ASSET_COLORS.length] }}
              >
                <span className="chip-type">{TYPE_LABELS[asset.type]}</span>
                <span className="chip-ticker">{asset.ticker}</span>
                <button className="chip-remove" onClick={() => removeAsset(i)}>×</button>
              </div>
            ))}
          </div>
          <button className="clear-all-btn" onClick={clearAll}>
            Clear
          </button>
        </div>
      )}

      {/* Quick Add Suggestions */}
      {selectedAssets.length === 0 && (
        <div className="quick-add-bar">
          <span className="quick-label">Quick:</span>
          <button className="quick-btn" onClick={() => addAsset({ id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' })}>
            AAPL
          </button>
          <button className="quick-btn" onClick={() => addAsset({ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto' })}>
            BTC
          </button>
          <button className="quick-btn" onClick={() => addAsset({ id: '^GSPC', symbol: 'SPY', name: 'S&P 500', type: 'index' })}>
            SPY
          </button>
          <button className="quick-btn" onClick={() => addAsset({ id: 'gold', symbol: 'GOLD', name: 'Gold', type: 'commodity' })}>
            GOLD
          </button>
          <button className="quick-btn" onClick={() => addAsset({ id: 'vix', symbol: 'VIX', name: 'Volatility Index', type: 'macro' })}>
            VIX
          </button>
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
