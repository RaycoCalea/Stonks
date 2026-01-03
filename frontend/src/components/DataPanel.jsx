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
    commodity: '🛢️',
    forex: '💱',
    index: '📊',
    treasury: '🏛️',
  }

  return (
    <div className={`data-panel ${type}`}>
      <div className="panel-header">
        <span className="panel-icon">{typeIcons[type] || '◆'}</span>
        <span className="panel-ticker">{data.ticker || data.name}</span>
        <span className="panel-type">{typeLabels[type] || type.toUpperCase()}</span>
        {data.current_price && (
          <span className="panel-price">{formatPrice(data.current_price, currency)}</span>
        )}
      </div>

      <div className="data-sections">
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
                {formatPrice(data.price_change, currency)}
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
            </div>
          </div>
        )}

        {data.extra_data && Object.keys(data.extra_data).length > 0 && (
          <div className="data-section">
            <h3 className="section-title">ADDITIONAL INFO</h3>
            <div className="section-grid">
              {Object.entries(data.extra_data).filter(([k, v]) => v !== null && v !== undefined).slice(0, 10).map(([key, value]) => (
                <div key={key} className="data-row">
                  <span className="data-label">{key.replace(/_/g, ' ').toUpperCase()}</span>
                  <span className="data-value">
                    {typeof value === 'number' ? formatNumber(value) : String(value).substring(0, 50)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {data.name && data.name !== data.ticker && (
        <div className="description-section">
          <h3 className="section-title">NAME</h3>
          <p className="description-text">{data.name}</p>
        </div>
      )}
    </div>
  )
}

function StockDataPanel({ data, formatNumber, formatPercent, formatPrice, getChangeClass }) {
  const sections = [
    {
      title: 'PRICE DATA',
      items: [
        { label: 'Current', value: formatPrice(data.current_price), highlight: true },
        { label: 'Change', value: formatPrice(data.price_change), className: getChangeClass(data.price_change) },
        { label: 'Change %', value: data.price_change_percent ? `${data.price_change_percent >= 0 ? '+' : ''}${data.price_change_percent?.toFixed(2)}%` : '—', className: getChangeClass(data.price_change_percent) },
        { label: 'Open', value: formatPrice(data.open_price) },
        { label: 'Day High', value: formatPrice(data.day_high) },
        { label: 'Day Low', value: formatPrice(data.day_low) },
        { label: 'Prev Close', value: formatPrice(data.previous_close) },
        { label: '52W High', value: formatPrice(data.fifty_two_week_high) },
        { label: '52W Low', value: formatPrice(data.fifty_two_week_low) },
      ]
    },
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Name', value: data.name },
        { label: 'Sector', value: data.sector },
        { label: 'Industry', value: data.industry },
        { label: 'Exchange', value: data.exchange },
        { label: 'Currency', value: data.currency },
      ].filter(item => item.value)
    },
    {
      title: 'VALUATION',
      items: [
        { label: 'Market Cap', value: data.market_cap ? '$' + formatNumber(data.market_cap) : '—' },
        { label: 'P/E Ratio', value: data.pe_ratio ? formatNumber(data.pe_ratio) : '—' },
        { label: 'Dividend Yield', value: data.dividend_yield ? formatPercent(data.dividend_yield) : '—' },
      ].filter(item => item.value !== '—')
    },
    {
      title: 'TRADING',
      items: [
        { label: 'Volume', value: formatNumber(data.volume, 0) },
      ]
    },
  ].filter(section => section.items.length > 0)

  return (
    <div className="data-panel stock">
      <div className="panel-header">
        <span className="panel-icon">◆</span>
        <span className="panel-ticker">{data.ticker}</span>
        <span className="panel-type">EQUITY</span>
        {data.current_price && (
          <span className="panel-price">{formatPrice(data.current_price)}</span>
        )}
      </div>

      <div className="data-sections">
        {sections.map((section) => (
          <div key={section.title} className="data-section">
            <h3 className="section-title">{section.title}</h3>
            <div className="section-grid">
              {section.items.map((item) => (
                <div key={item.label} className="data-row">
                  <span className="data-label">{item.label}</span>
                  <span className={`data-value ${item.highlight ? 'highlight' : ''} ${item.className || ''}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {data.description && (
        <div className="description-section">
          <h3 className="section-title">DESCRIPTION</h3>
          <p className="description-text">{data.description}</p>
        </div>
      )}

      {data.website && (
        <div className="links-section">
          <a href={data.website} target="_blank" rel="noopener noreferrer" className="external-link">
            {data.website}
          </a>
        </div>
      )}
    </div>
  )
}

function CryptoDataPanel({ data, formatNumber, formatPercent, formatPrice, getChangeClass }) {
  const sections = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Name', value: data.name },
        { label: 'Symbol', value: data.symbol },
        { label: 'Rank', value: `#${data.market_cap_rank || '—'}` },
        { label: 'Genesis Date', value: data.genesis_date || '—' },
        { label: 'CoinGecko Score', value: formatNumber(data.coingecko_score) }
      ]
    },
    {
      title: 'PRICE DATA',
      items: [
        { label: 'Current Price', value: formatPrice(data.current_price), highlight: true },
        { label: '24H High', value: formatPrice(data.high_24h) },
        { label: '24H Low', value: formatPrice(data.low_24h) },
        { label: 'ATH', value: formatPrice(data.ath) },
        { label: 'ATH Change', value: formatNumber(data.ath_change_percentage) + '%', className: getChangeClass(data.ath_change_percentage) },
        { label: 'ATL', value: formatPrice(data.atl) },
        { label: 'ATL Change', value: formatNumber(data.atl_change_percentage) + '%', className: getChangeClass(data.atl_change_percentage) }
      ]
    },
    {
      title: 'PRICE CHANGES',
      items: [
        { label: '24H', value: formatNumber(data.price_change_percentage_24h) + '%', className: getChangeClass(data.price_change_percentage_24h) },
        { label: '7D', value: formatNumber(data.price_change_percentage_7d) + '%', className: getChangeClass(data.price_change_percentage_7d) },
        { label: '30D', value: formatNumber(data.price_change_percentage_30d) + '%', className: getChangeClass(data.price_change_percentage_30d) },
        { label: '1Y', value: formatNumber(data.price_change_percentage_1y) + '%', className: getChangeClass(data.price_change_percentage_1y) }
      ]
    },
    {
      title: 'MARKET DATA',
      items: [
        { label: 'Market Cap', value: '$' + formatNumber(data.market_cap) },
        { label: 'FDV', value: '$' + formatNumber(data.fully_diluted_valuation) },
        { label: '24H Volume', value: '$' + formatNumber(data.total_volume) },
      ]
    },
    {
      title: 'SUPPLY',
      items: [
        { label: 'Circulating', value: formatNumber(data.circulating_supply) },
        { label: 'Total', value: formatNumber(data.total_supply) },
        { label: 'Max', value: data.max_supply ? formatNumber(data.max_supply) : '∞' }
      ]
    },
    {
      title: 'COMMUNITY',
      items: [
        { label: 'Twitter', value: formatNumber(data.twitter_followers, 0) },
        { label: 'Reddit', value: formatNumber(data.reddit_subscribers, 0) },
      ].filter(item => item.value !== '—')
    },
  ]

  return (
    <div className="data-panel crypto">
      <div className="panel-header">
        <span className="panel-icon">₿</span>
        <span className="panel-ticker">{data.symbol}</span>
        <span className="panel-type">CRYPTO</span>
        {data.current_price && (
          <span className="panel-price">{formatPrice(data.current_price)}</span>
        )}
      </div>

      <div className="data-sections">
        {sections.map((section) => (
          <div key={section.title} className="data-section">
            <h3 className="section-title">{section.title}</h3>
            <div className="section-grid">
              {section.items.map((item) => (
                <div key={item.label} className="data-row">
                  <span className="data-label">{item.label}</span>
                  <span className={`data-value ${item.highlight ? 'highlight' : ''} ${item.className || ''}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {data.description && (
        <div className="description-section">
          <h3 className="section-title">DESCRIPTION</h3>
          <p className="description-text">{data.description}</p>
        </div>
      )}

      {(data.homepage || data.blockchain_site) && (
        <div className="links-section">
          {data.homepage && (
            <a href={data.homepage} target="_blank" rel="noopener noreferrer" className="external-link">
              Website
            </a>
          )}
          {data.blockchain_site && (
            <a href={data.blockchain_site} target="_blank" rel="noopener noreferrer" className="external-link">
              Explorer
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default DataPanel
