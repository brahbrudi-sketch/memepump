import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const ActivityTicker = ({ trades, coins }) => {
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        // Keep only last 10-15 trades for the ticker to avoid memory issues if it runs long
        // But since `trades` prop is getting new ones prepended, we can just slice the first 10.
        setRecentActivity(trades.slice(0, 10));
    }, [trades]);

    if (recentActivity.length === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-purple-500/30 z-50 h-10 flex items-center overflow-hidden">
            <div className="animate-marquee whitespace-nowrap flex gap-8 px-4">
                {recentActivity.map((trade, index) => {
                    const coin = coins.find(c => c.id === trade.coinId);
                    if (!coin) return null;

                    return (
                        <div key={`${trade.id}-${index}`} className="flex items-center gap-2 text-sm">
                            <span className="font-bold text-white">{trade.username || 'Anonymous'}</span>
                            <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                                {trade.type === 'buy' ? 'BOUGHT' : 'SOLD'}
                            </span>
                            <span className="font-bold text-white">{trade.amount} SOL</span>
                            <span className="text-purple-300">of</span>
                            <span className="font-bold text-white flex items-center gap-1">
                                {coin.image} {coin.symbol}
                            </span>
                            {trade.type === 'buy' ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                        </div>
                    );
                })}
                {/* Duplicate for seamless loop effect (simple version, css handling the rest) */}
                {recentActivity.map((trade, index) => {
                    const coin = coins.find(c => c.id === trade.coinId);
                    if (!coin) return null;

                    return (
                        <div key={`dup-${trade.id}-${index}`} className="flex items-center gap-2 text-sm opactiy-50">
                            <span className="font-bold text-white">{trade.username || 'Anonymous'}</span>
                            <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                                {trade.type === 'buy' ? 'BOUGHT' : 'SOLD'}
                            </span>
                            <span className="font-bold text-white">{trade.amount} SOL</span>
                            <span className="text-purple-300">of</span>
                            <span className="font-bold text-white flex items-center gap-1">
                                {coin.image} {coin.symbol}
                            </span>
                            {trade.type === 'buy' ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                        </div>
                    );
                })}
            </div>

            {/* CSS for marquee animation if not in tailwind config */}
            <style>{`
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        /* Mobile adjustment */
        @media (max-width: 768px) {
           .animate-marquee {
             animation-duration: 15s;
           }
        }
      `}</style>
        </div>
    );
};

export default ActivityTicker;
