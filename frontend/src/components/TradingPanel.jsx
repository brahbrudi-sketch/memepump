import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { History, MessageSquare, Send } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1';

const PriceChart = ({ trades }) => {
    const getPriceHistory = () => {
        if (trades.length === 0) return [];

        return trades.map((trade, index) => ({
            time: new Date(trade.timestamp).toLocaleTimeString(),
            price: trade.price,
            index: index
        }));
    };

    const priceHistory = getPriceHistory();

    if (priceHistory.length === 0) {
        return (
            <div className="bg-purple-950/50 rounded-lg p-6 border border-purple-700 text-center text-purple-300">
                No price history yet. Make some trades!
            </div>
        );
    }

    return (
        <div className="bg-purple-950/50 rounded-lg p-4 border border-purple-700">
            <h3 className="text-white font-bold mb-4">Price Chart</h3>
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                    <XAxis dataKey="time" stroke="#a78bfa" fontSize={12} />
                    <YAxis stroke="#a78bfa" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#2e1065',
                            border: '1px solid #7c3aed',
                            borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#a78bfa' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={{ fill: '#a855f7', r: 4 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

const CommentsSection = ({ coin, comments, currentUser, setShowProfileModal, setComments }) => {
    const [commentText, setCommentText] = useState('');

    const handlePostComment = async () => {
        if (!commentText.trim()) return;
        if (!currentUser) {
            toast.error('Bitte erstelle zuerst ein Profil!');
            setShowProfileModal(true);
            return;
        }

        try {
            await axios.post(`${API_URL}/comments`, {
                coinId: coin.id,
                userId: currentUser.id,
                username: currentUser.username,
                avatar: currentUser.avatar,
                content: commentText
            });
            setCommentText('');
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    };

    return (
        <div className="bg-purple-950/50 rounded-lg p-4 border border-purple-700">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments ({comments.length})
            </h3>

            <div className="mb-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                        placeholder="Add a comment..."
                        className="flex-1 px-4 py-2 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                        onClick={handlePostComment}
                        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map(comment => (
                    <div key={comment.id} className="bg-purple-900/30 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <span className="text-2xl">{comment.avatar}</span>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-white">{comment.username}</span>
                                    <span className="text-xs text-purple-400">
                                        {new Date(comment.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-purple-100">{comment.content}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TradingPanel = ({ coin, trades, comments, currentUser, setShowProfileModal, setShowTradeHistory, setComments }) => {
    const [isBuying, setIsBuying] = useState(true);
    const [tradeAmount, setTradeAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTrade = async () => {
        if (!tradeAmount) {
            toast.error('Bitte Betrag eingeben');
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${API_URL}/trades`, {
                coinId: coin.id,
                type: isBuying ? 'buy' : 'sell',
                amount: parseFloat(tradeAmount),
                wallet: '0x' + Math.random().toString(16).substr(2, 8),
                username: currentUser?.username || 'Anonymous'
            });

            setTradeAmount('');
        } catch (error) {
            console.error('Error trading:', error);
            toast.error('Fehler beim Trade: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const coinTrades = trades.filter(t => t.coinId === coin.id);

    return (
        <div className="space-y-4">
            <PriceChart trades={coinTrades} />
            <CommentsSection
                coin={coin}
                comments={comments}
                currentUser={currentUser}
                setShowProfileModal={setShowProfileModal}
                setComments={setComments}
            />

            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 border border-purple-500">
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setIsBuying(true)}
                        className={`flex-1 py-3 rounded-lg font-bold transition ${isBuying ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => setIsBuying(false)}
                        className={`flex-1 py-3 rounded-lg font-bold transition ${!isBuying ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        Sell
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-purple-200 mb-2 font-semibold">Amount (SOL)</label>
                        <input
                            type="number"
                            value={tradeAmount}
                            onChange={(e) => setTradeAmount(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            placeholder="0.0"
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div className="bg-purple-950 rounded-lg p-4 border border-purple-700">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-purple-200">Current Price</span>
                            <span className="text-white font-bold">${coin.price.toFixed(8)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-purple-200">Market Cap</span>
                            <span className="text-green-400">${coin.marketCap.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleTrade}
                        disabled={!tradeAmount || loading}
                        className={`w-full py-4 rounded-lg font-bold text-lg transition ${tradeAmount && !loading
                            ? isBuying
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                                : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {loading ? 'Processing...' : `${isBuying ? 'Buy' : 'Sell'} ${coin.symbol}`}
                    </button>

                    <button
                        onClick={() => setShowTradeHistory(true)}
                        className="w-full py-3 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold transition flex items-center justify-center gap-2"
                    >
                        <History className="w-5 h-5" />
                        View Trade History
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TradingPanel;
