'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';
import Image from 'next/image';
import { usePrivy } from "@privy-io/react-auth";
import Web3, { ContractAbi } from 'web3';
import localFont from 'next/font/local';
import { ShootingStars } from '@/components/ui/shooting-stars';
import { StarsBackground } from '@/components/ui/stars-background';
import Navbar from '@/components/ui/Navbar';
import { Contract } from "web3-eth-contract";
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const PACKAGE_ID = '0x4d73b423f3b6fd464890f22fbac4ade6c4ce9a5e1e29a5877c213c604ea28dae';
const ARBITRUM_STATE_OBJECT_ID = '0x658b0c9057c7e514f28c3910e3d4e5fab346822fb8d8afa7a8aaaf43cefcfe8d'; // Replace with actual object ID
const SUI_CLIENT = new SuiClient({ url: getFullnodeUrl('testnet') });

// const [suiWallet, setSuiWallet] = useState<any>(null);
// const [arbitrumStateId, setArbitrumStateId] = useState<string>(ARBITRUM_STATE_OBJECT_ID);

const myFont = localFont({
  src: [
    {
      path: '../../Mimoid.woff',
      weight: '800',
      style: 'normal',
    },
  ],
  display: 'swap',
});

type CoinData = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
  mint_address?: string;
};

type Token = {
  symbol: string;
  icon: string;
  address: string;
  decimals?: number;
};

type SwapOrder = {
  tokenAddress: string;
  amount: number;
  type: 'buy' | 'sell';
  symbol: string;
};

type JupiterQuoteResponse = {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: any[];
};

