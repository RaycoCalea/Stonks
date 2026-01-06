import React, { useEffect, useRef, memo } from 'react'
import './TradingViewChart.css'

/**
 * TradingView Advanced Chart Widget
 * Uses TradingView's free embeddable widget for professional charts
 */
function TradingViewChart({ symbol, assetType, theme = 'dark' }) {
  const containerRef = useRef(null)
  const scriptRef = useRef(null)

  // Convert our symbol format to TradingView format
  const getTradingViewSymbol = () => {
    if (!symbol) return 'AAPL'
    
    const sym = symbol.toUpperCase()
    
    switch (assetType) {
      case 'crypto':
        // TradingView crypto format: BINANCE:BTCUSD or COINBASE:BTCUSD
        const cryptoMap = {
          'BITCOIN': 'BTCUSD',
          'BTC': 'BTCUSD',
          'ETHEREUM': 'ETHUSD',
          'ETH': 'ETHUSD',
          'SOLANA': 'SOLUSD',
          'SOL': 'SOLUSD',
          'CARDANO': 'ADAUSD',
          'ADA': 'ADAUSD',
          'DOGECOIN': 'DOGEUSD',
          'DOGE': 'DOGEUSD',
          'XRP': 'XRPUSD',
          'RIPPLE': 'XRPUSD',
          'POLKADOT': 'DOTUSD',
          'DOT': 'DOTUSD',
          'AVALANCHE': 'AVAXUSD',
          'AVAX': 'AVAXUSD',
          'CHAINLINK': 'LINKUSD',
          'LINK': 'LINKUSD',
          'MATIC': 'MATICUSD',
          'POLYGON': 'MATICUSD',
        }
        return `BINANCE:${cryptoMap[sym] || sym + 'USD'}`
      
      case 'forex':
        // TradingView forex format: FX:EURUSD
        const forexMap = {
          'EUR': 'EURUSD',
          'GBP': 'GBPUSD',
          'JPY': 'USDJPY',
          'CHF': 'USDCHF',
          'AUD': 'AUDUSD',
          'CAD': 'USDCAD',
          'NZD': 'NZDUSD',
        }
        return `FX:${forexMap[sym] || sym}`
      
      case 'commodity':
        // TradingView commodity format
        const commodityMap = {
          'GOLD': 'COMEX:GC1!',
          'GC=F': 'COMEX:GC1!',
          'SILVER': 'COMEX:SI1!',
          'SI=F': 'COMEX:SI1!',
          'OIL': 'NYMEX:CL1!',
          'CRUDE': 'NYMEX:CL1!',
          'CL=F': 'NYMEX:CL1!',
          'PLATINUM': 'NYMEX:PL1!',
          'PALLADIUM': 'NYMEX:PA1!',
          'NATURAL GAS': 'NYMEX:NG1!',
          'NG=F': 'NYMEX:NG1!',
          'COPPER': 'COMEX:HG1!',
        }
        return commodityMap[sym] || `COMEX:${sym}`
      
      case 'index':
        // TradingView index format
        const indexMap = {
          'SPY': 'AMEX:SPY',
          'QQQ': 'NASDAQ:QQQ',
          'DIA': 'AMEX:DIA',
          'IWM': 'AMEX:IWM',
          'VIX': 'TVC:VIX',
          '^GSPC': 'SP:SPX',
          '^DJI': 'DJ:DJI',
          '^IXIC': 'NASDAQ:IXIC',
        }
        return indexMap[sym] || `AMEX:${sym}`
      
      case 'treasury':
        // TradingView treasury format
        const treasuryMap = {
          '2Y': 'TVC:US02Y',
          '5Y': 'TVC:US05Y',
          '10Y': 'TVC:US10Y',
          '30Y': 'TVC:US30Y',
          '^TNX': 'TVC:US10Y',
          '^TYX': 'TVC:US30Y',
        }
        return treasuryMap[sym] || `TVC:US10Y`
      
      case 'macro':
        // Macro economic indicators - map to TradingView FRED symbols
        const macroMap = {
          // Volatility
          'VIX': 'TVC:VIX',
          '^VIX': 'TVC:VIX',
          'VVIX': 'TVC:VIX',
          'SKEW': 'TVC:VIX',
          // Dollar
          'DXY': 'TVC:DXY',
          'DX-Y.NYB': 'TVC:DXY',
          'DOLLAR INDEX': 'TVC:DXY',
          // Treasuries
          'US10Y': 'TVC:US10Y',
          'US02Y': 'TVC:US02Y',
          'US30Y': 'TVC:US30Y',
          '10Y': 'TVC:US10Y',
          '2Y': 'TVC:US02Y',
          '30Y': 'TVC:US30Y',
          // Money Supply (FRED)
          'M1': 'FRED:M1SL',
          'M2': 'FRED:M2SL',
          'WM1NS': 'FRED:M1SL',
          'WM2NS': 'FRED:M2SL',
          'MONEY SUPPLY': 'FRED:M2SL',
          // Fed
          'FED FUNDS': 'FRED:FEDFUNDS',
          'DFF': 'FRED:FEDFUNDS',
          'FED RATE': 'FRED:FEDFUNDS',
          'FED BALANCE SHEET': 'FRED:WALCL',
          'WALCL': 'FRED:WALCL',
          'FED ASSETS': 'FRED:WALCL',
          // Inflation
          'CPI': 'FRED:CPIAUCSL',
          'CPIAUCSL': 'FRED:CPIAUCSL',
          'INFLATION': 'TVC:US10Y-TVC:US10', // Use 10Y as proxy
          'PCE': 'FRED:PCEPI',
          // Employment
          'UNEMPLOYMENT': 'FRED:UNRATE',
          'UNRATE': 'FRED:UNRATE',
          'JOBS': 'FRED:PAYEMS',
          'PAYEMS': 'FRED:PAYEMS',
          'NONFARM PAYROLLS': 'FRED:PAYEMS',
          // GDP
          'GDP': 'FRED:GDP',
          'REAL GDP': 'FRED:GDPC1',
          'GDPC1': 'FRED:GDPC1',
          // Debt
          'US DEBT': 'FRED:GFDEBTN',
          'DEBT': 'FRED:GFDEBTN',
          'GFDEBTN': 'FRED:GFDEBTN',
          // Yield curve
          'YIELD CURVE': 'TVC:US10Y-TVC:US02Y',
          'T10Y2Y': 'FRED:T10Y2Y',
          // Housing
          'MORTGAGE RATE': 'FRED:MORTGAGE30US',
          'MORTGAGE30US': 'FRED:MORTGAGE30US',
        }
        const upperSym = sym.toUpperCase()
        return macroMap[upperSym] || `FRED:${sym}`
      
      default:
        // Stocks - try common exchanges
        return `NASDAQ:${sym}`
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous widget
    containerRef.current.innerHTML = ''
    
    // Create widget container
    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container'
    widgetContainer.style.height = '100%'
    widgetContainer.style.width = '100%'
    
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'
    
    widgetContainer.appendChild(widgetDiv)
    containerRef.current.appendChild(widgetContainer)

    // Load TradingView widget script
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: getTradingViewSymbol(),
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1', // Candlestick
      locale: 'en',
      enable_publishing: false,
      backgroundColor: 'rgba(10, 15, 20, 1)',
      gridColor: 'rgba(30, 37, 48, 0.6)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      studies: [
        'Volume@tv-basicstudies',
        'MAExp@tv-basicstudies',
      ],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
    })
    
    widgetContainer.appendChild(script)
    scriptRef.current = script

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [symbol, assetType])

  return (
    <div className="tradingview-chart-panel">
      <div className="chart-header-tv">
        <div className="chart-title-tv">
          <span className="chart-icon">📈</span>
          <span>TRADINGVIEW CHART</span>
          <span className="symbol-badge">{getTradingViewSymbol()}</span>
        </div>
        <a 
          href={`https://www.tradingview.com/chart/?symbol=${getTradingViewSymbol()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tv-link"
        >
          Open in TradingView ↗
        </a>
      </div>
      <div className="tradingview-container" ref={containerRef} />
    </div>
  )
}

export default memo(TradingViewChart)

