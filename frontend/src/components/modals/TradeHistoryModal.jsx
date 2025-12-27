import React from 'react';
import { History } from 'lucide-react';

const TradeHistoryModal = ({ isOpen, onClose, trades, coins, selectedCoin }) => {
    if (!isOpen) return null;

    const coinTrades = selectedCoin ? trades.filter(t => t.coinId === selectedCoin.id) : trades;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-auto border border-purple-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                        <History className="w-8 h-8" />
                        Trade History
                        {selectedCoin && ` - ${selectedCoin.symbol}`}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-purple-300 text-2xl"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-3">
                    {coinTrades.length === 0 ? (
                        <div className="text-center py-8 text-purple-300">
                            No trades yet
                        </div>
                    ) : (
                        [...coinTrades].reverse().map(trade => {
                            const coin = coins.find(c => c.id === trade.coinId);
                            return (
                                <div key={trade.id} className="bg-purple-950/50 rounded-lg p-4 border border-purple-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {coin && <span className="text-3xl">{coin.image}</span>}
                                            <div>
                                                <div className="font-bold text-white">
                                                    {coin?.symbol || 'Unknown'} - {trade.username || 'Anonymous'}
                                                </div>
                                                <div className="text-sm text-purple-300">
                                                    {new Date(trade.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold text-lg ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                                {trade.type.toUpperCase()} {trade.amount} SOL
                                            </div>
                                            <div className="text-sm text-purple-300">
                                                @ ${trade.price.toFixed(8)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default TradeHistoryModal;
