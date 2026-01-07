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
    if (!symbol) return 'NASDAQ:AAPL'
    
    const sym = symbol.toUpperCase().trim()
    
    switch (assetType) {
      case 'crypto':
        // TradingView crypto format: BINANCE:BTCUSD
        const cryptoMap = {
          'BITCOIN': 'BTCUSDT', 'BTC': 'BTCUSDT',
          'ETHEREUM': 'ETHUSDT', 'ETH': 'ETHUSDT',
          'SOLANA': 'SOLUSDT', 'SOL': 'SOLUSDT',
          'CARDANO': 'ADAUSDT', 'ADA': 'ADAUSDT',
          'DOGECOIN': 'DOGEUSDT', 'DOGE': 'DOGEUSDT',
          'XRP': 'XRPUSDT', 'RIPPLE': 'XRPUSDT',
          'POLKADOT': 'DOTUSDT', 'DOT': 'DOTUSDT',
          'AVALANCHE': 'AVAXUSDT', 'AVAX': 'AVAXUSDT',
          'CHAINLINK': 'LINKUSDT', 'LINK': 'LINKUSDT',
          'MATIC': 'MATICUSDT', 'POLYGON': 'MATICUSDT',
          'LITECOIN': 'LTCUSDT', 'LTC': 'LTCUSDT',
          'UNISWAP': 'UNIUSDT', 'UNI': 'UNIUSDT',
          'COSMOS': 'ATOMUSDT', 'ATOM': 'ATOMUSDT',
          'NEAR': 'NEARUSDT', 'ARBITRUM': 'ARBUSDT', 'ARB': 'ARBUSDT',
          'OPTIMISM': 'OPUSDT', 'OP': 'OPUSDT',
          'APTOS': 'APTUSDT', 'APT': 'APTUSDT',
          'SHIBA-INU': 'SHIBUSDT', 'SHIB': 'SHIBUSDT',
          'PEPE': 'PEPEUSDT', 'BONK': 'BONKUSDT',
        }
        const cryptoSymbol = cryptoMap[sym] || (sym.endsWith('USDT') ? sym : sym + 'USDT')
        return `BINANCE:${cryptoSymbol}`
      
      case 'forex':
        // TradingView forex format: FX:EURUSD
        const forexMap = {
          'EUR': 'EURUSD', 'EURUSD': 'EURUSD', 'EUR=X': 'EURUSD',
          'GBP': 'GBPUSD', 'GBPUSD': 'GBPUSD', 'GBP=X': 'GBPUSD',
          'JPY': 'USDJPY', 'USDJPY': 'USDJPY', 'JPY=X': 'USDJPY',
          'CHF': 'USDCHF', 'USDCHF': 'USDCHF', 'CHF=X': 'USDCHF',
          'AUD': 'AUDUSD', 'AUDUSD': 'AUDUSD', 'AUD=X': 'AUDUSD',
          'CAD': 'USDCAD', 'USDCAD': 'USDCAD', 'CAD=X': 'USDCAD',
          'NZD': 'NZDUSD', 'NZDUSD': 'NZDUSD', 'NZD=X': 'NZDUSD',
          'CNY': 'USDCNY', 'USDCNY': 'USDCNY',
          'INR': 'USDINR', 'USDINR': 'USDINR',
          'BRL': 'USDBRL', 'USDBRL': 'USDBRL',
          'MXN': 'USDMXN', 'USDMXN': 'USDMXN',
        }
        return `FX:${forexMap[sym] || sym}`
      
      case 'commodity':
        // TradingView commodity format - handle Yahoo tickers (GC=F) and names
        const commodityMap = {
          // Gold
          'GOLD': 'COMEX:GC1!', 'GC=F': 'COMEX:GC1!', 'GC': 'COMEX:GC1!', 'XAUUSD': 'OANDA:XAUUSD',
          // Silver
          'SILVER': 'COMEX:SI1!', 'SI=F': 'COMEX:SI1!', 'SI': 'COMEX:SI1!', 'XAGUSD': 'OANDA:XAGUSD',
          // Oil
          'OIL': 'NYMEX:CL1!', 'CRUDE': 'NYMEX:CL1!', 'CL=F': 'NYMEX:CL1!', 'CL': 'NYMEX:CL1!',
          'WTI': 'NYMEX:CL1!', 'BRENT': 'NYMEX:BB1!', 'BZ=F': 'NYMEX:BB1!',
          // Platinum & Palladium
          'PLATINUM': 'NYMEX:PL1!', 'PL=F': 'NYMEX:PL1!', 'PL': 'NYMEX:PL1!',
          'PALLADIUM': 'NYMEX:PA1!', 'PA=F': 'NYMEX:PA1!', 'PA': 'NYMEX:PA1!',
          // Natural Gas
          'NATURAL GAS': 'NYMEX:NG1!', 'NATGAS': 'NYMEX:NG1!', 'GAS': 'NYMEX:NG1!',
          'NG=F': 'NYMEX:NG1!', 'NG': 'NYMEX:NG1!',
          // Base metals
          'COPPER': 'COMEX:HG1!', 'HG=F': 'COMEX:HG1!', 'HG': 'COMEX:HG1!',
          // Agricultural
          'CORN': 'CBOT:ZC1!', 'ZC=F': 'CBOT:ZC1!',
          'WHEAT': 'CBOT:ZW1!', 'ZW=F': 'CBOT:ZW1!',
          'SOYBEANS': 'CBOT:ZS1!', 'ZS=F': 'CBOT:ZS1!', 'SOYBEAN': 'CBOT:ZS1!',
          'COFFEE': 'NYMEX:KC1!', 'KC=F': 'NYMEX:KC1!',
          'SUGAR': 'NYMEX:SB1!', 'SB=F': 'NYMEX:SB1!',
          'COTTON': 'NYMEX:CT1!', 'CT=F': 'NYMEX:CT1!',
        }
        return commodityMap[sym] || 'COMEX:GC1!'
      
      case 'index':
        // TradingView index format - handle ETFs and actual indices
        const indexMap = {
          // Major ETFs
          'SPY': 'AMEX:SPY', 'QQQ': 'NASDAQ:QQQ', 'DIA': 'AMEX:DIA',
          'IWM': 'AMEX:IWM', 'VOO': 'AMEX:VOO', 'VTI': 'AMEX:VTI',
          'IVV': 'AMEX:IVV', 'VXX': 'CBOE:VXX',
          // Actual indices (Yahoo format with ^)
          '^GSPC': 'SP:SPX', '^SPX': 'SP:SPX', 'SPX': 'SP:SPX',
          '^DJI': 'DJ:DJI', 'DJI': 'DJ:DJI', 'DOW': 'DJ:DJI',
          '^IXIC': 'NASDAQ:IXIC', 'IXIC': 'NASDAQ:IXIC', 'NASDAQ': 'NASDAQ:IXIC',
          '^RUT': 'RUSSELL:RUT', 'RUT': 'RUSSELL:RUT', 'RUSSELL': 'RUSSELL:RUT',
          // Volatility
          'VIX': 'TVC:VIX', '^VIX': 'TVC:VIX',
          // International
          '^FTSE': 'TVC:UKX', 'FTSE': 'TVC:UKX',
          '^N225': 'TVC:NI225', 'NIKKEI': 'TVC:NI225',
          '^HSI': 'TVC:HSI', 'HANG SENG': 'TVC:HSI',
          '^STOXX50E': 'TVC:SX5E', 'STOXX': 'TVC:SX5E',
          '^DAX': 'XETR:DAX', 'DAX': 'XETR:DAX',
        }
        return indexMap[sym] || `AMEX:${sym}`
      
      case 'treasury':
        // TradingView treasury format
        const treasuryMap = {
          '2Y': 'TVC:US02Y', 'US02Y': 'TVC:US02Y', '^IRX': 'TVC:US03M',
          '3M': 'TVC:US03M', '6M': 'TVC:US06M',
          '5Y': 'TVC:US05Y', 'US05Y': 'TVC:US05Y',
          '10Y': 'TVC:US10Y', 'US10Y': 'TVC:US10Y', '^TNX': 'TVC:US10Y',
          '20Y': 'TVC:US20Y', '30Y': 'TVC:US30Y', 'US30Y': 'TVC:US30Y', '^TYX': 'TVC:US30Y',
        }
        return treasuryMap[sym] || 'TVC:US10Y'
      
      case 'macro':
        // Macro economic indicators - map to TradingView FRED symbols
        const macroMap = {
          // Volatility
          'VIX': 'TVC:VIX', '^VIX': 'TVC:VIX',
          // Dollar Index
          'DXY': 'TVC:DXY', 'DX-Y.NYB': 'TVC:DXY', 'DOLLAR': 'TVC:DXY', 'DOLLAR INDEX': 'TVC:DXY',
          // Treasuries
          'US10Y': 'TVC:US10Y', 'US02Y': 'TVC:US02Y', 'US30Y': 'TVC:US30Y',
          '10Y': 'TVC:US10Y', '2Y': 'TVC:US02Y', '30Y': 'TVC:US30Y',
          // Money Supply (FRED)
          'M1': 'FRED:M1SL', 'M2': 'FRED:M2SL', 'WM1NS': 'FRED:M1SL', 'WM2NS': 'FRED:M2SL',
          'MONEY SUPPLY': 'FRED:M2SL', 'MONEY': 'FRED:M2SL',
          // Fed
          'DFF': 'FRED:FEDFUNDS', 'FED FUNDS': 'FRED:FEDFUNDS', 'FED RATE': 'FRED:FEDFUNDS',
          'WALCL': 'FRED:WALCL', 'FED BALANCE SHEET': 'FRED:WALCL', 'FED ASSETS': 'FRED:WALCL',
          // Inflation
          'CPI': 'FRED:CPIAUCSL', 'CPIAUCSL': 'FRED:CPIAUCSL', 'INFLATION': 'FRED:CPIAUCSL',
          'PCE': 'FRED:PCEPI', 'PCEPI': 'FRED:PCEPI',
          // Employment
          'UNRATE': 'FRED:UNRATE', 'UNEMPLOYMENT': 'FRED:UNRATE',
          'PAYEMS': 'FRED:PAYEMS', 'JOBS': 'FRED:PAYEMS', 'NONFARM': 'FRED:PAYEMS',
          'ICSA': 'FRED:ICSA', 'CLAIMS': 'FRED:ICSA',
          // GDP
          'GDP': 'FRED:GDP', 'GDPC1': 'FRED:GDPC1', 'REAL GDP': 'FRED:GDPC1',
          // Debt
          'GFDEBTN': 'FRED:GFDEBTN', 'US DEBT': 'FRED:GFDEBTN', 'DEBT': 'FRED:GFDEBTN',
          // Yield curve
          'T10Y2Y': 'FRED:T10Y2Y', 'YIELD CURVE': 'FRED:T10Y2Y',
          // Housing
          'MORTGAGE30US': 'FRED:MORTGAGE30US', 'MORTGAGE': 'FRED:MORTGAGE30US',
          'CSUSHPINSA': 'FRED:CSUSHPINSA', 'HOME PRICES': 'FRED:CSUSHPINSA',
          // Population
          'POPTHM': 'FRED:POPTHM', 'POPULATION': 'FRED:POPTHM',
        }
        return macroMap[sym] || `FRED:${sym}`
      
      case 'stock':
      default:
        // Stocks - determine exchange based on common patterns
        const stockExchangeMap = {
          'AAPL': 'NASDAQ', 'MSFT': 'NASDAQ', 'GOOGL': 'NASDAQ', 'AMZN': 'NASDAQ',
          'META': 'NASDAQ', 'NVDA': 'NASDAQ', 'TSLA': 'NASDAQ', 'NFLX': 'NASDAQ',
          'AMD': 'NASDAQ', 'INTC': 'NASDAQ', 'CSCO': 'NASDAQ', 'ADBE': 'NASDAQ',
          'CRM': 'NYSE', 'PYPL': 'NASDAQ', 'UBER': 'NYSE', 'ABNB': 'NASDAQ',
          'JPM': 'NYSE', 'V': 'NYSE', 'MA': 'NYSE', 'BAC': 'NYSE',
          'WMT': 'NYSE', 'DIS': 'NYSE', 'NKE': 'NYSE', 'KO': 'NYSE',
          'PEP': 'NASDAQ', 'MCD': 'NYSE', 'SBUX': 'NASDAQ', 'COST': 'NASDAQ',
          'HD': 'NYSE', 'LOW': 'NYSE', 'TGT': 'NYSE',
          'XOM': 'NYSE', 'CVX': 'NYSE', 'COP': 'NYSE',
          'BA': 'NYSE', 'CAT': 'NYSE', 'GE': 'NYSE', 'MMM': 'NYSE',
          'JNJ': 'NYSE', 'PFE': 'NYSE', 'UNH': 'NYSE', 'MRK': 'NYSE',
          'GS': 'NYSE', 'MS': 'NYSE', 'C': 'NYSE', 'WFC': 'NYSE',
          'IBM': 'NYSE', 'ORCL': 'NYSE', 'SAP': 'NYSE',
        }
        const exchange = stockExchangeMap[sym] || 'NASDAQ'
        return `${exchange}:${sym}`
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
          <span className="chart-icon">◆</span>
          <span>PRICE CHART</span>
          <span className="symbol-badge">{getTradingViewSymbol()}</span>
        </div>
        <a 
          href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(getTradingViewSymbol())}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tv-link"
        >
          Open Full Chart →
        </a>
      </div>
      <div className="tradingview-container" ref={containerRef} />
    </div>
  )
}

export default memo(TradingViewChart)

