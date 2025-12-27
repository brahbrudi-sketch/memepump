import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Rocket } from 'lucide-react';
import TradingPanel from '../components/TradingPanel';
import CoinCard from '../components/CoinCard';

const API_URL = 'http://localhost:8080/api/v1';

const CoinDetails = ({
    coins,
    trades,
    comments,
    currentUser,
    setShowProfileModal,
    setComments
}) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [showTradeHistory, setShowTradeHistory] = useState(false);

    // Find coin from props or fetch if needed (for now props are passed from App which holds WebSocket state)
    const coin = coins.find(c => c.id === id);

    // If coin doesn't exist in the list yet (maybe direct link load before WS sync), handle gracefully
    if (!coin) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <div className="text-purple-300 mb-4">Loading coin details...</div>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-purple-700 text-white rounded-lg"
                >
                    Back to Hub
                </button>
            </div>
        )
    }

    // We reuse CoinCard for the header info, but we might want a slightly different view.
    // For now, CoinCard is good.

    // Filter trades for this coin for the History Modal (if we use it inside TradingPanel or here)
    // TradingPanel handles its own history button usually, but needs the setter.

    return (
        <div className="container mx-auto px-4 py-8">
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-purple-300 hover:text-white mb-6 transition"
            >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
            </button>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Coin Info & Chart */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-purple-950/30 rounded-2xl p-6 border border-purple-500/30">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <span className="text-6xl animate-bounce-slow">{coin.image}</span>
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-1">{coin.name}</h1>
                                    <div className="flex items-center gap-2 text-purple-300">
                                        <span className="font-mono bg-purple-900/50 px-2 py-1 rounded text-sm">{coin.symbol}</span>
                                        <span>•</span>
                                        <span className="text-sm">Created by {coin.creator.substring(0, 8)}...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-lg text-purple-100 mb-6 leading-relaxed">
                            {coin.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-purple-900/40 p-3 rounded-lg">
                                <div className="text-purple-400 text-xs uppercase font-bold mb-1">Market Cap</div>
                                <div className="text-xl font-bold text-green-400">${coin.marketCap.toLocaleString()}</div>
                            </div>
                            <div className="bg-purple-900/40 p-3 rounded-lg">
                                <div className="text-purple-400 text-xs uppercase font-bold mb-1">Price</div>
                                <div className="text-xl font-bold text-white">${coin.price.toFixed(8)}</div>
                            </div>
                            <div className="bg-purple-900/40 p-3 rounded-lg">
                                <div className="text-purple-400 text-xs uppercase font-bold mb-1">Holders</div>
                                <div className="text-xl font-bold text-white">{coin.holders}</div>
                            </div>
                            <div className="bg-purple-900/40 p-3 rounded-lg">
                                <div className="text-purple-400 text-xs uppercase font-bold mb-1">Supply</div>
                                <div className="text-xl font-bold text-white">{(coin.totalSupply / 1000000).toFixed(1)}M</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-purple-300">
                                <span>Bonding Curve Progress</span>
                                <span className="font-bold text-white">{coin.progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-4 bg-purple-950 rounded-full overflow-hidden border border-purple-800">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative"
                                    style={{ width: `${coin.progress}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                            {coin.progress >= 100 && (
                                <div className="text-center text-green-400 font-bold animate-pulse mt-2">
                                    🚀 BONDING CURVE COMPLETED! LISTING IMMINENT! 🚀
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chart included in TradingPanel usually, but let's separate it? 
               The current TradingPanel has PriceChart inside. Let's keep it there for now.
           */}
                </div>

                {/* Right Column: Trading & Chat */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <TradingPanel
                            coin={coin}
                            trades={trades}
                            comments={comments[coin.id] || []}
                            currentUser={currentUser}
                            setShowProfileModal={setShowProfileModal}
                            setShowTradeHistory={setShowTradeHistory} // We might need to hoist this modal up to App or handle here
                            setComments={setComments}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoinDetails;
