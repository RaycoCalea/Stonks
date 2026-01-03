import React, { useState, useEffect } from 'react'
import './Header.css'

function Header() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: '2-digit'
    }).toUpperCase()
  }

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">◆</span>
          <span className="logo-text">STONKS</span>
          <span className="logo-version">TERMINAL v1.0</span>
        </div>
      </div>
      
      <div className="header-center">
        <div className="market-status">
          <span className="status-dot"></span>
          <span>MARKETS LIVE</span>
        </div>
      </div>

      <div className="header-right">
        <div className="datetime">
          <span className="date">{formatDate(time)}</span>
          <span className="time">{formatTime(time)}</span>
        </div>
      </div>
    </header>
  )
}

export default Header

