import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Rocket, TrendingUp, Zap, Plus, Users, History, ArrowUpDown, Filter, MessageSquare, User, Send } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = 'http://localhost:8080/api/v1';
const WS_URL = 'ws://localhost:8080/ws';

function App() {
  const [coins, setCoins] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tradeAmount, setTradeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState([]);
  const [comments, setComments] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [sortBy, setSortBy] = useState('marketCap');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterText, setFilterText] = useState('');
  const wsRef = useRef(null);

  useEffect(() => {
    loadCoins();
    loadTrades();
    loadStoredUser();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'coins') {
        setCoins(message.data || []);
      } else if (message.type === 'coinCreated') {
        setCoins(prev => [message.data, ...prev]);
      } else if (message.type === 'trade') {
        loadCoins();
        setTrades(prev => [message.data.trade, ...prev]);
        if (selectedCoin?.id === message.data.coin.id) {
          setSelectedCoin(message.data.coin);
        }
      } else if (message.type === 'comment') {
        setComments(prev => ({
          ...prev,
          [message.data.coinId]: [...(prev[message.data.coinId] || []), message.data]
        }));
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(connectWebSocket, 3000);
    };

    wsRef.current = ws;
  };

  const loadStoredUser = () => {
    const stored = localStorage.getItem('memepump_user');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  };

  const saveUser = (user) => {
    localStorage.setItem('memepump_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const loadCoins = async () => {
    try {
      const response = await axios.get(`${API_URL}/coins`);
      setCoins(response.data || []);
    } catch (error) {
      console.error('Error loading coins:', error);
    }
  };

  const loadTrades = async () => {
    try {
      const response = await axios.get(`${API_URL}/trades`);
      setTrades(response.data || []);
    } catch (error) {
      console.error('Error loading trades:', error);
    }
  };

  const loadComments = async (coinId) => {
    try {
      const response = await axios.get(`${API_URL}/comments?coinId=${coinId}`);
      setComments(prev => ({
        ...prev,
        [coinId]: response.data || []
      }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  useEffect(() => {
    if (selectedCoin) {
      loadComments(selectedCoin.id);
    }
  }, [selectedCoin]);

  const getFilteredAndSortedCoins = () => {
    let filtered = coins.filter(coin => 
      coin.name.toLowerCase().includes(filterText.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(filterText.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getPriceHistory = (coinId) => {
    const coinTrades = trades.filter(t => t.coinId === coinId);
    if (coinTrades.length === 0) return [];

    const history = coinTrades.map((trade, index) => ({
      time: new Date(trade.timestamp).toLocaleTimeString(),
      price: trade.price,
      index: index
    }));

    return history;
  };

  const ProfileModal = () => {
    const [formData, setFormData] = useState({
      username: currentUser?.username || '',
      avatar: currentUser?.avatar || '😎',
      bio: currentUser?.bio || ''
    });

    const handleSave = async () => {
      try {
        setLoading(true);
        const response = await axios.post(`${API_URL}/users`, formData);
        saveUser(response.data);
        setShowProfileModal(false);
      } catch (error) {
        console.error('Error saving profile:', error);
        alert('Fehler beim Speichern');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-md w-full border border-purple-500">
          <h2 className="text-3xl font-bold mb-6 text-white flex items-center gap-2">
            <User className="w-8 h-8" />
            {currentUser ? 'Edit Profile' : 'Create Profile'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-purple-200 mb-2 font-semibold">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="CryptoKing"
              />
            </div>
            <div>
              <label className="block text-purple-200 mb-2 font-semibold">Avatar Emoji</label>
              <input
                type="text"
                value={formData.avatar}
                onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="😎"
              />
            </div>
            <div>
              <label className="block text-purple-200 mb-2 font-semibold">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Diamond hands only 💎"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-6 py-3 rounded-lg bg-gray-700 text-white font-bold hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CreateCoinModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      symbol: '',
      description: '',
      image: '',
      creator: currentUser?.username || '0x' + Math.random().toString(16).substr(2, 8)
    });

    const handleCreate = async () => {
      if (!formData.name || !formData.symbol || !formData.description || !formData.image) {
        alert('Bitte alle Felder ausfüllen');
        return;
      }
      
      try {
        setLoading(true);
        await axios.post(`${API_URL}/coins`, formData);
        setShowCreateModal(false);
        setFormData({ name: '', symbol: '', description: '', image: '', creator: formData.creator });
      } catch (error) {
        console.error('Error creating coin:', error);
        alert('Fehler beim Erstellen des Coins');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-md w-full border border-purple-500">
          <h2 className="text-3xl font-bold mb-6 text-white">Create Meme Coin</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-purple-200 mb-2 font-semibold">Coin Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Doge Moon"
              />
            </div>
            <div>
              <label className="block text-purple-200 mb-2 font-semibold">Symbol</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="DGMN"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-purple-200 mb-2 font-semibold">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="The next 100x gem!"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-purple-200 mb-2 font-semibold">Emoji</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({...formData, image: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="🚀"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 rounded-lg bg-gray-700 text-white font-bold hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Launch 🚀'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TradeHistoryModal = () => {
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
              onClick={() => setShowTradeHistory(false)}
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
              coinTrades.reverse().map(trade => {
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

  const CommentsSection = ({ coin }) => {
    const coinComments = comments[coin.id] || [];

    const handlePostComment = async () => {
      if (!commentText.trim()) return;
      if (!currentUser) {
        alert('Bitte erstelle zuerst ein Profil!');
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
          Comments ({coinComments.length})
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
          {coinComments.map(comment => (
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

  const PriceChart = ({ coin }) => {
    const priceHistory = getPriceHistory(coin.id);
    
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
            <YAxis stroke="#a78bfa" fontSize={12} />
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

  const TradingPanel = ({ coin }) => {
    const [isBuying, setIsBuying] = useState(true);

    const handleTrade = async () => {
      if (!tradeAmount) {
        alert('Bitte Betrag eingeben');
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
        alert('Fehler beim Trade');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-4">
        <PriceChart coin={coin} />
        <CommentsSection coin={coin} />
        
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 border border-purple-500">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsBuying(true)}
              className={`flex-1 py-3 rounded-lg font-bold transition ${
                isBuying ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setIsBuying(false)}
              className={`flex-1 py-3 rounded-lg font-bold transition ${
                !isBuying ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
              className={`w-full py-4 rounded-lg font-bold text-lg transition ${
                tradeAmount && !loading
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

  const filteredCoins = getFilteredAndSortedCoins();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {showCreateModal && <CreateCoinModal />}
      {showTradeHistory && <TradeHistoryModal />}
      {showProfileModal && <ProfileModal />}
      
      <header className="border-b border-purple-500/30 backdrop-blur-sm bg-black/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                MemePump
              </h1>
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                LIVE
              </span>
            </div>
            <div className="flex gap-3 items-center">
              {currentUser && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/50 border border-purple-500">
                  <span className="text-2xl">{currentUser.avatar}</span>
                  <span className="font-bold">{currentUser.username}</span>
                </div>
              )}
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-700 hover:bg-indigo-600 transition font-bold"
              >
                <User className="w-5 h-5" />
                {currentUser ? 'Edit Profile' : 'Create Profile'}
              </button>
              <button
                onClick={() => setShowTradeHistory(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-700 hover:bg-purple-600 transition font-bold"
              >
                <History className="w-5 h-5" />
                All Trades
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition font-bold"
              >
                <Plus className="w-5 h-5" />
                Create Coin
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold">All Coins ({coins.length})</h2>
              </div>
              
              <div className="flex gap-2">
                <div className="relative">
                  <Filter className="w-5 h-5 text-purple-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter coins..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => toggleSort('marketCap')}
                className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                  sortBy === 'marketCap' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-950 text-purple-300 hover:bg-purple-800'
                }`}
              >
                Market Cap
                <ArrowUpDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleSort('progress')}
                className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                  sortBy === 'progress' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-950 text-purple-300 hover:bg-purple-800'
                }`}
              >
                Progress
                <ArrowUpDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleSort('holders')}
                className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                  sortBy === 'holders' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-950 text-purple-300 hover:bg-purple-800'
                }`}
              >
                Holders
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>

            {filteredCoins.length === 0 ? (
              <div className="text-center py-12 text-purple-300">
                {filterText ? 'No coins match your filter' : 'No coins yet. Create the first one!'}
              </div>
            ) : (
              filteredCoins.map(coin => (
                <div
                  key={coin.id}
                  onClick={() => setSelectedCoin(coin)}
                  className={`bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border cursor-pointer transition hover:scale-[1.02] ${
                    selectedCoin?.id === coin.id 
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
                          <span>{(comments[coin.id] || []).length} comments</span>
                        </div>
                        <div>by {coin.creator}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-4">
              {selectedCoin ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border border-purple-500/30">
                    <div className="text-center mb-4">
                      <div className="text-6xl mb-3">{selectedCoin.image}</div>
                      <h3 className="text-2xl font-bold">{selectedCoin.name}</h3>
                      <p className="text-purple-300">${selectedCoin.symbol}</p>
                    </div>
                  </div>
                  <TradingPanel coin={selectedCoin} />
                </div>
              ) : (
                <div className="bg-purple-900/30 rounded-xl p-8 border border-purple-500/30 text-center text-purple-300">
                  <Rocket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-bold mb-2">Select a coin to trade</p>
                  <p className="text-sm">Click on any coin from the list to view charts and trade.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;