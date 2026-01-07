"""
Crypto Fetcher - Uses CoinGecko API with comprehensive data extraction
"""
import requests
from datetime import datetime
from typing import Dict, Any, List
from .base import get_cache, set_cache, HEADERS

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

CRYPTO_MAP = {
    # Major coins
    "btc": "bitcoin", "eth": "ethereum", "usdt": "tether", "bnb": "binancecoin",
    "xrp": "ripple", "usdc": "usd-coin", "sol": "solana", "ada": "cardano",
    "doge": "dogecoin", "trx": "tron", "dot": "polkadot", "matic": "matic-network",
    "ltc": "litecoin", "shib": "shiba-inu", "avax": "avalanche-2", "link": "chainlink",
    "atom": "cosmos", "uni": "uniswap", "xlm": "stellar", "xmr": "monero",
    "etc": "ethereum-classic", "bch": "bitcoin-cash", "near": "near", "arb": "arbitrum",
    "op": "optimism", "apt": "aptos", "fil": "filecoin", "algo": "algorand",
    "vet": "vechain", "ftm": "fantom", "sand": "the-sandbox", "mana": "decentraland",
    "aave": "aave", "mkr": "maker", "pepe": "pepe", "bonk": "bonk",
    # Full names
    "bitcoin": "bitcoin", "ethereum": "ethereum", "solana": "solana",
    "cardano": "cardano", "dogecoin": "dogecoin", "ripple": "ripple",
    "polkadot": "polkadot", "polygon": "matic-network", "avalanche": "avalanche-2",
    "chainlink": "chainlink", "litecoin": "litecoin", "cosmos": "cosmos",
    "uniswap": "uniswap", "stellar": "stellar", "monero": "monero",
    # DeFi tokens
    "crv": "curve-dao-token", "comp": "compound-governance-token", "snx": "havven",
    "sushi": "sushi", "yfi": "yearn-finance", "cake": "pancakeswap-token",
    "ldo": "lido-dao", "rpl": "rocket-pool", "gmx": "gmx", "dydx": "dydx",
    # Layer 2s
    "imx": "immutable-x", "lrc": "loopring", "zksync": "zksync", "starknet": "starknet",
    # Memecoins
    "floki": "floki", "wif": "dogwifcoin", "brett": "brett",
}


