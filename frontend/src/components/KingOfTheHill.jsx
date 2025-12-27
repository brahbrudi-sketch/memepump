import React from 'react';
import { Crown, Sparkles, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const KingOfTheHill = ({ coins }) => {
    const navigate = useNavigate();

    // Find the "King" - coin with highest market cap
    const king = coins.length > 0
        ? [...coins].sort((a, b) => b.marketCap - a.marketCap)[0]
        : null;

    if (!king) return null;

    return (
        <div className="relative mb-12 group cursor-pointer" onClick={() => navigate(`/coins/${king.id}`)}>
            {/* Animated Glow Background */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>

            <div className="relative bg-gradient-to-br from-yellow-900/40 via-purple-900/60 to-purple-900/40 border border-yellow-500/50 rounded-2xl p-8 overflow-hidden">

                {/* Crown Badge */}
                <div className="absolute top-0 right-0 p-4">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black px-4 py-2 rounded-bl-2xl rounded-tr-lg flex items-center gap-2 shadow-lg shadow-yellow-500/20 animate-bounce-slow">
                        <Crown className="w-6 h-6 fill-current" />
                        KING OF THE HILL
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8 z-10 relative">
                    {/* Image with Halo */}
                    <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-yellow-500/30 blur-2xl rounded-full animate-pulse"></div>
                        <div className="text-8xl md:text-9xl relative z-10 animate-float drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                            {king.image}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div>
                            <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg flex items-center justify-center md:justify-start gap-4">
                                {king.name}
                                <span className="text-2xl opacity-75 font-mono bg-black/30 px-3 py-1 rounded-lg border border-yellow-500/30">
                                    {king.symbol}
                                </span>
                            </h3>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-yellow-200/80 mt-2 font-medium">
                                <Sparkles className="w-4 h-4" />
                                Running by {king.creator.substring(0, 8)}...
                            </div>
                        </div>

                        <p className="text-xl text-yellow-100/90 max-w-2xl italic">
                            "{king.description}"
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-xl mx-auto md:mx-0">
                            <div className="bg-black/40 rounded-xl p-3 border border-yellow-500/20 backdrop-blur-sm">
                                <div className="text-yellow-500 text-xs font-bold uppercase tracking-wider mb-1">Market Cap</div>
                                <div className="text-2xl font-bold text-white shadow-green-500/50">
                                    ${king.marketCap.toLocaleString()}
                                </div>
                            </div>
                            <div className="bg-black/40 rounded-xl p-3 border border-yellow-500/20 backdrop-blur-sm">
                                <div className="text-yellow-500 text-xs font-bold uppercase tracking-wider mb-1">Holders</div>
                                <div className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                                    <Users className="w-4 h-4" />
                                    {king.holders}
                                </div>
                            </div>
                            <div className="bg-black/40 rounded-xl p-3 border border-yellow-500/20 backdrop-blur-sm col-span-2 md:col-span-1">
                                <div className="text-yellow-500 text-xs font-bold uppercase tracking-wider mb-1">Bonding Curve</div>
                                <div className="relative w-full h-6 bg-gray-800 rounded-full overflow-hidden border border-gray-600 mt-1">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-yellow-500"
                                        style={{ width: `${king.progress}%` }}
                                    ></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                                        {king.progress.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="shrink-0 bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10 hidden lg:block">
                        <button className="bg-green-500 hover:bg-green-400 text-black font-black py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition transform hover:scale-105 active:scale-95 flex flex-col items-center gap-1">
                            <span className="text-lg">BUY NOW</span>
                            <span className="text-xs opacity-75">Join the hype!</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KingOfTheHill;
