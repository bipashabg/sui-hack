'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Flame, Star, X, Bell, Rocket, ExternalLink } from 'lucide-react';

interface Coin {
    id: string;
    rank: number;
    name: string;
    symbol: string;
    current_price: number;
    price_change_percentage_1h_in_currency: number;
    price_change_percentage_24h_in_currency: number;
    price_change_percentage_7d_in_currency: number;
    total_volume: number;
    market_cap: number;
    image: string;
    ath_date?: string;
}

interface TrendingCoin {
    name: string;
    price: number;
    change: number;
}

interface NewCoinNotification {
    id: string;
    coin: Coin;
    timestamp: number;
    dismissed: boolean;
}

const MemeCoinsDashboard = () => {
    const [coins, setCoins] = useState<Coin[]>([]);
    const [marketStats, setMarketStats] = useState({
        totalMarketCap: 0,
        marketCapChange: 0,
        tradingVolume24h: 0,
    });
    const [trendingCoins, setTrendingCoins] = useState<TrendingCoin[]>([]);
    const [topGainers, setTopGainers] = useState<TrendingCoin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [knownCoinIds, setKnownCoinIds] = useState<Set<string>>(new Set());
    const [notifications, setNotifications] = useState<NewCoinNotification[]>([]);
    const [notificationCount, setNotificationCount] = useState(0);

    const isNewCoin = (coin: any) => {
        // Consider a coin "new" if it was added to market within last 7 days
        // or if we haven't seen it before
        const athDate = new Date(coin.ath_date);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return !knownCoinIds.has(coin.id) && (athDate > weekAgo || coin.market_cap < 10000000);
    };

    const addNotification = useCallback((coin: Coin) => {
        const notification: NewCoinNotification = {
            id: `${coin.id}-${Date.now()}`,
            coin,
            timestamp: Date.now(),
            dismissed: false
        };
        
        setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep max 10 notifications
        setNotificationCount(prev => prev + 1);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            setNotifications(prev => 
                prev.map(n => n.id === notification.id ? { ...n, dismissed: true } : n)
            );
        }, 10000);
    }, []);

    const dismissNotification = (notificationId: string) => {
        setNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, dismissed: true } : n)
        );
    };

    const fetchMemeCoinData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch more coins to increase chance of finding new ones
            const coinsResponse = await fetch('https://api.coingecko.com/api/v3/coins/markets?' + new URLSearchParams({
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: '50',
                page: '1',
                sparkline: 'false',
                category: 'solana-meme-coins',
                price_change_percentage: '1h,24h,7d'
            }));

            if (!coinsResponse.ok) {
                throw new Error(`HTTP error! status: ${coinsResponse.status}`);
            }

            const coinsData = await coinsResponse.json();
            
            // Check for new coins
            const currentCoinIds = new Set<string>(coinsData.map((coin: any) => coin.id as string));
            
            if (knownCoinIds.size > 0) {
                // Find truly new coins that weren't in our previous fetch
                const newCoins = coinsData.filter((coin: any) => !knownCoinIds.has(coin.id));
                
                newCoins.forEach((coin: any) => {
                    const coinData: Coin = {
                        id: coin.id,
                        rank: coin.market_cap_rank || 999,
                        name: coin.name,
                        symbol: coin.symbol.toUpperCase(),
                        current_price: coin.current_price,
                        price_change_percentage_1h_in_currency: coin.price_change_percentage_1h_in_currency || 0,
                        price_change_percentage_24h_in_currency: coin.price_change_percentage_24h_in_currency || 0,
                        price_change_percentage_7d_in_currency: coin.price_change_percentage_7d_in_currency || 0,
                        total_volume: coin.total_volume,
                        market_cap: coin.market_cap,
                        image: coin.image,
                        ath_date: coin.ath_date
                    };
                    addNotification(coinData);
                });
            }
            
            setKnownCoinIds(currentCoinIds);

            const processedCoins = coinsData.slice(0, 10).map((coin: any, index: number) => ({
                id: coin.id,
                rank: index + 1,
                name: coin.name,
                symbol: coin.symbol.toUpperCase(),
                current_price: coin.current_price,
                price_change_percentage_1h_in_currency: coin.price_change_percentage_1h_in_currency || 0,
                price_change_percentage_24h_in_currency: coin.price_change_percentage_24h_in_currency || 0,
                price_change_percentage_7d_in_currency: coin.price_change_percentage_7d_in_currency || 0,
                total_volume: coin.total_volume,
                market_cap: coin.market_cap,
                image: coin.image,
                ath_date: coin.ath_date
            }));

            setCoins(processedCoins);

            const totalMarketCap = coinsData.slice(0, 10).reduce((sum: number, coin: any) => sum + coin.market_cap, 0);
            const marketCapChange = coinsData.length > 0 ? coinsData[0].market_cap_change_percentage_24h || 0 : 0;
            const tradingVolume24h = coinsData.slice(0, 10).reduce((sum: number, coin: any) => sum + coin.total_volume, 0);
            
            setMarketStats({
                totalMarketCap: totalMarketCap,
                marketCapChange: marketCapChange,
                tradingVolume24h: tradingVolume24h,
            });

            setTrendingCoins(coinsData.slice(0, 3).map((coin: any) => ({ 
                name: coin.name, 
                price: coin.current_price, 
                change: coin.price_change_percentage_24h || 0 
            })));
            
            setTopGainers(coinsData.slice(3, 6).map((coin: any) => ({ 
                name: coin.name, 
                price: coin.current_price, 
                change: coin.price_change_percentage_24h || 0 
            })));

        } catch (error) {
            console.error("Error fetching meme coin data:", error);
            setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMemeCoinData();
        // Check for new coins every 30 seconds
        const interval = setInterval(fetchMemeCoinData, 30000);
        return () => clearInterval(interval);
    }, [addNotification]);

    const activeNotifications = notifications.filter(n => !n.dismissed);

    return (
        <div className="min-h-screen w-full bg-gray-900 relative">
            {/* Notification Bell */}
            <div className="fixed top-4 right-4 z-50">
                <div className="relative">
                    <Bell className="w-6 h-6 text-gray-300 hover:text-white cursor-pointer" />
                    {notificationCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {notificationCount > 99 ? '99+' : notificationCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Notification Popups */}
            <div className="fixed top-4 right-16 z-40 space-y-2 max-w-sm">
                {activeNotifications.map((notification) => (
                    <div
                        key={notification.id}
                        className="bg-gradient-to-r from-green-800 to-green-600 border border-green-400 rounded-lg p-4 shadow-lg animate-slide-in-right"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                                <Rocket className="w-5 h-5 text-green-300 animate-bounce" />
                                <div className="text-green-100 font-semibold text-sm">
                                    New Meme Coin Launched! 🚀
                                </div>
                            </div>
                            <button
                                onClick={() => dismissNotification(notification.id)}
                                className="text-green-300 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="mt-3 flex items-center space-x-3">
                            <img
                                src={notification.coin.image}
                                alt={notification.coin.name}
                                className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1">
                                <div className="text-white font-medium">
                                    {notification.coin.name} ({notification.coin.symbol})
                                </div>
                                <div className="text-green-200 text-xs">
                                    Price: ${notification.coin.current_price.toLocaleString(undefined, { 
                                        minimumFractionDigits: notification.coin.current_price < 0.01 ? 8 : 4 
                                    })}
                                </div>
                                <div className="text-green-200 text-xs">
                                    Market Cap: ${notification.coin.market_cap.toLocaleString()}
                                </div>
                                {notification.coin.price_change_percentage_24h_in_currency !== 0 && (
                                    <div className={`text-xs ${notification.coin.price_change_percentage_24h_in_currency >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                        24h: {notification.coin.price_change_percentage_24h_in_currency >= 0 ? '▲' : '▼'} 
                                        {Math.abs(notification.coin.price_change_percentage_24h_in_currency).toFixed(2)}%
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-3 flex space-x-2">
                            <button className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-full flex items-center space-x-1">
                                <span>View Details</span>
                                <ExternalLink className="w-3 h-3" />
                            </button>
                            <button className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                                Trade Now
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="container mx-auto p-6 space-y-6 text-gray-100">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Top Meme Coins by Market Cap</h1>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <span className="text-sm text-gray-300">Auto-refresh: 30s</span>
                            <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-300">New Coin Alerts</span>
                            <div className="ml-2 w-12 h-6 bg-green-500 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-96">
                        <p className="text-gray-300">Loading meme coin data...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-96">
                        <p className="text-red-400">Error: {error}</p>
                    </div>
                ) : (
                    <>
                        <div className="text-sm text-gray-400">
                            The Meme market cap today is ${marketStats.totalMarketCap.toLocaleString()}, a
                            <span className={`${marketStats.marketCapChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {marketStats.marketCapChange >= 0 ? ' ▲ ' : ' ▼ '}
                                {marketStats.marketCapChange.toFixed(2)}%
                            </span> change in the last 24 hours.
                            <a href="#" className="text-blue-400 ml-2 hover:text-blue-300">Read More about Meme</a>
                        </div>

                        <div className="flex space-x-4">
                            <button className="px-4 py-2 bg-gray-800 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700">All Coins</button>
                            <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200">Key Statistics</button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-gray-800 p-6 rounded-lg shadow">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-bold text-white">${marketStats.totalMarketCap.toLocaleString()}</h3>
                                    <p className="text-sm text-gray-400">Market Cap <span className={`${marketStats.marketCapChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {marketStats.marketCapChange >= 0 ? '▲' : '▼'} {marketStats.marketCapChange.toFixed(2)}%</span></p>
                                </div>
                            </div>

                            <div className="bg-gray-800 p-6 rounded-lg shadow">
                                <div className="flex items-center mb-4">
                                    <Flame className="w-5 h-5 text-orange-400 mr-2" />
                                    <h3 className="font-semibold text-white">Trending</h3>
                                </div>
                                <div className="space-y-3">
                                    {trendingCoins.map((coin, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <span className="text-gray-300">{coin.name}</span>
                                            <div className="text-right">
                                                <div className="text-gray-200">${coin.price}</div>
                                                <div className={`text-sm ${coin.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {coin.change >= 0 ? '▲' : '▼'} {Math.abs(coin.change).toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-800 p-6 rounded-lg shadow">
                                <div className="flex items-center mb-4">
                                    <TrendingUp className="w-5 h-5 text-pink-400 mr-2" />
                                    <h3 className="font-semibold text-white">Top Gainers</h3>
                                </div>
                                <div className="space-y-3">
                                    {topGainers.map((coin, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <span className="text-gray-300">{coin.name}</span>
                                            <div className="text-right">
                                                <div className="text-gray-200">${coin.price}</div>
                                                <div className="text-sm text-green-400">▲ {coin.change.toFixed(2)}%</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-4 border-b border-gray-700 overflow-x-auto">
                            {['All', 'Highlights', 'Pump.fun', 'Categories', 'Bittensor Ecosystem', 'Polkadot Ecosystem', 'TON Meme'].map((tab) => (
                                <button key={tab} className="px-4 py-2 text-sm text-gray-400 hover:text-blue-400 whitespace-nowrap">
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-700">
                                    <tr className="text-sm text-gray-400">
                                        <th className="py-3 text-left">#</th>
                                        <th className="py-3 text-left">Coin</th>
                                        <th className="py-3 text-right">Price</th>
                                        <th className="py-3 text-right">1h</th>
                                        <th className="py-3 text-right">24h</th>
                                        <th className="py-3 text-right">7d</th>
                                        <th className="py-3 text-right">24h Volume</th>
                                        <th className="py-3 text-right">Market Cap</th>
                                        <th className="py-3 text-right">Last 7 Days</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coins.map((coin) => (
                                        <tr key={coin.id} className="border-b border-gray-700 hover:bg-gray-800">
                                            <td className="py-4 flex items-center gap-2">
                                                <Star className="w-4 h-4 text-gray-500" />
                                                <span className="text-gray-300">{coin.rank}</span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={coin.image}
                                                        alt={coin.name}
                                                        className="w-6 h-6 rounded-full"
                                                    />
                                                    <span className="font-medium text-gray-200">{coin.name}</span>
                                                    <span className="text-gray-400 text-sm">{coin.symbol}</span>
                                                    <span className="px-2 py-1 text-xs bg-green-900 text-green-300 rounded">Buy</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right text-gray-200">
                                                ${coin.current_price.toLocaleString(undefined, { 
                                                    minimumFractionDigits: coin.current_price < 0.01 ? 8 : 4 
                                                })}
                                            </td>
                                            <td className={`py-4 text-right ${coin.price_change_percentage_1h_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {coin.price_change_percentage_1h_in_currency >= 0 ? '▲' : '▼'} 
                                                {Math.abs(coin.price_change_percentage_1h_in_currency).toFixed(2)}%
                                            </td>
                                            <td className={`py-4 text-right ${coin.price_change_percentage_24h_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {coin.price_change_percentage_24h_in_currency >= 0 ? '▲' : '▼'} 
                                                {Math.abs(coin.price_change_percentage_24h_in_currency).toFixed(2)}%
                                            </td>
                                            <td className={`py-4 text-right ${coin.price_change_percentage_7d_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {coin.price_change_percentage_7d_in_currency >= 0 ? '▲' : '▼'} 
                                                {Math.abs(coin.price_change_percentage_7d_in_currency).toFixed(2)}%
                                            </td>
                                            <td className="py-4 text-right text-gray-200">${coin.total_volume.toLocaleString()}</td>
                                            <td className="py-4 text-right text-gray-200">${coin.market_cap.toLocaleString()}</td>
                                            <td className="py-4 text-right">
                                                <div className="w-24 h-8 bg-gray-700 rounded"></div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <style jsx>{`
                @keyframes slide-in-right {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.5s ease-out;
                }
            `}</style>
        </div>
    );
};

export default MemeCoinsDashboard;