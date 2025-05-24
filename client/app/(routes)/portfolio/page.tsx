'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, TrendingUp } from 'lucide-react';
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { ShootingStars } from '@/components/ui/shooting-stars';
import { StarsBackground } from '@/components/ui/stars-background';
import Navbar from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
// Using fetch instead of axios for API calls

interface MemeCoin {
  symbol: string;
  name: string;
  price: string;
  image: string;
  amount?: string;
  usdValue?: string;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  coin: string;
  amount: string;
  price: string;
  total: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

const CryptoDashboard = () => {
  const router = useRouter();
  const { login, logout, authenticated, user } = usePrivy();
  const [memeCoins, setMemeCoins] = useState<MemeCoin[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchMemeCoinData = async () => {
      try {
        const coinIds = ['official-trump', 'melania-meme', 'bonk', 'unicorn-fart-dust'];
        const vsCurrency = 'usd';

        const coinDetailsUrl = `https://api.coingecko.com/api/v3/coins/markets?ids=${coinIds.join(',')}&vs_currency=usd`;
        const response = await fetch(coinDetailsUrl);
        const coinDetails = await response.json();

        const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=${vsCurrency}`;
        const priceResponse = await fetch(priceUrl);
        const coinPrices = await priceResponse.json();

        const memeCoinArray: MemeCoin[] = coinDetails.map((coin: { symbol: string; name: any; id: string | number; image: any; }) => {
          // Set BONK holdings based on the purchase
          const isBonk = coin.symbol.toLowerCase() === 'bonk';
          return {
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            price: coinPrices[coin.id] ? `$${coinPrices[coin.id].usd}` : 'N/A',
            image: coin.image,
            amount: isBonk ? '78005.7513' : '0.00',
            usdValue: isBonk ? '$0.10' : '$0.00'
          };
        });

        setMemeCoins(memeCoinArray);
      } catch (error) {
        console.error('Error fetching meme coin data:', error);
        setMemeCoins([]);
      }
    };

    // Initialize recent transactions with the BONK purchase
    const initializeTransactions = () => {
      const recentTransactions: Transaction[] = [
        {
          id: '1',
          type: 'buy',
          coin: 'BONK',
          amount: '78005.7513',
          price: '$0.000001283',
          total: '0.1 SUI',
          timestamp: new Date().toISOString(),
          status: 'completed'
        }
      ];
      setTransactions(recentTransactions);
    };

    fetchMemeCoinData();
    initializeTransactions();
  }, []);

  const handleCashIn = () => {
    console.log('Navigating to buy page...');
    router.push('/buy');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Navbar className="top-2" login={login} logout={logout} authenticated={authenticated} user={user} />
      <ShootingStars />
      <StarsBackground />
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Assets</h1>
          <button className="text-gray-400 hover:text-white transition-colors">
            View All 350+ Coins <ChevronRight className="inline h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="space-x-6">
            <button className="text-white border-b-2 border-yellow-500 pb-2">Coin View</button>
            <button className="text-gray-400 hover:text-white transition-colors">Account View</button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                className="bg-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Search..."
              />
            </div>
            <label className="flex items-center space-x-2 text-sm text-gray-400">
              <input type="checkbox" className="form-checkbox bg-gray-800 rounded" />
              <span>Hide assets &lt;1 USD</span>
            </label>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm">
                <th className="text-left p-4">Coin</th>
                <th className="text-right p-4">Amount</th>
                <th className="text-right p-4">Coin Price</th>
                <th className="text-right p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {memeCoins.map((coin) => (
                <tr key={coin.symbol} className="border-t border-gray-700">
                  <td className="p-4">
                    <div className="flex items-center">
                      <img src={coin.image} alt={coin.name} className="w-8 h-8 mr-3" />
                      <div>
                        <div className="font-medium flex items-center">
                          {coin.symbol}
                          {coin.symbol === 'BONK' && (
                            <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm">{coin.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className={coin.amount !== '0.00' ? 'text-white' : ''}>{coin.amount}</div>
                    <div className="text-gray-400 text-sm">{coin.usdValue}</div>
                  </td>
                  <td className="p-4 text-right">{coin.price}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleCashIn()}
                      className="text-blue-400 hover:text-blue-300 transition-colors px-4 py-2 rounded hover:bg-blue-500/10"
                    >
                      Cash In
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recent Transactions</h2>
            <button className="text-gray-400 hover:text-white transition-colors">
              More <ChevronRight className="inline h-4 w-4" />
            </button>
          </div>
          
          {transactions.length > 0 ? (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-700">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'buy' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {transaction.type === 'buy' ? 'Bought' : 'Sold'} {transaction.coin}
                          </div>
                          <div className="text-sm text-gray-400">
                            {formatTimestamp(transaction.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {transaction.amount} {transaction.coin}
                        </div>
                        <div className="text-sm text-gray-400">
                          for {transaction.total}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          transaction.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {transaction.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              <Search className="mx-auto h-12 w-12 mb-4" />
              <p>No records</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CryptoDashboard;