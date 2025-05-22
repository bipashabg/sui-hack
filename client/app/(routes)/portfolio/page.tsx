'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { ShootingStars } from '@/components/ui/shooting-stars';
import { StarsBackground } from '@/components/ui/stars-background';
import Navbar from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface MemeCoin {
  symbol: string;
  name: string;
  price: string;
  image: string;
}

const CryptoDashboard = () => {
  const router = useRouter();
  const { login, logout, authenticated, user } = usePrivy();
  const [memeCoins, setMemeCoins] = useState<MemeCoin[]>([]);

  useEffect(() => {
    const fetchMemeCoinData = async () => {
      try {
        const coinIds = ['official-trump', 'melania-meme', 'bonk', 'unicorn-fart-dust'];
        const vsCurrency = 'usd';

        const coinDetailsUrl = `https://api.coingecko.com/api/v3/coins/markets?ids=${coinIds.join(',')}&vs_currency=usd`;
        const response = await axios.get(coinDetailsUrl);
        const coinDetails = response.data;

        const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=${vsCurrency}`;
        const priceResponse = await axios.get(priceUrl);
        const coinPrices = priceResponse.data;

        const memeCoinArray: MemeCoin[] = coinDetails.map((coin: { symbol: string; name: any; id: string | number; image: any; }) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coinPrices[coin.id] ? `$${coinPrices[coin.id].usd}` : 'N/A',
          image: coin.image,
        }));

        setMemeCoins(memeCoinArray);
      } catch (error) {
        console.error('Error fetching meme coin data:', error);
        setMemeCoins([]);
      }
    };

    fetchMemeCoinData();
  }, []);

  const handleCashIn = () => {
    console.log('Navigating to buy page...');
    router.push('/buy');
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
                        <div className="font-medium">{coin.symbol}</div>
                        <div className="text-gray-400 text-sm">{coin.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div>0.00</div>
                    <div className="text-gray-400 text-sm">$0.00</div>
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
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            <Search className="mx-auto h-12 w-12 mb-4" />
            <p>No records</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoDashboard;
