"""
Sentiment Analysis Module - Comprehensive news scanning and sentiment analysis
Uses multiple free news APIs and advanced sentiment analysis
Scans last 30 days of news for comprehensive coverage with cumulative scoring
"""
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List
import re
import time
import json
from .base import get_cache, set_cache, HEADERS

# Expanded sentiment word lists with weighted scoring
POSITIVE_WORDS = {
    # Strong positive (weight: 2)
    'surge': 2, 'soar': 2, 'skyrocket': 2, 'boom': 2, 'breakout': 2,
    'moonshot': 2, 'parabolic': 2, 'explosive': 2, 'unprecedented': 2,
    # Standard positive (weight: 1)
    'rally': 1, 'gain': 1, 'rise': 1, 'jump': 1, 'climb': 1, 'bull': 1, 'bullish': 1,
    'spike': 1, 'rebound': 1, 'recover': 1, 'uptick': 1, 'upbeat': 1,
    'profit': 1, 'growth': 1, 'revenue': 1, 'earnings': 1, 'dividend': 1,
    'outperform': 1, 'beat': 1, 'exceed': 1, 'record': 1, 'high': 1, 'peak': 1,
    'strong': 1, 'positive': 1, 'optimistic': 1, 'confident': 1, 'favorable': 1,
    'promising': 1, 'encouraging': 1, 'healthy': 1, 'robust': 1, 'solid': 1, 'stable': 1,
    'upgrade': 1, 'buy': 1, 'accumulate': 1, 'recommend': 1, 'endorse': 1, 'approve': 1,
    'launch': 1, 'expand': 1, 'acquire': 1, 'partner': 1, 'innovate': 1, 'disrupt': 1,
    'breakthrough': 1, 'success': 1, 'victory': 1, 'win': 1, 'deal': 1, 'agreement': 1,
    'partnership': 1, 'collaboration': 1, 'investment': 1, 'funding': 1, 'ipo': 1,
    'adoption': 1, 'milestone': 1, 'achievement': 1, 'momentum': 1, 'upside': 1,
}

NEGATIVE_WORDS = {
    # Strong negative (weight: 2)
    'crash': 2, 'collapse': 2, 'plummet': 2, 'tank': 2, 'disaster': 2,
    'catastrophe': 2, 'bankrupt': 2, 'fraud': 2, 'scam': 2, 'ponzi': 2,
    # Standard negative (weight: 1)
    'plunge': 1, 'fall': 1, 'drop': 1, 'decline': 1, 'tumble': 1, 'sink': 1, 'bear': 1, 'bearish': 1,
    'dive': 1, 'slump': 1, 'selloff': 1, 'downturn': 1, 'downgrade': 1,
    'loss': 1, 'deficit': 1, 'debt': 1, 'miss': 1, 'disappoint': 1, 'shortfall': 1, 'underperform': 1,
    'writedown': 1, 'impairment': 1, 'default': 1, 'bankruptcy': 1, 'insolvency': 1,
    'weak': 1, 'negative': 1, 'pessimistic': 1, 'uncertain': 1, 'volatile': 1, 'risky': 1,
    'concerning': 1, 'troubling': 1, 'alarming': 1, 'worrying': 1, 'struggling': 1,
    'sell': 1, 'avoid': 1, 'cut': 1, 'layoff': 1, 'restructure': 1, 'divest': 1,
    'terminate': 1, 'suspend': 1, 'halt': 1, 'delay': 1, 'cancel': 1, 'recall': 1,
    'lawsuit': 1, 'investigation': 1, 'probe': 1, 'scandal': 1, 'violation': 1,
    'fine': 1, 'penalty': 1, 'sanction': 1, 'warning': 1, 'crisis': 1, 'recession': 1,
    'inflation': 1, 'war': 1, 'conflict': 1, 'tariff': 1, 'restriction': 1, 'ban': 1, 'shortage': 1,
    'liquidation': 1, 'hack': 1, 'exploit': 1, 'rug': 1, 'dump': 1, 'manipulation': 1,
}


