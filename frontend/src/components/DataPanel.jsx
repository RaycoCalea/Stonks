import React from 'react'
import './DataPanel.css'

function DataPanel({ data }) {
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '—'
    if (typeof num === 'number') {
      if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T'
      if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B'
      if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M'
      if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + 'K'
      return num.toFixed(decimals)
    }
    return num
  }

  const formatPercent = (num) => {
    if (num === null || num === undefined) return '—'
    const value = Math.abs(num) > 1 ? num : num * 100
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatPrice = (num, currency = 'USD') => {
    if (num === null || num === undefined) return '—'
    if (currency === '%') return num.toFixed(3) + '%'
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  }

  const getChangeClass = (value) => {
    if (value === null || value === undefined) return ''
    return value >= 0 ? 'text-positive' : 'text-negative'
  }

  // Route to appropriate panel based on type
  const type = data.type || data.asset_type
  
  if (type === 'crypto') {
    return <CryptoDataPanel data={data} formatNumber={formatNumber} formatPercent={formatPercent} formatPrice={formatPrice} getChangeClass={getChangeClass} />
  }
  
  if (type === 'macro') {
    return <MacroDataPanel data={data} formatNumber={formatNumber} formatPercent={formatPercent} formatPrice={formatPrice} getChangeClass={getChangeClass} />
  }
  
  if (type === 'commodity' || type === 'forex' || type === 'index' || type === 'treasury') {
    return <GenericAssetPanel data={data} formatNumber={formatNumber} formatPercent={formatPercent} formatPrice={formatPrice} getChangeClass={getChangeClass} />
  }

  return <StockDataPanel data={data} formatNumber={formatNumber} formatPercent={formatPercent} formatPrice={formatPrice} getChangeClass={getChangeClass} />
}