class CryptoFetcher:
    """Fetches cryptocurrency data from CoinGecko"""
    
    @staticmethod
    def resolve(query: str) -> str:
        """Resolve ticker/name to CoinGecko ID"""
        return CRYPTO_MAP.get(query.lower().strip(), query.lower().strip())
    
    @staticmethod
    def fetch_data(coin_id: str) -> Dict[str, Any]:
        """Fetch comprehensive crypto data including all available metrics"""
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
                    "tickers": "true",
                    "market_data": "true",
                    "community_data": "true",
                    "developer_data": "true",
                    "sparkline": "true"
                },
                headers=HEADERS,
                timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
            md = data.get('market_data', {})
            community = data.get('community_data', {})
            developer = data.get('developer_data', {})
            
            # Calculate additional metrics
            current_price = md.get('current_price', {}).get('usd')
            market_cap = md.get('market_cap', {}).get('usd')
            volume_24h = md.get('total_volume', {}).get('usd')
            circulating = md.get('circulating_supply')
            
            # Volume/Market Cap ratio (liquidity indicator)
            vol_mc_ratio = (volume_24h / market_cap * 100) if market_cap and volume_24h else None
            
            # Supply metrics
            supply_pct = (circulating / md.get('total_supply') * 100) if circulating and md.get('total_supply') else None
            
            result = {
                # Basic info
                "id": data.get('id'),
                "symbol": data.get('symbol', '').upper(),
                "name": data.get('name'),
                "asset_type": "crypto",
                "source": "coingecko",
                "genesis_date": data.get('genesis_date'),
                "hashing_algorithm": data.get('hashing_algorithm'),
                "categories": data.get('categories', [])[:3],
                
                # Price data
                "current_price": current_price,
                "price_btc": md.get('current_price', {}).get('btc'),
                "price_eth": md.get('current_price', {}).get('eth'),
                "high_24h": md.get('high_24h', {}).get('usd'),
                "low_24h": md.get('low_24h', {}).get('usd'),
                
                # Price changes
                "price_change_24h": md.get('price_change_24h'),
                "price_change_percentage_24h": md.get('price_change_percentage_24h'),
                "price_change_percentage_7d": md.get('price_change_percentage_7d'),
                "price_change_percentage_14d": md.get('price_change_percentage_14d'),
                "price_change_percentage_30d": md.get('price_change_percentage_30d'),
                "price_change_percentage_60d": md.get('price_change_percentage_60d'),
                "price_change_percentage_200d": md.get('price_change_percentage_200d'),
                "price_change_percentage_1y": md.get('price_change_percentage_1y'),
                
                # Market cap data
                "market_cap": market_cap,
                "market_cap_rank": data.get('market_cap_rank'),
                "market_cap_change_24h": md.get('market_cap_change_24h'),
                "market_cap_change_percentage_24h": md.get('market_cap_change_percentage_24h'),
                "fully_diluted_valuation": md.get('fully_diluted_valuation', {}).get('usd'),
                
                # Volume
                "total_volume": volume_24h,
                "volume_market_cap_ratio": vol_mc_ratio,
                
                # Supply
                "circulating_supply": circulating,
                "total_supply": md.get('total_supply'),
                "max_supply": md.get('max_supply'),
                "supply_percentage": supply_pct,
                
                # ATH/ATL
                "ath": md.get('ath', {}).get('usd'),
                "ath_change_percentage": md.get('ath_change_percentage', {}).get('usd'),
                "ath_date": md.get('ath_date', {}).get('usd'),
                "atl": md.get('atl', {}).get('usd'),
                "atl_change_percentage": md.get('atl_change_percentage', {}).get('usd'),
                "atl_date": md.get('atl_date', {}).get('usd'),
                
                # Community metrics
                "twitter_followers": community.get('twitter_followers'),
                "reddit_subscribers": community.get('reddit_subscribers'),
                "reddit_active_accounts": community.get('reddit_accounts_active_48h'),
                "telegram_channel_user_count": community.get('telegram_channel_user_count'),
                "facebook_likes": community.get('facebook_likes'),
                
                # Developer metrics
                "github_forks": developer.get('forks'),
                "github_stars": developer.get('stars'),
                "github_subscribers": developer.get('subscribers'),
                "github_total_issues": developer.get('total_issues'),
                "github_closed_issues": developer.get('closed_issues'),
                "github_pull_requests_merged": developer.get('pull_requests_merged'),
                "github_commit_count_4_weeks": developer.get('commit_count_4_weeks'),
                
                # Scores
                "coingecko_score": data.get('coingecko_score'),
                "developer_score": data.get('developer_score'),
                "community_score": data.get('community_score'),
                "liquidity_score": data.get('liquidity_score'),
                "public_interest_score": data.get('public_interest_score'),
                
                # Links
                "homepage": data.get('links', {}).get('homepage', [None])[0],
                "blockchain_site": data.get('links', {}).get('blockchain_site', [None])[0],
                "subreddit": data.get('links', {}).get('subreddit_url'),
                "twitter_handle": data.get('links', {}).get('twitter_screen_name'),
                "github": data.get('links', {}).get('repos_url', {}).get('github', [None])[0],
                
                # Sparkline (7d)
                "sparkline_7d": md.get('sparkline_7d', {}).get('price', [])[-168:],  # Last 7 days hourly
                
                # Description
                "description": (data.get('description', {}).get('en', '') or '')[:800],
                
                # Last updated
                "last_updated": data.get('last_updated'),
            }
            
            set_cache(cache_key, result)
            print(f"[CRYPTO] Success: {resolved} - ${current_price}")
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