def analyze_text_sentiment(text: str) -> Dict[str, Any]:
    """Analyze sentiment of text using weighted word matching"""
    if not text:
        return {"score": 0, "label": "neutral", "positive": 0, "negative": 0}
    
    text_lower = text.lower()
    words = set(re.findall(r'\b\w+\b', text_lower))
    
    positive_matches = {}
    negative_matches = {}
    pos_score = 0
    neg_score = 0
    
    for word in words:
        if word in POSITIVE_WORDS:
            positive_matches[word] = POSITIVE_WORDS[word]
            pos_score += POSITIVE_WORDS[word]
        if word in NEGATIVE_WORDS:
            negative_matches[word] = NEGATIVE_WORDS[word]
            neg_score += NEGATIVE_WORDS[word]
    
    total = pos_score + neg_score
    if total == 0:
        score = 0
    else:
        score = (pos_score - neg_score) / max(total, 1)
    
    if score > 0.2:
        label = "positive"
    elif score < -0.2:
        label = "negative"
    else:
        label = "neutral"
    
    return {
        "score": round(score, 3),
        "label": label,
        "positive_words": list(positive_matches.keys()),
        "negative_words": list(negative_matches.keys()),
        "pos_weight": pos_score,
        "neg_weight": neg_score,
    }


def fetch_news_google(query: str, days_back: int = 30) -> List[Dict]:
    """Fetch news from Google News RSS - multiple queries for broader coverage"""
    try:
        import xml.etree.ElementTree as ET
        
        all_news = []
        
        # Multiple search variations for broader coverage
        search_variations = [
            f"{query} stock",
            f"{query} market",
            f"{query} finance",
            f"{query} price",
            f"{query} news",
            f"{query} trading",
            f"{query} investment",
            f"{query} analysis",
        ]
        
        for search_query in search_variations:
            url = f"https://news.google.com/rss/search?q={search_query}&hl=en-US&gl=US&ceid=US:en"
            try:
                resp = requests.get(url, headers=HEADERS, timeout=10)
                if resp.status_code != 200:
                    continue
                
                root = ET.fromstring(resp.content)
                items = root.findall('.//item')
                
                cutoff_date = datetime.now() - timedelta(days=days_back)
                
                for item in items[:40]:  # More articles per query
                    title = item.find('title')
                    link = item.find('link')
                    pub_date = item.find('pubDate')
                    source = item.find('source')
                    
                    if title is None:
                        continue
                    
                    title_text = title.text or ''
                    
                    # Skip duplicates
                    if any(n['title'] == title_text for n in all_news):
                        continue
                    
                    # Parse date and filter by age
                    pub_str = pub_date.text if pub_date is not None else ''
                    article_date = None
                    try:
                        from email.utils import parsedate_to_datetime
                        article_date = parsedate_to_datetime(pub_str)
                        if article_date.replace(tzinfo=None) < cutoff_date:
                            continue
                    except:
                        pass
                    
                    sentiment = analyze_text_sentiment(title_text)
                    
                    all_news.append({
                        "title": title_text,
                        "url": link.text if link is not None else '',
                        "published": article_date.isoformat() if article_date else pub_str,
                        "source": source.text if source is not None else 'Google News',
                        "sentiment": sentiment,
                    })
            except Exception as e:
                print(f"[SENTIMENT] Query '{search_query}' failed: {e}")
                continue
            
            time.sleep(0.15)  # Rate limit
        
        return all_news
    except Exception as e:
        print(f"[SENTIMENT] Google News error: {e}")
        return []