const CryptoTradingPage = () => {
  const { login, logout, authenticated, user } = usePrivy();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('sell');
  const [spendAmount, setSpendAmount] = useState<string>('');
  const [receiveAmount, setReceiveAmount] = useState<string>('0');
  const [spendToken, setSpendToken] = useState<Token>({ 
    symbol: 'SOL', 
    icon: '☀️', 
    address: 'So11111111111111111111111111111111111111112',
    decimals: 9 
  });
  const [receiveToken, setReceiveToken] = useState<Token>({ 
    symbol: 'USDC', 
    icon: '💵', 
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6 
  });
  const [isSpendDropdownOpen, setIsSpendDropdownOpen] = useState(false);
  const [isReceiveDropdownOpen, setIsReceiveDropdownOpen] = useState(false);
  const [memeCoins, setMemeCoins] = useState<CoinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [priceImpact, setPriceImpact] = useState<string>('');
  const [suiData, setSuiData] = useState<CoinData | null>(null);
  const [suiOrderAmount, setSuiOrderAmount] = useState<string>('');
  const [suiOrderType, setSuiOrderType] = useState<'fulfill_buy' | 'sell'>('fulfill_buy');
  const [suiOrderPrice, setSuiOrderPrice] = useState<string>('');
  const [isPlacingSuiOrder, setIsPlacingSuiOrder] = useState(false);

  const [contract, setContract] = useState<ContractAbi | null>(null);
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [newMemeCoin, setNewMemeCoin] = useState({
    name: '',
    address: '',
  });

  // Updated tokens list with Solana addresses and decimals
  const [tokens, setTokens] = useState<Token[]>([
    { symbol: 'SOL', icon: '☀️', address: 'So11111111111111111111111111111111111111112', decimals: 9 },
    { symbol: 'USDC', icon: '💵', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    { symbol: 'USDT', icon: '💰', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
    { symbol: "BONK", icon: '🐶', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 },
    { symbol: "WIF", icon: '🧢', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', decimals: 6 },
    { symbol: "TRUMP", icon: '🇺🇸', address: 'HaP8r3ksG76PhQLTqR8FYBeNiQpejcFbQmiHbg787Ut1', decimals: 6 },
  ]);

  useEffect(() => {
    fetchMemeCoinData();
    const interval = setInterval(fetchMemeCoinData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Debounce quote requests
  const debounceTimer = React.useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (spendAmount && parseFloat(spendAmount) > 0) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      debounceTimer.current = setTimeout(() => {
        getJupiterQuote();
      }, 500);
    } else {
      setReceiveAmount('0');
      setPriceImpact('');
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [spendAmount, spendToken.address, receiveToken.address]);

  const fetchMemeCoinData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 10,
          page: 1,
          sparkline: false,
          category: 'solana-meme-coins'
        }
      });
      
      // Map known token addresses
      const addressMap: { [key: string]: string } = {
        'bonk': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        'dogwifcoin': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        'jup-token': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        'raydium': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        'orca': 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
        'official-trump': 'HaP8r3ksG76PhQLTqR8FYBeNiQpejcFbQmiHbg787Ut1',
      };
      
      const coinsWithAddresses = response.data.map((coin: CoinData) => ({
        ...coin,
        mint_address: addressMap[coin.id] || tokens.find(t => t.symbol.toLowerCase() === coin.symbol.toLowerCase())?.address
      }));
      
      setMemeCoins(coinsWithAddresses);
    } catch (error) {
      console.error("Error fetching coin data:", error);
      setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getJupiterQuote = async () => {
    if (!spendAmount || parseFloat(spendAmount) <= 0) {
      setReceiveAmount('0');
      return;
    }

    setIsQuoting(true);
    try {
      const inputAmountInSmallestUnit = Math.floor(
        parseFloat(spendAmount) * Math.pow(10, spendToken.decimals || 9)
      );

      const response = await axios.get('https://quote-api.jup.ag/v6/quote', {
        params: {
          inputMint: spendToken.address,
          outputMint: receiveToken.address,
          amount: inputAmountInSmallestUnit,
          slippageBps: 50, // 0.5% slippage
          onlyDirectRoutes: false,
          asLegacyTransaction: false
        }
      });

      const quote: JupiterQuoteResponse = response.data;
      
      if (quote && quote.outAmount) {
        const outputAmount = parseFloat(quote.outAmount) / Math.pow(10, receiveToken.decimals || 6);
        setReceiveAmount(outputAmount.toFixed(6));
        setPriceImpact(parseFloat(quote.priceImpactPct).toFixed(2));
      } else {
        setReceiveAmount('0');
        setPriceImpact('');
      }
      
    } catch (error: any) {
      console.error('Quote error:', error);
      setReceiveAmount('0');
      setPriceImpact('');
      
      // Only show error if it's not a network issue or rate limiting
      if (error.response?.status !== 429 && error.response?.status !== 502) {
        console.warn('Failed to get quote:', error.response?.data || error.message);
      }
    } finally {
      setIsQuoting(false);
    }
  };

  const handleTabChange = (tab: 'buy' | 'sell') => {
    setActiveTab(tab);
    setSpendAmount('');
    setReceiveAmount('0');
    setPriceImpact('');
  };

  const handleSpendAmountChange = (value: string) => {
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setSpendAmount(value);
    }
  };

  const handleTokenSwitch = (dropdownType: 'spend' | 'receive', selected: Token) => {
    if (dropdownType === 'spend') {
      setSpendToken(selected);
      setIsSpendDropdownOpen(false);
    } else {
      setReceiveToken(selected);
      setIsReceiveDropdownOpen(false);
    }
  };

  const swapTokens = () => {
    const tempToken = spendToken;
    setSpendToken(receiveToken);
    setReceiveToken(tempToken);
    setSpendAmount(receiveAmount);
    setReceiveAmount(spendAmount);
  };

  // Execute swap using Jupiter API
  const executeJupiterSwap = async () => {
    if (!authenticated || !user?.wallet?.address || !spendAmount || parseFloat(spendAmount) <= 0) {
      setError('Please connect wallet and enter a valid amount');
      return;
    }

    setIsSwapping(true);
    setError(null);
    setSwapSuccess(null);

    try {
      // Get fresh quote
      const inputAmountInSmallestUnit = Math.floor(
        parseFloat(spendAmount) * Math.pow(10, spendToken.decimals || 9)
      );

      const quoteResponse = await axios.get('https://quote-api.jup.ag/v6/quote', {
        params: {
          inputMint: spendToken.address,
          outputMint: receiveToken.address,
          amount: inputAmountInSmallestUnit,
          slippageBps: 50,
          onlyDirectRoutes: false,
          asLegacyTransaction: false
        }
      });

      if (!quoteResponse.data) {
        throw new Error('No quote received from Jupiter');
      }

      // Get swap transaction
      const swapResponse = await axios.post('https://quote-api.jup.ag/v6/swap', {
        quoteResponse: quoteResponse.data,
        userPublicKey: user.wallet.address,
        wrapAndUnwrapSol: true,
        useSharedAccounts: true,
        feeAccount: undefined,
        trackingAccount: undefined,
        computeUnitPriceMicroLamports: undefined,
        prioritizationFeeLamports: undefined,
        asLegacyTransaction: false,
        useTokenLedger: false,
        destinationTokenAccount: undefined,
        dynamicComputeUnitLimit: true,
        skipUserAccountsRpcCalls: false
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const { swapTransaction } = swapResponse.data;

      if (!swapTransaction) {
        throw new Error('No swap transaction received');
      }

      // For demo purposes, simulate successful transaction
      // In production, you would:
      // 1. Decode the base64 transaction
      // 2. Sign it with user's wallet (Privy/Phantom/etc)
      // 3. Send to Solana network
      // 4. Wait for confirmation
      
      console.log('Swap transaction received:', swapTransaction.substring(0, 50) + '...');
      
      // Simulate transaction success
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSwapSuccess(`Successfully swapped ${spendAmount} ${spendToken.symbol} for ${receiveAmount} ${receiveToken.symbol}!`);
      setSpendAmount('');
      setReceiveAmount('0');
      setPriceImpact('');

    } catch (error: any) {
      console.error('Swap error:', error);
      
      let errorMessage = 'Swap failed';
      if (error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
      } else if (error.response?.data?.message) {
        errorMessage += `: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      // Handle specific Jupiter API errors
      if (error.response?.status === 422) {
        errorMessage = 'Invalid swap parameters. Please check token amounts and addresses.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Bad request. The swap route may not exist or amounts are invalid.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleDirectBuy = async (coin: CoinData) => {
    if (!spendAmount || !coin.mint_address || !authenticated || !user?.wallet?.address) {
      setError('Please connect wallet, enter an amount, and ensure token has valid address');
      return;
    }

    setIsSwapping(true);
    setError(null);
    setSwapSuccess(null);

    try {
      // Use SOL as input token for buying
      const inputAmountInSmallestUnit = Math.floor(
        parseFloat(spendAmount) * Math.pow(10, 9) // SOL has 9 decimals
      );

      const quoteResponse = await axios.get('https://quote-api.jup.ag/v6/quote', {
        params: {
          inputMint: 'So11111111111111111111111111111111111111112', // SOL
          outputMint: coin.mint_address,
          amount: inputAmountInSmallestUnit,
          slippageBps: 100, // 1% slippage for memecoins
          onlyDirectRoutes: false,
          asLegacyTransaction: false
        }
      });

      if (!quoteResponse.data) {
        throw new Error('No quote available for this token');
      }

      // Calculate expected output
      const expectedOutput = parseFloat(quoteResponse.data.outAmount) / Math.pow(10, 6); // Assume 6 decimals for most tokens
      
      // For demo purposes, simulate successful transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSwapSuccess(`Successfully bought ${expectedOutput.toFixed(4)} ${coin.symbol} for ${spendAmount} SOL!`);
      setSpendAmount('');

    } catch (error: any) {
      console.error('Buy error:', error);
      let errorMessage = `Failed to buy ${coin.symbol}`;
      if (error.response?.status === 422) {
        errorMessage += ': No route found or invalid parameters';
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      setError(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleDirectSell = async (coin: CoinData) => {
    if (!spendAmount || !coin.mint_address || !authenticated || !user?.wallet?.address) {
      setError('Please connect wallet, enter an amount, and ensure token has valid address');
      return;
    }

    setIsSwapping(true);
    setError(null);
    setSwapSuccess(null);

    try {
      // Use the coin as input token for selling
      const inputAmountInSmallestUnit = Math.floor(
        parseFloat(spendAmount) * Math.pow(10, 6) // Assume 6 decimals for most memecoins
      );

      const quoteResponse = await axios.get('https://quote-api.jup.ag/v6/quote', {
        params: {
          inputMint: coin.mint_address,
          outputMint: 'So11111111111111111111111111111111111111112', // SOL
          amount: inputAmountInSmallestUnit,
          slippageBps: 100, // 1% slippage for memecoins
          onlyDirectRoutes: false,
          asLegacyTransaction: false
        }
      });

      if (!quoteResponse.data) {
        throw new Error('No quote available for this token');
      }

      // Calculate expected output in SOL
      const expectedOutput = parseFloat(quoteResponse.data.outAmount) / Math.pow(10, 9); // SOL has 9 decimals
      
      // For demo purposes, simulate successful transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSwapSuccess(`Successfully sold ${spendAmount} ${coin.symbol} for ${expectedOutput.toFixed(6)} SOL!`);
      setSpendAmount('');

    } catch (error: any) {
      console.error('Sell error:', error);
      let errorMessage = `Failed to sell ${coin.symbol}`;
      if (error.response?.status === 422) {
        errorMessage += ': No route found or invalid parameters';
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      setError(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  // 5. REPLACE THE handleAddToken FUNCTION with this enhanced version
const handleAddTokenWithContract = async () => {
  if (newMemeCoin.name === "" || newMemeCoin.address === "") {
    setError('Please fill in both token name and address');
    return;
  }

  try {
    // Check if token mapping already exists
    const exists = await checkTokenMapping(newMemeCoin.address);
    if (exists) {
      setError('Token mapping already exists in smart contract');
      return;
    }

    // Create token mapping in smart contract
    await handleCreateToken(newMemeCoin.name, newMemeCoin.name.toUpperCase(), newMemeCoin.address);
    
    // Add to local state as well
    setTokens((prevTokens) => {
      const tokenExists = prevTokens.some(token => token.address === newMemeCoin.address);
      if (!tokenExists) {
        return [
          ...prevTokens,
          { symbol: newMemeCoin.name.toUpperCase(), icon: '🪙', address: newMemeCoin.address, decimals: 6 },
        ];
      }
      return prevTokens;
    });
    
    setNewMemeCoin({ name: '', address: '' });
    
  } catch (error: any) {
    console.error('Error adding token with contract:', error);
    setError(`Failed to add token: ${error.message}`);
  }
};

  const fetchSuiData = async () => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/sui', {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      }
    });
    
    const suiCoinData: CoinData = {
      id: response.data.id,
      symbol: response.data.symbol.toUpperCase(),
      name: response.data.name,
      current_price: response.data.market_data.current_price.usd,
      price_change_percentage_24h: response.data.market_data.price_change_percentage_24h,
      image: response.data.image.large,
      mint_address: '0x2::sui::SUI' // SUI native token address
    };
    
    setSuiData(suiCoinData);
  } catch (error) {
    console.error("Error fetching SUI data:", error);
  }
};

// Add this useEffect to fetch SUI data (place with other useEffects)
useEffect(() => {
  // const [arbitrumStateId, setArbitrumStateId] = useState<string>(ARBITRUM_STATE_OBJECT_ID);
  fetchSuiData();
  const interval = setInterval(fetchSuiData, 60000); // Update every minute
  return () => clearInterval(interval);
}, []);


      // 3. MODIFIED handleSuiOrderPlacement FUNCTION 
      const handleSuiOrderPlacement = async () => {
        if (!authenticated || !user?.wallet?.address || !suiOrderAmount || !suiOrderPrice) {
          setError('Please connect wallet and fill in all order details');
          return;
        }

        if (parseFloat(suiOrderAmount) <= 0 || parseFloat(suiOrderPrice) <= 0) {
          setError('Amount and price must be greater than 0');
          return;
        }

        setIsPlacingSuiOrder(true);
        setError(null);
        setSwapSuccess(null);

        try {
          // Initialize SUI client and transaction
          const txb = new TransactionBlock();
          
          // Calculate amount in smallest units (assuming 9 decimals for SUI)
          const amountInSmallestUnit = Math.floor(parseFloat(suiOrderAmount) * Math.pow(10, 9));
          
          if (suiOrderType === 'fulfill_buy') {
            // For buy orders - call fulfill_buy function
            txb.moveCall({
              target: `${PACKAGE_ID}::contract::fulfill_buy`,
              typeArguments: ['0x2::sui::SUI'], // Using native SUI token type
              arguments: [
                txb.object(ARBITRUM_STATE_OBJECT_ID), // ArbitrumState object
                txb.pure(user.wallet.address), // recipient address
                txb.pure(amountInSmallestUnit), // amount
                txb.pure('0x0000000000000000000000000000000000000000'), // Arbitrum token address (placeholder)
              ],
            });
            
          } else {
            // For sell orders - call sell function
            txb.moveCall({
              target: `${PACKAGE_ID}::contract::sell`,
              typeArguments: ['0x2::sui::SUI'], // Using native SUI token type  
              arguments: [
                txb.object(ARBITRUM_STATE_OBJECT_ID), // ArbitrumState object
                txb.pure(amountInSmallestUnit), // amount to sell
                txb.pure('0x0000000000000000000000000000000000000000'), // Arbitrum token address (placeholder)
              ],
            });
          }

          // Set gas budget
          txb.setGasBudget(10000000); // 0.01 SUI

          // In a real implementation, you would need to:
          // 1. Get the user's SUI wallet connection (like Sui Wallet, Suiet, etc.)
          // 2. Sign and execute the transaction
          // Example (you'll need to implement wallet connection):
          /*
          const result = await suiWallet.signAndExecuteTransactionBlock({
            transactionBlock: txb,
            options: {
              showEffects: true,
              showObjectChanges: true,
            },
          });
          
          console.log('Transaction result:', result);
          */
          
          // For now, simulate the transaction
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const totalValue = (parseFloat(suiOrderAmount) * parseFloat(suiOrderPrice)).toFixed(4);
          const action = suiOrderType === 'fulfill_buy' ? 'Buy' : 'Sell';
          
          setSwapSuccess(
            `${action} order placed successfully ${suiOrderAmount} SUI at $${suiOrderPrice} each (Total: $${totalValue})`
          );
          
          // Reset form
          setSuiOrderAmount('');
          setSuiOrderPrice('');
          
        } catch (error: any) {
          console.error('SUI smart contract order error:', error);
          setError(`Failed to place ${suiOrderType} order on smart contract: ${error.message || 'Unknown error'}`);
        } finally {
          setIsPlacingSuiOrder(false);
        }
      };

      // 4. ADD THESE NEW HELPER FUNCTIONS (add after your existing functions)

// Function to create token mapping in smart contract
const handleCreateToken = async (tokenName: string, tokenSymbol: string, tokenAddress: string) => {
  if (!authenticated || !user?.wallet?.address) {
    setError('Please connect wallet first');
    return;
  }

  try {
    const txb = new TransactionBlock();
    
    // Call create_token function from smart contract
    txb.moveCall({
      target: `${PACKAGE_ID}::contract::create_token`,
      arguments: [
        txb.object(ARBITRUM_STATE_OBJECT_ID), // ArbitrumState object
        txb.pure(tokenAddress), // Arbitrum token address
        txb.pure(Array.from(new TextEncoder().encode(tokenName))), // name as bytes
        txb.pure(Array.from(new TextEncoder().encode(tokenSymbol))), // symbol as bytes
      ],
    });

    txb.setGasBudget(10000000);

    // In real implementation, sign and execute transaction
    console.log('Token creation transaction prepared:', {
      name: tokenName,
      symbol: tokenSymbol,
      address: tokenAddress
    });

    // Simulate success for now
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSwapSuccess(`Token ${tokenSymbol} created successfully on smart contract!`);
    
  } catch (error: any) {
    console.error('Token creation error:', error);
    setError(`Failed to create token: ${error.message}`);
  }
};

// Function to check if token mapping exists
const checkTokenMapping = async (tokenAddress: string): Promise<boolean> => {
  try {
    const result = await SUI_CLIENT.devInspectTransactionBlock({
      transactionBlock: (() => {
        const txb = new TransactionBlock();
        txb.moveCall({
          target: `${PACKAGE_ID}::contract::token_mapping_exists`,
          arguments: [
            txb.object(ARBITRUM_STATE_OBJECT_ID),
            txb.pure(tokenAddress),
          ],
        });
        return txb;
      })(),
      sender:
        user?.wallet?.address ||
        '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    // Assuming result.returnValues is used to determine true/false
   return !!result?.results?.[0]?.returnValues?.[0]?.[0];


  } catch (error) {
    console.error('Error checking token mapping:', error);
    return false;
  }
};


  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar className="top-2" login={login} logout={logout} authenticated={authenticated} user={user} />
      <ShootingStars />
      <StarsBackground />
      <div className="max-w-7xl mx-auto p-8">
        <h1 className={`text-4xl font-bold mb-8 ${myFont.className}`}>
          Buy/Sell Crypto
        </h1>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
            {error}
          </div>
        )}
        {swapSuccess && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-300">
            {swapSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Memecoin List with Direct Trading */}
          <div className="rounded-3xl p-6 backdrop-filter backdrop-blur-lg bg-gray-800/50 border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4">Popular Memecoins - Quick Trade</h2>
            
            {/* Amount Input for Direct Trading */}
            <div className="mb-4 bg-gray-900 rounded-lg p-4">
              <label className="text-sm text-gray-400 mb-2 block">Amount (SOL)</label>
              <input
                type="text"
                value={spendAmount}
                onChange={(e) => handleSpendAmountChange(e.target.value)}
                placeholder="Enter amount to trade"
                className="bg-transparent text-xl outline-none w-full text-white"
              />
            </div>

            {isLoading ? (
              <p>Loading live data...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <div className="space-y-4">
                {memeCoins.map((coin) => (
                  <div key={coin.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Image
                        src={coin.image}
                        alt={coin.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-medium">{coin.symbol.toUpperCase()}</div>
                        <div className="text-sm text-gray-400">{coin.name}</div>
                        {coin.mint_address && (
                          <div className="text-xs text-gray-500">
                            {coin.mint_address.substring(0, 8)}...
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">${coin.current_price.toLocaleString()}</div>
                        <div className={`flex items-center text-sm ${coin.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {coin.price_change_percentage_24h >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                        </div>
                      </div>
                      {authenticated && coin.mint_address && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDirectBuy(coin)}
                            disabled={isSwapping || !spendAmount}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSwapping ? '...' : 'Buy'}
                          </button>
                          <button
                            onClick={() => handleDirectSell(coin)}
                            disabled={isSwapping || !spendAmount}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSwapping ? '...' : 'Sell'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Trading Panel */}
          <div className="rounded-2xl p-6 backdrop-filter backdrop-blur-lg bg-gray-800/50 border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4">Swap</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <label className="text-sm text-gray-400">You Pay</label>
                <div className="flex items-center justify-between mt-2">
                  <input
                    type="text"
                    value={spendAmount}
                    onChange={(e) => handleSpendAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent text-2xl outline-none w-full"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSpendAmount('')}
                      className="hover:text-gray-300"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setIsSpendDropdownOpen(!isSpendDropdownOpen)}
                        className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded hover:bg-gray-700"
                      >
                        <span>{spendToken.icon} {spendToken.symbol}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {isSpendDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                          {tokens.map((token) => (
                            <button
                              key={token.symbol}
                              onClick={() => handleTokenSwitch('spend', token)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2">
                                <span>{token.icon}</span>
                                <span>{token.symbol}</span>
                              </div>
                              <span className="text-xs text-gray-400">{token.decimals}d</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  onClick={swapTokens}
                  className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <label className="text-sm text-gray-400">You Receive</label>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex-1">
                    {isQuoting ? (
                      <div className="text-2xl text-gray-400">Loading...</div>
                    ) : (
                      <input
                        type="text"
                        value={receiveAmount}
                        readOnly
                        className="bg-transparent text-2xl outline-none w-full"
                      />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <button
                        onClick={() => setIsReceiveDropdownOpen(!isReceiveDropdownOpen)}
                        className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded hover:bg-gray-700"
                      >
                        <span>{receiveToken.icon} {receiveToken.symbol}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {isReceiveDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                          {tokens.map((token) => (
                            <button
                              key={token.symbol}
                              onClick={() => handleTokenSwitch('receive', token)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2">
                                <span>{token.icon}</span>
                                <span>{token.symbol}</span>
                              </div>
                              <span className="text-xs text-gray-400">{token.decimals}d</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {priceImpact && (
                  <div className="mt-2 text-sm text-gray-400">
                    Price Impact: <span className={parseFloat(priceImpact) > 1 ? 'text-red-400' : 'text-green-400'}>
                      {priceImpact}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {authenticated ? (
              <button
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:from-purple-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                onClick={executeJupiterSwap}
                disabled={isSwapping || !spendAmount || parseFloat(spendAmount) <= 0 || isQuoting}
              >
                {isSwapping ? 'Swapping...' : isQuoting ? 'Getting Quote...' : `Swap ${spendToken.symbol} for ${receiveToken.symbol}`}
              </button>
            ) : (
              <button
                className="w-full py-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 mt-6"
                onClick={login}
              >
                Connect Wallet to Swap
              </button>
            )}

            {authenticated && (
              <button
                className="w-full py-3 bg-gray-700 text-white rounded-lg mt-4 font-medium hover:bg-gray-600"
                onClick={logout}
              >
                Disconnect {user?.wallet?.address?.substring(0, 6)}...{user?.wallet?.address?.slice(-4)}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl p-6 mt-8 backdrop-filter backdrop-blur-lg bg-gray-800/50 border border-gray-700 shadow-2xl">
  <h2 className={`text-xl font-semibold mb-4 ${myFont.className}`}>SUI Token Trading</h2>
  
  {/* SUI Market Data */}
  {suiData ? (
    <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Image
            src={suiData.image}
            alt={suiData.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <div className="font-medium text-lg">{suiData.symbol}</div>
            <div className="text-sm text-gray-400">{suiData.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-xl">${suiData.current_price.toFixed(4)}</div>
          <div className={`flex items-center text-sm ${suiData.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {suiData.price_change_percentage_24h >= 0 ? 
              <TrendingUp className="w-3 h-3 mr-1" /> : 
              <TrendingDown className="w-3 h-3 mr-1" />
            }
            {suiData.price_change_percentage_24h >= 0 ? '+' : ''}{suiData.price_change_percentage_24h.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
      <div className="text-center text-gray-400">Loading SUI market data...</div>
    </div>
  )}

  {/* Order Type Toggle */}
  <div className="flex bg-gray-900 rounded-lg p-1 mb-4">
    <button
      onClick={() => setSuiOrderType('fulfill_buy')}
      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
        suiOrderType === 'fulfill_buy'
          ? 'bg-green-500 text-white'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      Buy Order
    </button>
    <button
      onClick={() => setSuiOrderType('sell')}
      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
        suiOrderType === 'sell'
          ? 'bg-red-500 text-white'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      Sell Order
    </button>
  </div>

  {/* Order Form */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <div>
      <label className="text-sm text-gray-400 mb-2 block">Amount (SUI)</label>
      <input
        type="text"
        placeholder="Enter SUI amount"
        value={suiOrderAmount}
        onChange={(e) => {
          if (/^\d*\.?\d*$/.test(e.target.value) || e.target.value === '') {
            setSuiOrderAmount(e.target.value);
          }
        }}
        className="bg-gray-900 text-white rounded-lg p-3 w-full"
      />
    </div>
    <div>
      <label className="text-sm text-gray-400 mb-2 block">Price (USD)</label>
      <input
        type="text"
        placeholder="Enter price per SUI"
        value={suiOrderPrice}
        onChange={(e) => {
          if (/^\d*\.?\d*$/.test(e.target.value) || e.target.value === '') {
            setSuiOrderPrice(e.target.value);
          }
        }}
        className="bg-gray-900 text-white rounded-lg p-3 w-full"
      />
    </div>
  </div>

  {/* Order Summary */}
  {suiOrderAmount && suiOrderPrice && (
    <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
      <div className="text-sm text-gray-400 mb-1">Order Summary:</div>
      <div className="flex justify-between text-sm">
        <span>{suiOrderType === 'fulfill_buy' ? 'Buying' : 'Selling'}: {suiOrderAmount} SUI</span>
        <span>Total: ${(parseFloat(suiOrderAmount) * parseFloat(suiOrderPrice)).toFixed(4)}</span>
      </div>
    </div>
  )}

  {/* Place Order Button */}
  {authenticated ? (
    <button
      className={`w-full py-3 rounded-lg font-medium transition-colors ${
        suiOrderType === 'fulfill_buy'
          ? 'bg-green-500 hover:bg-green-400 text-white'
          : 'bg-red-500 hover:bg-red-400 text-white'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      onClick={handleSuiOrderPlacement}
      disabled={isPlacingSuiOrder || !suiOrderAmount || !suiOrderPrice}
    >
      {isPlacingSuiOrder 
        ? `Placing ${suiOrderType} order...` 
        : `Place Order`
      }
    </button>
  ) : (
    <button
      className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400"
      onClick={login}
    >
      Connect Wallet to Trade SUI
    </button>
  )}
</div>
      </div>
    </div>
  );
};

export default CryptoTradingPage;