function GenericAssetPanel({ data, formatNumber, formatPercent, formatPrice, getChangeClass }) {
  const type = data.type || data.asset_type || 'asset'
  const currency = data.currency || 'USD'
  
  const typeLabels = {
    commodity: 'COMMODITY',
    forex: 'FOREX',
    index: 'INDEX',
    treasury: 'TREASURY',
  }

  const typeIcons = {
    commodity: '◈',
    forex: '◇',
    index: '◆',
    treasury: '▣',
  }

  return (
    <div className={`data-panel ${type}`}>
      <div className="panel-header">
        <span className="panel-icon">{typeIcons[type] || '◆'}</span>
        <span className="panel-ticker">{data.ticker || data.name}</span>
        <span className="panel-type">{typeLabels[type] || type.toUpperCase()}</span>
        {data.region && <span className="panel-region">{data.region}</span>}
        {data.current_price && (
          <span className="panel-price">{formatPrice(data.current_price, currency)}</span>
        )}
        {data.price_change_percent && (
          <span className={`panel-change ${getChangeClass(data.price_change_percent)}`}>
            {data.price_change_percent >= 0 ? '▲' : '▼'} {Math.abs(data.price_change_percent).toFixed(2)}%
          </span>
        )}
      </div>

      <div className="data-sections">
        {/* Price Data Section */}
        <div className="data-section">
          <h3 className="section-title">PRICE DATA</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">Current</span>
              <span className="data-value highlight">{formatPrice(data.current_price, currency)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Change</span>
              <span className={`data-value ${getChangeClass(data.price_change)}`}>
                {data.price_change ? (data.price_change >= 0 ? '+' : '') + formatPrice(data.price_change, currency) : '—'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Change %</span>
              <span className={`data-value ${getChangeClass(data.price_change_percent)}`}>
                {data.price_change_percent ? formatPercent(data.price_change_percent / 100) : '—'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Open</span>
              <span className="data-value">{formatPrice(data.open_price, currency)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Day High</span>
              <span className="data-value">{formatPrice(data.day_high, currency)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Day Low</span>
              <span className="data-value">{formatPrice(data.day_low, currency)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Prev Close</span>
              <span className="data-value">{formatPrice(data.previous_close, currency)}</span>
            </div>
            {data.volume && (
              <div className="data-row">
                <span className="data-label">Volume</span>
                <span className="data-value">{formatNumber(data.volume, 0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 52 Week Range */}
        {(data.fifty_two_week_high || data.fifty_two_week_low) && (
          <div className="data-section">
            <h3 className="section-title">52 WEEK RANGE</h3>
            <div className="section-grid">
              <div className="data-row">
                <span className="data-label">52W High</span>
                <span className="data-value text-positive">{formatPrice(data.fifty_two_week_high, currency)}</span>
              </div>
              <div className="data-row">
                <span className="data-label">52W Low</span>
                <span className="data-value text-negative">{formatPrice(data.fifty_two_week_low, currency)}</span>
              </div>
              {data.pct_from_52w_high && (
                <div className="data-row">
                  <span className="data-label">From High</span>
                  <span className={`data-value ${getChangeClass(data.pct_from_52w_high)}`}>
                    {data.pct_from_52w_high.toFixed(1)}%
                  </span>
                </div>
              )}
              {data.pct_from_52w_low && (
                <div className="data-row">
                  <span className="data-label">From Low</span>
                  <span className={`data-value ${getChangeClass(data.pct_from_52w_low)}`}>
                    +{data.pct_from_52w_low.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technical Indicators */}
        {(data.ma_20 || data.ma_50 || data.ma_200 || data.rsi_14) && (
          <div className="data-section">
            <h3 className="section-title">TECHNICAL</h3>
            <div className="section-grid">
              {data.ma_20 && (
                <div className="data-row">
                  <span className="data-label">20D MA</span>
                  <span className={`data-value ${data.above_ma_20 ? 'text-positive' : 'text-negative'}`}>
                    {formatPrice(data.ma_20, currency)}
                  </span>
                </div>
              )}
              {data.ma_50 && (
                <div className="data-row">
                  <span className="data-label">50D MA</span>
                  <span className={`data-value ${data.above_ma_50 ? 'text-positive' : 'text-negative'}`}>
                    {formatPrice(data.ma_50, currency)}
                  </span>
                </div>
              )}
              {data.ma_200 && (
                <div className="data-row">
                  <span className="data-label">200D MA</span>
                  <span className={`data-value ${data.above_ma_200 ? 'text-positive' : 'text-negative'}`}>
                    {formatPrice(data.ma_200, currency)}
                  </span>
                </div>
              )}
              {data.rsi_14 && (
                <div className="data-row">
                  <span className="data-label">RSI (14)</span>
                  <span className={`data-value ${data.rsi_14 > 70 ? 'text-negative' : data.rsi_14 < 30 ? 'text-positive' : ''}`}>
                    {data.rsi_14.toFixed(1)}
                  </span>
                </div>
              )}
              {data.volatility_annualized && (
                <div className="data-row">
                  <span className="data-label">Volatility</span>
                  <span className="data-value">{data.volatility_annualized.toFixed(1)}%</span>
                </div>
              )}
              {data.trend && (
                <div className="data-row">
                  <span className="data-label">Trend</span>
                  <span className={`data-value ${data.trend === 'Bullish' ? 'text-positive' : data.trend === 'Bearish' ? 'text-negative' : ''}`}>
                    {data.trend}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance */}
        {(data.return_1m || data.return_3m || data.return_6m || data.return_1y || data.return_ytd) && (
          <div className="data-section">
            <h3 className="section-title">PERFORMANCE</h3>
            <div className="section-grid">
              {data.return_1w !== undefined && (
                <div className="data-row">
                  <span className="data-label">1 Week</span>
                  <span className={`data-value ${getChangeClass(data.return_1w)}`}>
                    {data.return_1w >= 0 ? '+' : ''}{data.return_1w?.toFixed(2)}%
                  </span>
                </div>
              )}
              {data.return_1m !== undefined && (
                <div className="data-row">
                  <span className="data-label">1 Month</span>
                  <span className={`data-value ${getChangeClass(data.return_1m)}`}>
                    {data.return_1m >= 0 ? '+' : ''}{data.return_1m?.toFixed(2)}%
                  </span>
                </div>
              )}
              {data.return_3m !== undefined && (
                <div className="data-row">
                  <span className="data-label">3 Months</span>
                  <span className={`data-value ${getChangeClass(data.return_3m)}`}>
                    {data.return_3m >= 0 ? '+' : ''}{data.return_3m?.toFixed(2)}%
                  </span>
                </div>
              )}
              {data.return_6m !== undefined && (
                <div className="data-row">
                  <span className="data-label">6 Months</span>
                  <span className={`data-value ${getChangeClass(data.return_6m)}`}>
                    {data.return_6m >= 0 ? '+' : ''}{data.return_6m?.toFixed(2)}%
                  </span>
                </div>
              )}
              {(data.return_1y !== undefined || data.return_ytd !== undefined) && (
                <div className="data-row">
                  <span className="data-label">YTD</span>
                  <span className={`data-value ${getChangeClass(data.return_ytd || data.return_1y)}`}>
                    {(data.return_ytd || data.return_1y) >= 0 ? '+' : ''}{(data.return_ytd || data.return_1y)?.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Asset Info */}
        {(data.category || data.unit || data.exchange_name || data.index_type || data.components) && (
          <div className="data-section">
            <h3 className="section-title">INFO</h3>
            <div className="section-grid">
              {data.full_name && (
                <div className="data-row">
                  <span className="data-label">Name</span>
                  <span className="data-value">{data.full_name}</span>
                </div>
              )}
              {data.category && (
                <div className="data-row">
                  <span className="data-label">Category</span>
                  <span className="data-value">{data.category}</span>
                </div>
              )}
              {data.index_type && (
                <div className="data-row">
                  <span className="data-label">Type</span>
                  <span className="data-value">{data.index_type}</span>
                </div>
              )}
              {data.components && (
                <div className="data-row">
                  <span className="data-label">Components</span>
                  <span className="data-value">{data.components}</span>
                </div>
              )}
              {data.unit && (
                <div className="data-row">
                  <span className="data-label">Unit</span>
                  <span className="data-value">per {data.unit}</span>
                </div>
              )}
              {data.exchange_name && (
                <div className="data-row">
                  <span className="data-label">Exchange</span>
                  <span className="data-value">{data.exchange_name}</span>
                </div>
              )}
              {data.data_points && (
                <div className="data-row">
                  <span className="data-label">Data Points</span>
                  <span className="data-value">{data.data_points} days</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Volume Analysis */}
        {(data.avg_volume_20d || data.volume_ratio) && (
          <div className="data-section">
            <h3 className="section-title">VOLUME</h3>
            <div className="section-grid">
              <div className="data-row">
                <span className="data-label">Today</span>
                <span className="data-value">{formatNumber(data.volume, 0)}</span>
              </div>
              {data.avg_volume_20d && (
                <div className="data-row">
                  <span className="data-label">20D Avg</span>
                  <span className="data-value">{formatNumber(data.avg_volume_20d, 0)}</span>
                </div>
              )}
              {data.volume_ratio && (
                <div className="data-row">
                  <span className="data-label">Vol Ratio</span>
                  <span className={`data-value ${data.volume_ratio > 1.5 ? 'text-positive' : data.volume_ratio < 0.5 ? 'text-negative' : ''}`}>
                    {data.volume_ratio.toFixed(2)}x
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {data.name && data.name !== data.ticker && !data.full_name && (
        <div className="description-section">
          <h3 className="section-title">NAME</h3>
          <p className="description-text">{data.name}</p>
        </div>
      )}
    </div>
  )
}

function MacroDataPanel({ data, formatNumber, formatPercent, formatPrice, getChangeClass }) {
  // Determine the unit scale based on indicator type
  // FRED reports different indicators in different units
  const getUnitInfo = () => {
    const symbol = (data.symbol || '').toUpperCase()
    const name = (data.name || '').toLowerCase()
    
    // Money supply, debt, GDP - FRED reports in billions, so multiply by 1B
    if (['WM1NS', 'WM2NS', 'GFDEBTN', 'GDP', 'GDPC1', 'WALCL', 'RRPONTSYD'].includes(symbol) ||
        name.includes('money supply') || name.includes('debt') || name.includes('gdp') ||
        name.includes('fed total assets') || name.includes('balance sheet')) {
      return { multiplier: 1e9, suffix: '' } // Value is in billions
    }
    
    // Rates, percentages - already in correct units
    if (name.includes('rate') || name.includes('yield') || name.includes('unemployment') ||
        name.includes('inflation') || name.includes('cpi') || name.includes('pmi') ||
        symbol.includes('UNRATE') || symbol.includes('DFF') || symbol.includes('MORTGAGE')) {
      return { multiplier: 1, suffix: '%', isPercent: true }
    }
    
    // Employment numbers - in thousands
    if (['PAYEMS', 'ICSA'].includes(symbol) || name.includes('payroll') || name.includes('claims')) {
      return { multiplier: 1e3, suffix: '' } // Value is in thousands
    }
    
    // Default - assume actual value
    return { multiplier: 1, suffix: '' }
  }
  
  const unitInfo = getUnitInfo()
  
  const formatValue = (val) => {
    if (val === null || val === undefined) return '—'
    if (typeof val !== 'number') return String(val)
    
    // If it's a percentage/rate, format as such
    if (unitInfo.isPercent) {
      return val.toFixed(2) + '%'
    }
    
    // Apply multiplier to get actual value
    const actualVal = val * unitInfo.multiplier
    
    // Format the actual value
    if (Math.abs(actualVal) >= 1e15) return (actualVal / 1e15).toFixed(2) + 'Q' // Quadrillion
    if (Math.abs(actualVal) >= 1e12) return (actualVal / 1e12).toFixed(2) + 'T' // Trillion
    if (Math.abs(actualVal) >= 1e9) return (actualVal / 1e9).toFixed(2) + 'B' // Billion
    if (Math.abs(actualVal) >= 1e6) return (actualVal / 1e6).toFixed(2) + 'M' // Million
    if (Math.abs(actualVal) >= 1e3) return (actualVal / 1e3).toFixed(2) + 'K' // Thousand
    if (Math.abs(actualVal) < 1 && Math.abs(actualVal) > 0) return actualVal.toFixed(4)
    return actualVal.toFixed(2)
  }

  const regionIcons = {
    'US': '🇺🇸',
    'EU': '🇪🇺',
    'UK': '🇬🇧',
    'ASIA': 'AS',
    'OCEANIA': 'OC',
    'LATAM': 'LA',
    'EMEA': 'EU',
    'GLOBAL': 'GL',
  }

  return (
    <div className="data-panel macro">
      <div className="panel-header">
        <span className="panel-icon">{regionIcons[data.region] || 'GL'}</span>
        <span className="panel-ticker">{data.name || data.symbol}</span>
        <span className="panel-type">MACRO</span>
        {data.region && <span className="panel-region">{data.region}</span>}
        {data.current_value !== undefined && (
          <span className="panel-price">{formatValue(data.current_value)}</span>
        )}
        {data.change_pct !== undefined && (
          <span className={`panel-change ${getChangeClass(data.change_pct)}`}>
            {data.change_pct >= 0 ? '▲' : '▼'} {Math.abs(data.change_pct).toFixed(2)}%
          </span>
        )}
      </div>

      <div className="data-sections">
        <div className="data-section">
          <h3 className="section-title">CURRENT DATA</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">Current Value</span>
              <span className="data-value">{formatValue(data.current_value)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Previous</span>
              <span className="data-value">{formatValue(data.previous_value)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Change</span>
              <span className={`data-value ${getChangeClass(data.change)}`}>
                {data.change >= 0 ? '+' : ''}{formatValue(data.change)}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Change %</span>
              <span className={`data-value ${getChangeClass(data.change_pct)}`}>
                {data.change_pct >= 0 ? '+' : ''}{data.change_pct?.toFixed(2)}%
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">YoY Change</span>
              <span className={`data-value ${getChangeClass(data.yoy_change_pct)}`}>
                {data.yoy_change_pct >= 0 ? '+' : ''}{data.yoy_change_pct?.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="data-section">
          <h3 className="section-title">RANGE</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">52W High</span>
              <span className="data-value text-positive">{formatValue(data.high_52w)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">52W Low</span>
              <span className="data-value text-negative">{formatValue(data.low_52w)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">All-Time High</span>
              <span className="data-value text-positive">{formatValue(data.all_time_high)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">All-Time Low</span>
              <span className="data-value text-negative">{formatValue(data.all_time_low)}</span>
            </div>
          </div>
        </div>

        <div className="data-section">
          <h3 className="section-title">DATA INFO</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">Symbol</span>
              <span className="data-value">{data.symbol}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Source</span>
              <span className="data-value">{data.source}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Data Points</span>
              <span className="data-value">{data.data_points}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Start Date</span>
              <span className="data-value">{data.start_date}</span>
            </div>
            <div className="data-row">
              <span className="data-label">End Date</span>
              <span className="data-value">{data.end_date}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="description-section">
        <h3 className="section-title">ABOUT</h3>
        <p className="description-text">{data.name}</p>
      </div>
    </div>
  )
}

function StockDataPanel({ data, formatNumber, formatPercent, formatPrice, getChangeClass }) {
  return (
    <div className="data-panel stock">
      <div className="panel-header">
        <span className="panel-icon">◆</span>
        <span className="panel-ticker">{data.ticker}</span>
        <span className="panel-type">EQUITY</span>
        {data.sector && <span className="panel-region">{data.sector}</span>}
        {data.current_price && (
          <span className="panel-price">{formatPrice(data.current_price)}</span>
        )}
        {data.price_change_percent && (
          <span className={`panel-change ${getChangeClass(data.price_change_percent)}`}>
            {data.price_change_percent >= 0 ? '▲' : '▼'} {Math.abs(data.price_change_percent).toFixed(2)}%
          </span>
        )}
      </div>

      <div className="data-sections">
        {/* Price Data */}
        <div className="data-section">
          <h3 className="section-title">PRICE DATA</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">Current</span>
              <span className="data-value highlight">{formatPrice(data.current_price)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Change</span>
              <span className={`data-value ${getChangeClass(data.price_change)}`}>
                {data.price_change ? (data.price_change >= 0 ? '+' : '') + formatPrice(data.price_change) : '—'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Change %</span>
              <span className={`data-value ${getChangeClass(data.price_change_percent)}`}>
                {data.price_change_percent ? (data.price_change_percent >= 0 ? '+' : '') + data.price_change_percent.toFixed(2) + '%' : '—'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Open</span>
              <span className="data-value">{formatPrice(data.open_price)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Day High</span>
              <span className="data-value text-positive">{formatPrice(data.day_high)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Day Low</span>
              <span className="data-value text-negative">{formatPrice(data.day_low)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Prev Close</span>
              <span className="data-value">{formatPrice(data.previous_close)}</span>
            </div>
          </div>
        </div>

        {/* 52 Week & MAs */}
        <div className="data-section">
          <h3 className="section-title">52 WEEK & TREND</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">52W High</span>
              <span className="data-value text-positive">{formatPrice(data.fifty_two_week_high)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">52W Low</span>
              <span className="data-value text-negative">{formatPrice(data.fifty_two_week_low)}</span>
            </div>
            {data.pct_from_52w_high && (
              <div className="data-row">
                <span className="data-label">From High</span>
                <span className={`data-value ${getChangeClass(data.pct_from_52w_high)}`}>
                  {data.pct_from_52w_high.toFixed(1)}%
                </span>
              </div>
            )}
            {data.ma_50 && (
              <div className="data-row">
                <span className="data-label">50D MA</span>
                <span className={`data-value ${data.above_ma_50 ? 'text-positive' : 'text-negative'}`}>
                  {formatPrice(data.ma_50)}
                </span>
              </div>
            )}
            {data.ma_200 && (
              <div className="data-row">
                <span className="data-label">200D MA</span>
                <span className={`data-value ${data.above_ma_200 ? 'text-positive' : 'text-negative'}`}>
                  {formatPrice(data.ma_200)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Overview */}
        {(data.name || data.industry || data.exchange) && (
          <div className="data-section">
            <h3 className="section-title">OVERVIEW</h3>
            <div className="section-grid">
              {data.name && (
                <div className="data-row">
                  <span className="data-label">Name</span>
                  <span className="data-value">{data.name.substring(0, 25)}</span>
                </div>
              )}
              {data.sector && (
                <div className="data-row">
                  <span className="data-label">Sector</span>
                  <span className="data-value">{data.sector}</span>
                </div>
              )}
              {data.industry && (
                <div className="data-row">
                  <span className="data-label">Industry</span>
                  <span className="data-value">{data.industry.substring(0, 20)}</span>
                </div>
              )}
              {data.country && (
                <div className="data-row">
                  <span className="data-label">Country</span>
                  <span className="data-value">{data.country}</span>
                </div>
              )}
              {data.employees && (
                <div className="data-row">
                  <span className="data-label">Employees</span>
                  <span className="data-value">{formatNumber(data.employees, 0)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Valuation */}
        {(data.market_cap || data.pe_ratio || data.price_to_book) && (
          <div className="data-section">
            <h3 className="section-title">VALUATION</h3>
            <div className="section-grid">
              {data.market_cap && (
                <div className="data-row">
                  <span className="data-label">Market Cap</span>
                  <span className="data-value">${formatNumber(data.market_cap)}</span>
                </div>
              )}
              {data.enterprise_value && (
                <div className="data-row">
                  <span className="data-label">Ent. Value</span>
                  <span className="data-value">${formatNumber(data.enterprise_value)}</span>
                </div>
              )}
              {data.pe_ratio && (
                <div className="data-row">
                  <span className="data-label">P/E (TTM)</span>
                  <span className="data-value">{data.pe_ratio.toFixed(2)}</span>
                </div>
              )}
              {data.forward_pe && (
                <div className="data-row">
                  <span className="data-label">Fwd P/E</span>
                  <span className="data-value">{data.forward_pe.toFixed(2)}</span>
                </div>
              )}
              {data.peg_ratio && (
                <div className="data-row">
                  <span className="data-label">PEG Ratio</span>
                  <span className="data-value">{data.peg_ratio.toFixed(2)}</span>
                </div>
              )}
              {data.price_to_book && (
                <div className="data-row">
                  <span className="data-label">P/B</span>
                  <span className="data-value">{data.price_to_book.toFixed(2)}</span>
                </div>
              )}
              {data.price_to_sales && (
                <div className="data-row">
                  <span className="data-label">P/S</span>
                  <span className="data-value">{data.price_to_sales.toFixed(2)}</span>
                </div>
              )}
              {data.ev_to_ebitda && (
                <div className="data-row">
                  <span className="data-label">EV/EBITDA</span>
                  <span className="data-value">{data.ev_to_ebitda.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profitability */}
        {(data.profit_margin || data.return_on_equity || data.operating_margin) && (
          <div className="data-section">
            <h3 className="section-title">PROFITABILITY</h3>
            <div className="section-grid">
              {data.profit_margin && (
                <div className="data-row">
                  <span className="data-label">Profit Margin</span>
                  <span className={`data-value ${getChangeClass(data.profit_margin)}`}>
                    {(data.profit_margin * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {data.operating_margin && (
                <div className="data-row">
                  <span className="data-label">Op. Margin</span>
                  <span className={`data-value ${getChangeClass(data.operating_margin)}`}>
                    {(data.operating_margin * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {data.gross_margin && (
                <div className="data-row">
                  <span className="data-label">Gross Margin</span>
                  <span className={`data-value ${getChangeClass(data.gross_margin)}`}>
                    {(data.gross_margin * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {data.return_on_equity && (
                <div className="data-row">
                  <span className="data-label">ROE</span>
                  <span className={`data-value ${getChangeClass(data.return_on_equity)}`}>
                    {(data.return_on_equity * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {data.return_on_assets && (
                <div className="data-row">
                  <span className="data-label">ROA</span>
                  <span className={`data-value ${getChangeClass(data.return_on_assets)}`}>
                    {(data.return_on_assets * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financials */}
        {(data.revenue || data.ebitda || data.net_income) && (
          <div className="data-section">
            <h3 className="section-title">FINANCIALS</h3>
            <div className="section-grid">
              {data.revenue && (
                <div className="data-row">
                  <span className="data-label">Revenue</span>
                  <span className="data-value">${formatNumber(data.revenue)}</span>
                </div>
              )}
              {data.revenue_growth && (
                <div className="data-row">
                  <span className="data-label">Rev Growth</span>
                  <span className={`data-value ${getChangeClass(data.revenue_growth)}`}>
                    {(data.revenue_growth * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {data.ebitda && (
                <div className="data-row">
                  <span className="data-label">EBITDA</span>
                  <span className="data-value">${formatNumber(data.ebitda)}</span>
                </div>
              )}
              {data.net_income && (
                <div className="data-row">
                  <span className="data-label">Net Income</span>
                  <span className="data-value">${formatNumber(data.net_income)}</span>
                </div>
              )}
              {data.eps && (
                <div className="data-row">
                  <span className="data-label">EPS (TTM)</span>
                  <span className="data-value">${data.eps.toFixed(2)}</span>
                </div>
              )}
              {data.forward_eps && (
                <div className="data-row">
                  <span className="data-label">EPS (Fwd)</span>
                  <span className="data-value">${data.forward_eps.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Balance Sheet */}
        {(data.total_cash || data.total_debt || data.debt_to_equity) && (
          <div className="data-section">
            <h3 className="section-title">BALANCE SHEET</h3>
            <div className="section-grid">
              {data.total_cash && (
                <div className="data-row">
                  <span className="data-label">Cash</span>
                  <span className="data-value text-positive">${formatNumber(data.total_cash)}</span>
                </div>
              )}
              {data.total_debt && (
                <div className="data-row">
                  <span className="data-label">Debt</span>
                  <span className="data-value text-negative">${formatNumber(data.total_debt)}</span>
                </div>
              )}
              {data.debt_to_equity && (
                <div className="data-row">
                  <span className="data-label">D/E Ratio</span>
                  <span className={`data-value ${data.debt_to_equity > 100 ? 'text-negative' : ''}`}>
                    {data.debt_to_equity.toFixed(1)}%
                  </span>
                </div>
              )}
              {data.current_ratio && (
                <div className="data-row">
                  <span className="data-label">Current Ratio</span>
                  <span className={`data-value ${data.current_ratio < 1 ? 'text-negative' : 'text-positive'}`}>
                    {data.current_ratio.toFixed(2)}
                  </span>
                </div>
              )}
              {data.book_value && (
                <div className="data-row">
                  <span className="data-label">Book Value</span>
                  <span className="data-value">${data.book_value.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dividends */}
        {(data.dividend_yield || data.dividend_rate) && (
          <div className="data-section">
            <h3 className="section-title">DIVIDENDS</h3>
            <div className="section-grid">
              {data.dividend_rate && (
                <div className="data-row">
                  <span className="data-label">Annual Div</span>
                  <span className="data-value">${data.dividend_rate.toFixed(2)}</span>
                </div>
              )}
              {data.dividend_yield && (
                <div className="data-row">
                  <span className="data-label">Yield</span>
                  <span className="data-value text-positive">{(data.dividend_yield * 100).toFixed(2)}%</span>
                </div>
              )}
              {data.payout_ratio && (
                <div className="data-row">
                  <span className="data-label">Payout Ratio</span>
                  <span className={`data-value ${data.payout_ratio > 0.8 ? 'text-negative' : ''}`}>
                    {(data.payout_ratio * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trading */}
        <div className="data-section">
          <h3 className="section-title">TRADING</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">Volume</span>
              <span className="data-value">{formatNumber(data.volume, 0)}</span>
            </div>
            {data.avg_volume && (
              <div className="data-row">
                <span className="data-label">Avg Volume</span>
                <span className="data-value">{formatNumber(data.avg_volume, 0)}</span>
              </div>
            )}
            {data.beta && (
              <div className="data-row">
                <span className="data-label">Beta</span>
                <span className={`data-value ${data.beta > 1.5 ? 'text-negative' : data.beta < 0.8 ? 'text-positive' : ''}`}>
                  {data.beta.toFixed(2)}
                </span>
              </div>
            )}
            {data.short_percent_float && (
              <div className="data-row">
                <span className="data-label">Short % Float</span>
                <span className={`data-value ${data.short_percent_float > 0.1 ? 'text-negative' : ''}`}>
                  {(data.short_percent_float * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Analyst Targets */}
        {(data.target_mean || data.analyst_recommendation) && (
          <div className="data-section">
            <h3 className="section-title">ANALYSTS</h3>
            <div className="section-grid">
              {data.analyst_recommendation && (
                <div className="data-row">
                  <span className="data-label">Rating</span>
                  <span className={`data-value ${data.analyst_recommendation === 'buy' ? 'text-positive' : data.analyst_recommendation === 'sell' ? 'text-negative' : ''}`}>
                    {data.analyst_recommendation.toUpperCase()}
                  </span>
                </div>
              )}
              {data.target_mean && (
                <div className="data-row">
                  <span className="data-label">Target (Mean)</span>
                  <span className={`data-value ${data.target_mean > data.current_price ? 'text-positive' : 'text-negative'}`}>
                    ${data.target_mean.toFixed(2)}
                  </span>
                </div>
              )}
              {data.target_high && (
                <div className="data-row">
                  <span className="data-label">Target High</span>
                  <span className="data-value text-positive">${data.target_high.toFixed(2)}</span>
                </div>
              )}
              {data.target_low && (
                <div className="data-row">
                  <span className="data-label">Target Low</span>
                  <span className="data-value text-negative">${data.target_low.toFixed(2)}</span>
                </div>
              )}
              {data.analyst_count && (
                <div className="data-row">
                  <span className="data-label"># Analysts</span>
                  <span className="data-value">{data.analyst_count}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ownership */}
        {(data.held_by_insiders || data.held_by_institutions) && (
          <div className="data-section">
            <h3 className="section-title">OWNERSHIP</h3>
            <div className="section-grid">
              {data.held_by_institutions && (
                <div className="data-row">
                  <span className="data-label">Institutions</span>
                  <span className="data-value">{(data.held_by_institutions * 100).toFixed(1)}%</span>
                </div>
              )}
              {data.held_by_insiders && (
                <div className="data-row">
                  <span className="data-label">Insiders</span>
                  <span className="data-value">{(data.held_by_insiders * 100).toFixed(1)}%</span>
                </div>
              )}
              {data.shares_outstanding && (
                <div className="data-row">
                  <span className="data-label">Shares Out</span>
                  <span className="data-value">{formatNumber(data.shares_outstanding)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {data.description && (
        <div className="description-section">
          <h3 className="section-title">ABOUT</h3>
          <p className="description-text">{data.description}</p>
        </div>
      )}

      {data.website && (
        <div className="links-section">
          <a href={data.website} target="_blank" rel="noopener noreferrer" className="external-link">
            Website →
          </a>
        </div>
      )}
    </div>
  )
}

function CryptoDataPanel({ data, formatNumber, formatPercent, formatPrice, getChangeClass }) {
  return (
    <div className="data-panel crypto">
      <div className="panel-header">
        <span className="panel-icon">₿</span>
        <span className="panel-ticker">{data.symbol}</span>
        <span className="panel-type">CRYPTO</span>
        {data.market_cap_rank && <span className="panel-rank">#{data.market_cap_rank}</span>}
        {data.current_price && (
          <span className="panel-price">{formatPrice(data.current_price)}</span>
        )}
        {data.price_change_percentage_24h && (
          <span className={`panel-change ${getChangeClass(data.price_change_percentage_24h)}`}>
            {data.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(data.price_change_percentage_24h).toFixed(2)}%
          </span>
        )}
      </div>

      <div className="data-sections">
        {/* Overview */}
        <div className="data-section">
          <h3 className="section-title">OVERVIEW</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">Name</span>
              <span className="data-value">{data.name}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Symbol</span>
              <span className="data-value">{data.symbol}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Rank</span>
              <span className="data-value highlight">#{data.market_cap_rank || '—'}</span>
            </div>
            {data.genesis_date && (
              <div className="data-row">
                <span className="data-label">Genesis</span>
                <span className="data-value">{data.genesis_date}</span>
              </div>
            )}
            {data.hashing_algorithm && (
              <div className="data-row">
                <span className="data-label">Algorithm</span>
                <span className="data-value">{data.hashing_algorithm}</span>
              </div>
            )}
            {data.categories && data.categories.length > 0 && (
              <div className="data-row">
                <span className="data-label">Category</span>
                <span className="data-value">{data.categories[0]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Price Data */}
        <div className="data-section">
          <h3 className="section-title">PRICE DATA</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">Price (USD)</span>
              <span className="data-value highlight">{formatPrice(data.current_price)}</span>
            </div>
            {data.price_btc && (
              <div className="data-row">
                <span className="data-label">Price (BTC)</span>
                <span className="data-value">{data.price_btc.toFixed(8)} BTC</span>
              </div>
            )}
            <div className="data-row">
              <span className="data-label">24H High</span>
              <span className="data-value text-positive">{formatPrice(data.high_24h)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">24H Low</span>
              <span className="data-value text-negative">{formatPrice(data.low_24h)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">ATH</span>
              <span className="data-value">{formatPrice(data.ath)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">ATH Change</span>
              <span className={`data-value ${getChangeClass(data.ath_change_percentage)}`}>
                {data.ath_change_percentage?.toFixed(1)}%
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">ATL</span>
              <span className="data-value">{formatPrice(data.atl)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">ATL Change</span>
              <span className={`data-value ${getChangeClass(data.atl_change_percentage)}`}>
                +{data.atl_change_percentage?.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="data-section">
          <h3 className="section-title">PERFORMANCE</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">24H</span>
              <span className={`data-value ${getChangeClass(data.price_change_percentage_24h)}`}>
                {data.price_change_percentage_24h >= 0 ? '+' : ''}{data.price_change_percentage_24h?.toFixed(2)}%
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">7D</span>
              <span className={`data-value ${getChangeClass(data.price_change_percentage_7d)}`}>
                {data.price_change_percentage_7d >= 0 ? '+' : ''}{data.price_change_percentage_7d?.toFixed(2)}%
              </span>
            </div>
            {data.price_change_percentage_14d && (
              <div className="data-row">
                <span className="data-label">14D</span>
                <span className={`data-value ${getChangeClass(data.price_change_percentage_14d)}`}>
                  {data.price_change_percentage_14d >= 0 ? '+' : ''}{data.price_change_percentage_14d?.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="data-row">
              <span className="data-label">30D</span>
              <span className={`data-value ${getChangeClass(data.price_change_percentage_30d)}`}>
                {data.price_change_percentage_30d >= 0 ? '+' : ''}{data.price_change_percentage_30d?.toFixed(2)}%
              </span>
            </div>
            {data.price_change_percentage_60d && (
              <div className="data-row">
                <span className="data-label">60D</span>
                <span className={`data-value ${getChangeClass(data.price_change_percentage_60d)}`}>
                  {data.price_change_percentage_60d >= 0 ? '+' : ''}{data.price_change_percentage_60d?.toFixed(2)}%
                </span>
              </div>
            )}
            {data.price_change_percentage_200d && (
              <div className="data-row">
                <span className="data-label">200D</span>
                <span className={`data-value ${getChangeClass(data.price_change_percentage_200d)}`}>
                  {data.price_change_percentage_200d >= 0 ? '+' : ''}{data.price_change_percentage_200d?.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="data-row">
              <span className="data-label">1Y</span>
              <span className={`data-value ${getChangeClass(data.price_change_percentage_1y)}`}>
                {data.price_change_percentage_1y >= 0 ? '+' : ''}{data.price_change_percentage_1y?.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Market Data */}
        <div className="data-section">
          <h3 className="section-title">MARKET DATA</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">Market Cap</span>
              <span className="data-value">${formatNumber(data.market_cap)}</span>
            </div>
            {data.market_cap_change_percentage_24h && (
              <div className="data-row">
                <span className="data-label">MCap 24H Δ</span>
                <span className={`data-value ${getChangeClass(data.market_cap_change_percentage_24h)}`}>
                  {data.market_cap_change_percentage_24h >= 0 ? '+' : ''}{data.market_cap_change_percentage_24h?.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="data-row">
              <span className="data-label">FDV</span>
              <span className="data-value">${formatNumber(data.fully_diluted_valuation)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">24H Volume</span>
              <span className="data-value">${formatNumber(data.total_volume)}</span>
            </div>
            {data.volume_market_cap_ratio && (
              <div className="data-row">
                <span className="data-label">Vol/MCap</span>
                <span className={`data-value ${data.volume_market_cap_ratio > 10 ? 'text-positive' : ''}`}>
                  {data.volume_market_cap_ratio.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Supply */}
        <div className="data-section">
          <h3 className="section-title">SUPPLY</h3>
          <div className="section-grid">
            <div className="data-row">
              <span className="data-label">Circulating</span>
              <span className="data-value">{formatNumber(data.circulating_supply)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Total</span>
              <span className="data-value">{formatNumber(data.total_supply)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Max</span>
              <span className="data-value">{data.max_supply ? formatNumber(data.max_supply) : '∞'}</span>
            </div>
            {data.supply_percentage && (
              <div className="data-row">
                <span className="data-label">% Circulating</span>
                <span className="data-value">{data.supply_percentage.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Scores */}
        {(data.coingecko_score || data.developer_score || data.community_score) && (
          <div className="data-section">
            <h3 className="section-title">SCORES</h3>
            <div className="section-grid">
              {data.coingecko_score && (
                <div className="data-row">
                  <span className="data-label">CoinGecko</span>
                  <span className="data-value">{data.coingecko_score.toFixed(1)}/100</span>
                </div>
              )}
              {data.developer_score && (
                <div className="data-row">
                  <span className="data-label">Developer</span>
                  <span className="data-value">{data.developer_score.toFixed(1)}/100</span>
                </div>
              )}
              {data.community_score && (
                <div className="data-row">
                  <span className="data-label">Community</span>
                  <span className="data-value">{data.community_score.toFixed(1)}/100</span>
                </div>
              )}
              {data.liquidity_score && (
                <div className="data-row">
                  <span className="data-label">Liquidity</span>
                  <span className="data-value">{data.liquidity_score.toFixed(1)}/100</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Community */}
        {(data.twitter_followers || data.reddit_subscribers || data.telegram_channel_user_count) && (
          <div className="data-section">
            <h3 className="section-title">COMMUNITY</h3>
            <div className="section-grid">
              {data.twitter_followers && (
                <div className="data-row">
                  <span className="data-label">Twitter</span>
                  <span className="data-value">{formatNumber(data.twitter_followers, 0)}</span>
                </div>
              )}
              {data.reddit_subscribers && (
                <div className="data-row">
                  <span className="data-label">Reddit Subs</span>
                  <span className="data-value">{formatNumber(data.reddit_subscribers, 0)}</span>
                </div>
              )}
              {data.reddit_active_accounts && (
                <div className="data-row">
                  <span className="data-label">Reddit Active</span>
                  <span className="data-value">{formatNumber(data.reddit_active_accounts, 0)}</span>
                </div>
              )}
              {data.telegram_channel_user_count && (
                <div className="data-row">
                  <span className="data-label">Telegram</span>
                  <span className="data-value">{formatNumber(data.telegram_channel_user_count, 0)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Developer */}
        {(data.github_stars || data.github_forks || data.github_commit_count_4_weeks) && (
          <div className="data-section">
            <h3 className="section-title">DEVELOPER</h3>
            <div className="section-grid">
              {data.github_stars && (
                <div className="data-row">
                  <span className="data-label">GitHub Stars</span>
                  <span className="data-value">{formatNumber(data.github_stars, 0)}</span>
                </div>
              )}
              {data.github_forks && (
                <div className="data-row">
                  <span className="data-label">Forks</span>
                  <span className="data-value">{formatNumber(data.github_forks, 0)}</span>
                </div>
              )}
              {data.github_commit_count_4_weeks && (
                <div className="data-row">
                  <span className="data-label">Commits (4w)</span>
                  <span className="data-value">{data.github_commit_count_4_weeks}</span>
                </div>
              )}
              {data.github_pull_requests_merged && (
                <div className="data-row">
                  <span className="data-label">PRs Merged</span>
                  <span className="data-value">{formatNumber(data.github_pull_requests_merged, 0)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {data.description && (
        <div className="description-section">
          <h3 className="section-title">ABOUT</h3>
          <p className="description-text">{data.description}</p>
        </div>
      )}

      {(data.homepage || data.blockchain_site || data.github || data.subreddit) && (
        <div className="links-section">
          {data.homepage && (
            <a href={data.homepage} target="_blank" rel="noopener noreferrer" className="external-link">
              Website →
            </a>
          )}
          {data.blockchain_site && (
            <a href={data.blockchain_site} target="_blank" rel="noopener noreferrer" className="external-link">
              Explorer →
            </a>
          )}
          {data.github && (
            <a href={data.github} target="_blank" rel="noopener noreferrer" className="external-link">
              GitHub →
            </a>
          )}
          {data.subreddit && (
            <a href={data.subreddit} target="_blank" rel="noopener noreferrer" className="external-link">
              Reddit →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default DataPanel