def fetch_yahoo_finance_news(ticker: str) -> List[Dict]:
    """Fetch news from Yahoo Finance"""
    try:
        url = f"https://query1.finance.yahoo.com/v7/finance/news?symbols={ticker}"
        headers = {**HEADERS, 'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers, timeout=10)
        
        if resp.status_code != 200:
            return []
        
        data = resp.json()
        news = []
        
        for item in data.get('articles', data.get('items', []))[:20]:
            title = item.get('title', '')
            if not title:
                continue
            
            pub_time = item.get('providerPublishTime', item.get('published_at', 0))
            try:
                if isinstance(pub_time, (int, float)):
                    article_date = datetime.fromtimestamp(pub_time)
                else:
                    article_date = datetime.fromisoformat(str(pub_time))
            except:
                article_date = datetime.now()
            
            sentiment = analyze_text_sentiment(title)
            news.append({
                "title": title,
                "url": item.get('link', item.get('url', '')),
                "published": article_date.isoformat(),
                "source": item.get('publisher', 'Yahoo Finance'),
                "sentiment": sentiment,
            })
        
        return news
    except Exception as e:
        print(f"[SENTIMENT] Yahoo Finance News error: {e}")
        return []


def fetch_finviz_news(ticker: str) -> List[Dict]:
    """Fetch news from Finviz (stocks only)"""
    try:
        url = f"https://finviz.com/quote.ashx?t={ticker}"
        headers = {**HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        resp = requests.get(url, headers=headers, timeout=10)
        
        if resp.status_code != 200:
            return []
        
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        news = []
        news_table = soup.find('table', {'id': 'news-table'})
        if news_table:
            rows = news_table.find_all('tr')[:25]
            current_date = datetime.now()
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 2:
                    link = cells[1].find('a')
                    if link:
                        title = link.text.strip()
                        href = link.get('href', '')
                        time_str = cells[0].text.strip()
                        
                        # Parse date from time string
                        try:
                            if 'Today' in time_str or ':' in time_str.split()[0]:
                                article_date = current_date
                            else:
                                # Format: "Dec-13-24 HH:MM"
                                date_part = time_str.split()[0]
                                article_date = datetime.strptime(date_part, '%b-%d-%y')
                        except:
                            article_date = current_date
                        
                        sentiment = analyze_text_sentiment(title)
                        news.append({
                            "title": title,
                            "url": href,
                            "published": article_date.isoformat(),
                            "source": "Finviz",
                            "sentiment": sentiment,
                        })
        
        return news
    except Exception as e:
        print(f"[SENTIMENT] Finviz error: {e}")
        return []


def fetch_marketwatch_news(query: str) -> List[Dict]:
    """Fetch news from MarketWatch"""
    try:
        url = f"https://www.marketwatch.com/search?q={query}&mod=mw_latestnews"
        headers = {**HEADERS, 'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers, timeout=10)
        
        if resp.status_code != 200:
            return []
        
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        news = []
        articles = soup.find_all('div', class_='article__content')[:15]
        
        for article in articles:
            title_elem = article.find(['h3', 'a'])
            if title_elem:
                title = title_elem.text.strip()
                link = title_elem.get('href', '')
                if not link and title_elem.find('a'):
                    link = title_elem.find('a').get('href', '')
                
                sentiment = analyze_text_sentiment(title)
                news.append({
                    "title": title,
                    "url": link,
                    "published": datetime.now().isoformat(),
                    "source": "MarketWatch",
                    "sentiment": sentiment,
                })
        
        return news
    except Exception as e:
        print(f"[SENTIMENT] MarketWatch error: {e}")
        return []


def fetch_reddit_sentiment(query: str) -> List[Dict]:
    """Fetch from Reddit (uses public JSON endpoint)"""
    try:
        subreddits = ['wallstreetbets', 'stocks', 'investing', 'cryptocurrency', 
                      'stockmarket', 'options', 'thetagang', 'dividends',
                      'CryptoCurrency', 'Bitcoin', 'ethtrader', 'altcoin']
        all_posts = []
        
        for sub in subreddits:
            try:
                url = f"https://www.reddit.com/r/{sub}/search.json?q={query}&sort=new&limit=15&restrict_sr=1"
                headers = {'User-Agent': 'StonksTerminal/2.0'}
                resp = requests.get(url, headers=headers, timeout=8)
                
                if resp.status_code == 200:
                    data = resp.json()
                    for post in data.get('data', {}).get('children', []):
                        post_data = post.get('data', {})
                        title = post_data.get('title', '')
                        selftext = post_data.get('selftext', '')[:300]  # First 300 chars
                        
                        if title:
                            full_text = f"{title} {selftext}"
                            sentiment = analyze_text_sentiment(full_text)
                            
                            created = post_data.get('created_utc', 0)
                            article_date = datetime.fromtimestamp(created) if created else datetime.now()
                            
                            all_posts.append({
                                "title": title,
                                "url": f"https://reddit.com{post_data.get('permalink', '')}",
                                "published": article_date.isoformat(),
                                "source": f"r/{sub}",
                                "sentiment": sentiment,
                                "upvotes": post_data.get('ups', 0),
                                "comments": post_data.get('num_comments', 0),
                            })
            except:
                continue
            time.sleep(0.2)
        
        return all_posts
    except Exception as e:
        print(f"[SENTIMENT] Reddit error: {e}")
        return []


def fetch_stocktwits(query: str) -> List[Dict]:
    """Fetch from StockTwits"""
    try:
        url = f"https://api.stocktwits.com/api/2/streams/symbol/{query}.json"
        headers = {'User-Agent': 'StonksTerminal/2.0'}
        resp = requests.get(url, headers=headers, timeout=10)
        
        if resp.status_code != 200:
            return []
        
        data = resp.json()
        posts = []
        
        for msg in data.get('messages', [])[:20]:
            body = msg.get('body', '')
            if not body:
                continue
            
            # StockTwits has its own sentiment
            st_sentiment = msg.get('entities', {}).get('sentiment', {})
            st_basic = st_sentiment.get('basic', 'neutral')
            
            # Map StockTwits sentiment to our scale
            if st_basic == 'Bullish':
                score = 0.7
                label = 'positive'
            elif st_basic == 'Bearish':
                score = -0.7
                label = 'negative'
            else:
                # Fallback to our analysis
                sentiment = analyze_text_sentiment(body)
                score = sentiment['score']
                label = sentiment['label']
            
            created = msg.get('created_at', '')
            try:
                article_date = datetime.strptime(created, '%Y-%m-%dT%H:%M:%SZ')
            except:
                article_date = datetime.now()
            
            posts.append({
                "title": body[:200] + ('...' if len(body) > 200 else ''),
                "url": f"https://stocktwits.com/message/{msg.get('id', '')}",
                "published": article_date.isoformat(),
                "source": "StockTwits",
                "sentiment": {
                    "score": score,
                    "label": label,
                    "stocktwits_sentiment": st_basic,
                }
            })
        
        return posts
    except Exception as e:
        print(f"[SENTIMENT] StockTwits error: {e}")
        return []


def fetch_crypto_news(query: str) -> List[Dict]:
    """Fetch crypto-specific news from multiple sources"""
    news = []
    
    # CoinGecko trending
    try:
        url = "https://api.coingecko.com/api/v3/search/trending"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            for coin in data.get('coins', [])[:5]:
                item = coin.get('item', {})
                if query.lower() in item.get('name', '').lower() or query.lower() in item.get('symbol', '').lower():
                    news.append({
                        "title": f"{item['name']} is trending #{item.get('market_cap_rank', 'N/A')} on CoinGecko",
                        "url": f"https://coingecko.com/en/coins/{item.get('id', '')}",
                        "published": datetime.now().isoformat(),
                        "source": "CoinGecko Trending",
                        "sentiment": {"score": 0.4, "label": "positive"},
                    })
    except:
        pass
    
    # CryptoCompare news
    try:
        url = f"https://min-api.cryptocompare.com/data/v2/news/?categories={query}"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            for article in data.get('Data', [])[:20]:
                title = article.get('title', '')
                body = article.get('body', '')[:200]
                sentiment = analyze_text_sentiment(title + ' ' + body)
                
                pub_time = article.get('published_on', 0)
                article_date = datetime.fromtimestamp(pub_time) if pub_time else datetime.now()
                
                news.append({
                    "title": title,
                    "url": article.get('url', ''),
                    "published": article_date.isoformat(),
                    "source": article.get('source', 'CryptoCompare'),
                    "sentiment": sentiment,
                })
    except Exception as e:
        print(f"[SENTIMENT] CryptoCompare error: {e}")
    
    # The Block (crypto news)
    try:
        url = f"https://www.theblock.co/api/articles?q={query}"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            for article in data.get('data', [])[:10]:
                title = article.get('title', '')
                sentiment = analyze_text_sentiment(title)
                news.append({
                    "title": title,
                    "url": article.get('url', ''),
                    "published": article.get('published_at', datetime.now().isoformat()),
                    "source": "The Block",
                    "sentiment": sentiment,
                })
    except:
        pass
    
    return news


def fetch_seeking_alpha(ticker: str) -> List[Dict]:
    """Fetch from Seeking Alpha"""
    try:
        url = f"https://seekingalpha.com/api/v3/symbols/{ticker}/news"
        headers = {**HEADERS, 'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers, timeout=10)
        
        if resp.status_code != 200:
            return []
        
        data = resp.json()
        news = []
        
        for item in data.get('data', [])[:15]:
            attrs = item.get('attributes', {})
            title = attrs.get('title', '')
            if title:
                sentiment = analyze_text_sentiment(title)
                pub_date = attrs.get('publishOn', datetime.now().isoformat())
                
                news.append({
                    "title": title,
                    "url": f"https://seekingalpha.com{attrs.get('path', '')}",
                    "published": pub_date,
                    "source": "Seeking Alpha",
                    "sentiment": sentiment,
                })
        
        return news
    except Exception as e:
        print(f"[SENTIMENT] Seeking Alpha error: {e}")
        return []


def get_sentiment(query: str, asset_type: str = "stock") -> Dict[str, Any]:
    """
    Get comprehensive sentiment analysis for an asset.
    Scans multiple sources over the last 30 days.
    Returns cumulative sentiment scoring (+1 for positive, -1 for negative).
    """
    cache_key = f"sentiment:{query}:{asset_type}:v3"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    print(f"[SENTIMENT] Comprehensive scan for {query} ({asset_type})")
    
    all_news = []
    sources_scanned = []
    
    # Google News (primary source)
    google_news = fetch_news_google(query, days_back=30)
    all_news.extend(google_news)
    if google_news:
        sources_scanned.append(f"Google News ({len(google_news)})")
    
    # Yahoo Finance News
    yahoo_news = fetch_yahoo_finance_news(query)
    all_news.extend(yahoo_news)
    if yahoo_news:
        sources_scanned.append(f"Yahoo Finance ({len(yahoo_news)})")
    
    # Reddit sentiment
    reddit_posts = fetch_reddit_sentiment(query)
    all_news.extend(reddit_posts)
    if reddit_posts:
        sources_scanned.append(f"Reddit ({len(reddit_posts)})")
    
    # StockTwits
    stocktwits_posts = fetch_stocktwits(query)
    all_news.extend(stocktwits_posts)
    if stocktwits_posts:
        sources_scanned.append(f"StockTwits ({len(stocktwits_posts)})")
    
    # Asset-specific sources
    if asset_type == "stock":
        finviz_news = fetch_finviz_news(query)
        all_news.extend(finviz_news)
        if finviz_news:
            sources_scanned.append(f"Finviz ({len(finviz_news)})")
        
        seeking_alpha = fetch_seeking_alpha(query)
        all_news.extend(seeking_alpha)
        if seeking_alpha:
            sources_scanned.append(f"Seeking Alpha ({len(seeking_alpha)})")
        
        marketwatch = fetch_marketwatch_news(query)
        all_news.extend(marketwatch)
        if marketwatch:
            sources_scanned.append(f"MarketWatch ({len(marketwatch)})")
    
    elif asset_type == "crypto":
        crypto_news = fetch_crypto_news(query)
        all_news.extend(crypto_news)
        if crypto_news:
            sources_scanned.append(f"Crypto Sources ({len(crypto_news)})")
    
    if not all_news:
        return {"error": "Could not fetch news data from any source"}
    
    # Deduplicate by title similarity
    seen_titles = set()
    unique_news = []
    for article in all_news:
        title_key = article['title'][:50].lower()
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_news.append(article)
    
    # Parse dates and add to articles
    for article in unique_news:
        pub = article.get('published', '')
        if pub:
            try:
                if 'T' in pub:
                    dt = datetime.fromisoformat(pub.replace('Z', '+00:00').split('+')[0])
                else:
                    from email.utils import parsedate_to_datetime
                    dt = parsedate_to_datetime(pub)
                article['date'] = dt.strftime('%Y-%m-%d')
                article['datetime'] = dt.isoformat()
            except:
                article['date'] = None
                article['datetime'] = None
        else:
            article['date'] = None
            article['datetime'] = None
    
    # Build sentiment timeline (by day) with cumulative scoring
    daily_sentiment = {}
    for article in unique_news:
        date = article.get('date')
        if not date:
            continue
        
        if date not in daily_sentiment:
            daily_sentiment[date] = {
                'date': date,
                'articles': [],
                'scores': [],
                'positive': 0,
                'negative': 0,
                'neutral': 0,
                'cumulative_points': 0,  # +1 for positive, -1 for negative
            }
        
        score = article.get('sentiment', {}).get('score', 0)
        label = article.get('sentiment', {}).get('label', 'neutral')
        daily_sentiment[date]['scores'].append(score)
        
        # Add +1/-1 cumulative scoring
        if label == 'positive' or score > 0.15:
            daily_sentiment[date]['positive'] += 1
            daily_sentiment[date]['cumulative_points'] += 1  # +1 for positive
        elif label == 'negative' or score < -0.15:
            daily_sentiment[date]['negative'] += 1
            daily_sentiment[date]['cumulative_points'] -= 1  # -1 for negative
        else:
            daily_sentiment[date]['neutral'] += 1
        
        daily_sentiment[date]['articles'].append({
            'title': article.get('title', '')[:100],
            'source': article.get('source', ''),
            'score': score,
            'label': label,
        })
    
    # Calculate daily averages and create timeline with cumulative score
    timeline = []
    running_cumulative = 0  # Running total of +1/-1
    
    for date in sorted(daily_sentiment.keys()):
        day_data = daily_sentiment[date]
        scores = day_data['scores']
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # Update running cumulative
        running_cumulative += day_data['cumulative_points']
        
        timeline.append({
            'date': date,
            'avg_sentiment': round(avg_score, 3),
            'article_count': len(scores),
            'positive': day_data['positive'],
            'negative': day_data['negative'],
            'neutral': day_data['neutral'],
            'daily_cumulative': day_data['cumulative_points'],  # +1/-1 for this day
            'running_cumulative': running_cumulative,  # Running total
            'articles': day_data['articles'][:5],  # Top 5 articles for each day
        })
    
    # Calculate cumulative/rolling sentiment
    if len(timeline) >= 3:
        for i in range(len(timeline)):
            # 3-day rolling average
            start_idx = max(0, i - 2)
            rolling_scores = [timeline[j]['avg_sentiment'] for j in range(start_idx, i + 1)]
            timeline[i]['rolling_avg'] = round(sum(rolling_scores) / len(rolling_scores), 3)
            
            # 7-day rolling average
            start_idx_7 = max(0, i - 6)
            rolling_scores_7 = [timeline[j]['avg_sentiment'] for j in range(start_idx_7, i + 1)]
            timeline[i]['rolling_avg_7d'] = round(sum(rolling_scores_7) / len(rolling_scores_7), 3)
    
    # Sort news by datetime for display (newest first)
    unique_news.sort(key=lambda x: x.get('datetime') or '', reverse=True)
    
    # Calculate aggregate sentiment
    sentiments = [n.get('sentiment', {}).get('score', 0) for n in unique_news if n.get('sentiment')]
    
    if sentiments:
        avg_sentiment = sum(sentiments) / len(sentiments)
        weighted_sentiment = sum(s * (1 + abs(s)) for s in sentiments) / len(sentiments)
        positive_count = sum(1 for s in sentiments if s > 0.15)
        negative_count = sum(1 for s in sentiments if s < -0.15)
        neutral_count = len(sentiments) - positive_count - negative_count
        max_positive = max(sentiments) if sentiments else 0
        max_negative = min(sentiments) if sentiments else 0
        
        # Total cumulative score (+1/-1)
        total_cumulative = positive_count - negative_count
    else:
        avg_sentiment = weighted_sentiment = 0
        positive_count = negative_count = neutral_count = 0
        max_positive = max_negative = 0
        total_cumulative = 0
    
    # Detect trend direction
    trend = "STABLE"
    trend_strength = 0
    if len(timeline) >= 5:
        recent = [t['avg_sentiment'] for t in timeline[-3:]]
        older = [t['avg_sentiment'] for t in timeline[-6:-3]]
        if recent and older:
            recent_avg = sum(recent) / len(recent)
            older_avg = sum(older) / len(older)
            diff = recent_avg - older_avg
            trend_strength = abs(diff)
            if diff > 0.1:
                trend = "IMPROVING"
            elif diff < -0.1:
                trend = "DETERIORATING"
    
    # Determine overall sentiment with more nuance
    if weighted_sentiment > 0.3:
        overall = "VERY BULLISH"
        signal = "STRONG BUY"
    elif weighted_sentiment > 0.15:
        overall = "BULLISH"
        signal = "BUY"
    elif weighted_sentiment < -0.3:
        overall = "VERY BEARISH"
        signal = "STRONG SELL"
    elif weighted_sentiment < -0.15:
        overall = "BEARISH"
        signal = "SELL"
    else:
        overall = "NEUTRAL"
        signal = "HOLD"
    
    result = {
        "query": query,
        "asset_type": asset_type,
        "timestamp": datetime.now().isoformat(),
        "scan_period": "30 days",
        "articles_analyzed": len(unique_news),
        "sources_scanned": sources_scanned,
        "aggregate": {
            "score": round(avg_sentiment, 3),
            "weighted_score": round(weighted_sentiment, 3),
            "overall": overall,
            "signal": signal,
            "trend": trend,
            "trend_strength": round(trend_strength, 3),
            "positive_count": positive_count,
            "negative_count": negative_count,
            "neutral_count": neutral_count,
            "cumulative_score": total_cumulative,  # Total +1/-1 score
            "strongest_positive": round(max_positive, 3),
            "strongest_negative": round(max_negative, 3),
        },
        "timeline": timeline,
        "news": unique_news[:40],  # Return top 40 articles
    }
    
    set_cache(cache_key, result)
    return result
