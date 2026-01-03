import React from 'react'
import './StatusBar.css'

function StatusBar({ lastUpdate, assetData }) {
  const formatTime = (date) => {
    if (!date) return '—'
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className="status-item">
          <span className="status-label">SYS</span>
          <span className="status-value ok">ONLINE</span>
        </span>
        <span className="status-item">
          <span className="status-label">API</span>
          <span className="status-value ok">CONNECTED</span>
        </span>
      </div>

      <div className="status-center">
        {assetData && (
          <span className="active-asset">
            <span className="asset-type">{assetData.type?.toUpperCase()}</span>
            <span className="asset-ticker">{assetData.ticker || assetData.symbol}</span>
          </span>
        )}
      </div>

      <div className="status-right">
        <span className="status-item">
          <span className="status-label">LAST UPDATE</span>
          <span className="status-value">{formatTime(lastUpdate)}</span>
        </span>
        <span className="status-item powered-by">
          <span>yfinance + CoinGecko</span>
        </span>
      </div>
    </footer>
  )
}

export default StatusBar

