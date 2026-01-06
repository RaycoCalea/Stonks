import React, { useState } from 'react'
import Header from './components/Header'
import GlobalSearch from './components/GlobalSearch'
import MarketsView from './views/MarketsView'
import AnalysisView from './views/AnalysisView'
import ForecastView from './views/ForecastView'
import InvestmentView from './views/InvestmentView'
import SentimentView from './views/SentimentView'
import StatusBar from './components/StatusBar'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('markets')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [statusInfo, setStatusInfo] = useState(null)
  const [selectedAssets, setSelectedAssets] = useState([])

  const tabs = [
    { id: 'markets', label: 'Markets' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'investment', label: 'Investment' },
    { id: 'sentiment', label: 'Sentiment' },
  ]

  const handleUpdate = (data) => {
    setLastUpdate(new Date())
    setStatusInfo(data)
  }

  return (
    <div className="app">
      <Header />
      
      {/* Global Search Bar */}
      <GlobalSearch 
        selectedAssets={selectedAssets}
        onAssetsChange={setSelectedAssets}
      />
      
      {/* Tab Navigation */}
      <nav className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
            {tab.id === 'analysis' && selectedAssets.length >= 2 && (
              <span className="tab-badge">{selectedAssets.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {activeTab === 'markets' && (
          <MarketsView 
            selectedAssets={selectedAssets}
            onUpdate={handleUpdate}
          />
        )}
        
        {activeTab === 'analysis' && (
          <AnalysisView 
            selectedAssets={selectedAssets}
            onUpdate={handleUpdate}
          />
        )}

        {activeTab === 'forecast' && (
          <ForecastView 
            selectedAssets={selectedAssets}
            onUpdate={handleUpdate}
          />
        )}

        {activeTab === 'investment' && (
          <InvestmentView 
            selectedAssets={selectedAssets}
            onUpdate={handleUpdate}
          />
        )}

        {activeTab === 'sentiment' && (
          <SentimentView 
            selectedAssets={selectedAssets}
            onUpdate={handleUpdate}
          />
        )}
      </main>

      <StatusBar lastUpdate={lastUpdate} assetData={statusInfo} />
    </div>
  )
}

export default App
