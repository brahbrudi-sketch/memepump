import React from 'react';
import { Users, MessageSquare } from 'lucide-react';

const CoinCard = ({ coin, isSelected, onClick, commentCount }) => {
  return (
    <div
      onClick={() => onClick(coin)}
      className={`bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border cursor-pointer transition hover:scale-[1.02] ${
        isSelected
          ? 'border-purple-400 shadow-lg shadow-purple-500/50'
          : 'border-purple-500/30 hover:border-purple-400'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="text-5xl">{coin.image}</div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold">{coin.name}</h3>
              <p className="text-purple-300">${coin.symbol}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-400">
                ${coin.marketCap.toFixed(2)}
              </div>
              <div className="text-sm text-purple-300">Market Cap</div>
            </div>
          </div>
          
          <p className="text-gray-300 mb-3">{coin.description}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-purple-300">Progress</span>
              <span className="text-white font-bold">{coin.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-purple-950 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${coin.progress}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-3 text-sm text-purple-300">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{coin.holders} holders</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{commentCount} comments</span>
            </div>
            <div>by {coin.creator}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinCard;
