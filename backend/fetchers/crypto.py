"""
Crypto Fetcher - Uses CoinGecko API
"""
import requests
from datetime import datetime
from typing import Dict, Any, List
from .base import get_cache, set_cache, HEADERS

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

CRYPTO_MAP = {
    "btc": "bitcoin", "eth": "ethereum", "usdt": "tether", "bnb": "binancecoin",
    "xrp": "ripple", "usdc": "usd-coin", "sol": "solana", "ada": "cardano",
    "doge": "dogecoin", "trx": "tron", "dot": "polkadot", "matic": "matic-network",
    "ltc": "litecoin", "shib": "shiba-inu", "avax": "avalanche-2", "link": "chainlink",
    "atom": "cosmos", "uni": "uniswap", "xlm": "stellar", "xmr": "monero",
    "etc": "ethereum-classic", "bch": "bitcoin-cash", "near": "near", "arb": "arbitrum",
    "op": "optimism", "apt": "aptos", "fil": "filecoin", "algo": "algorand",
    "vet": "vechain", "ftm": "fantom", "sand": "the-sandbox", "mana": "decentraland",
    "aave": "aave", "mkr": "maker", "pepe": "pepe", "bonk": "bonk",
    "bitcoin": "bitcoin", "ethereum": "ethereum", "solana": "solana",
    "cardano": "cardano", "dogecoin": "dogecoin", "ripple": "ripple",
}


class CryptoFetcher:
    """Fetches cryptocurrency data from CoinGecko"""
    
    @staticmethod
    def resolve(query: str) -> str:
        """Resolve ticker/name to CoinGecko ID"""
        return CRYPTO_MAP.get(query.lower().strip(), query.lower().strip())
    
    @staticmethod
    def fetch_data(coin_id: str) -> Dict[str, Any]:
        """Fetch detailed crypto data"""
        resolved = CryptoFetcher.resolve(coin_id)
        cache_key = f"crypto:{resolved}"
        
        cached = get_cache(cache_key)
        if cached:
            return cached
        
        try:
            print(f"[CRYPTO] Fetching {resolved}")
            resp = requests.get(
                f"{COINGECKO_BASE}/coins/{resolved}",
                params={
                    "localization": "false",
                    "tickers": "false",
                    "market_data": "true",
                    "community_data": "true",
                    "sparkline": "false"
                },
                headers=HEADERS,
                timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
            md = data.get('market_data', {})
            
            result = {
                "id": data.get('id'),
                "symbol": data.get('symbol', '').upper(),
                "name": data.get('name'),
                "asset_type": "crypto",
                "source": "coingecko",
                "current_price": md.get('current_price', {}).get('usd'),
                "market_cap": md.get('market_cap', {}).get('usd'),
                "market_cap_rank": data.get('market_cap_rank'),
                "total_volume": md.get('total_volume', {}).get('usd'),
                "high_24h": md.get('high_24h', {}).get('usd'),
                "low_24h": md.get('low_24h', {}).get('usd'),
                "price_change_24h": md.get('price_change_24h'),
                "price_change_percentage_24h": md.get('price_change_percentage_24h'),
                "price_change_percentage_7d": md.get('price_change_percentage_7d'),
                "price_change_percentage_30d": md.get('price_change_percentage_30d'),
                "circulating_supply": md.get('circulating_supply'),
                "total_supply": md.get('total_supply'),
                "max_supply": md.get('max_supply'),
                "ath": md.get('ath', {}).get('usd'),
                "ath_change_percentage": md.get('ath_change_percentage', {}).get('usd'),
                "atl": md.get('atl', {}).get('usd'),
                "description": (data.get('description', {}).get('en', '') or '')[:500],
            }
            set_cache(cache_key, result)
            print(f"[CRYPTO] Success: {resolved}")
            return result
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                return {"error": f"Crypto '{coin_id}' not found"}
            return {"error": str(e)}
        except Exception as e:
            print(f"[CRYPTO] Error: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def fetch_history(coin_id: str, days: int = 90) -> Dict[str, Any]:
        """Fetch historical price data"""
        resolved = CryptoFetcher.resolve(coin_id)
        cache_key = f"crypto_hist:{resolved}:{days}"
        
        cached = get_cache(cache_key)
        if cached:
            return cached
        
        try:
            print(f"[CRYPTO HIST] Fetching {resolved} ({days}d)")
            resp = requests.get(
                f"{COINGECKO_BASE}/coins/{resolved}/market_chart",
                params={"vs_currency": "usd", "days": days},
                headers=HEADERS,
                timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
            
            prices = data.get('prices', [])
            volumes = data.get('total_volumes', [])
            
            records = []
            for i, (ts, price) in enumerate(prices):
                records.append({
                    "Date": datetime.fromtimestamp(ts/1000).strftime('%Y-%m-%d'),
                    "Close": price,
                    "Volume": volumes[i][1] if i < len(volumes) else None,
                })
            
            result = {"ticker": resolved, "data_points": len(records), "data": records}
            set_cache(cache_key, result)
            return result
            
        except Exception as e:
            print(f"[CRYPTO HIST] Error: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def search(query: str) -> List[Dict]:
        """Search for cryptocurrencies"""
        if query.lower() in CRYPTO_MAP:
            cid = CRYPTO_MAP[query.lower()]
            return [{"id": cid, "symbol": query.upper(), "name": cid.replace('-', ' ').title(), "type": "crypto"}]
        
        try:
            resp = requests.get(f"{COINGECKO_BASE}/search", params={"query": query}, timeout=10)
            if resp.ok:
                coins = sorted(resp.json().get('coins', []), key=lambda x: x.get('market_cap_rank') or 9999)
                return [{"id": c['id'], "symbol": c['symbol'].upper(), "name": c['name'], "type": "crypto"} for c in coins[:5]]
        except:
            pass
        return []

