import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Rocket, User, History } from 'lucide-react';

import Home from './pages/Home';
import CoinDetails from './pages/CoinDetails';
import ProfileModal from './components/modals/ProfileModal';
import TradeHistoryModal from './components/modals/TradeHistoryModal';

const API_URL = 'http://localhost:8080/api/v1';
const WS_URL = 'ws://localhost:8080/ws';

function App() {
  const [coins, setCoins] = useState([]);
  const [trades, setTrades] = useState([]);
  const [comments, setComments] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);

  const wsRef = useRef(null);

  // --- WebSocket & Data Loading ---
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
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-purple-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <span className="text-3xl">🚀</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-white">New Coin Launched!</p>
                  <p className="mt-1 text-sm text-purple-200">{message.data.name} ({message.data.symbol})</p>
                </div>
              </div>
            </div>
          </div>
        ), { duration: 4000 });

      } else if (message.type === 'trade') {
        loadCoins();
        setTrades(prev => [message.data.trade, ...prev]);
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

  // Comments loading is optimized to load on demand in the components usually,
  // but for WS updates we need the state here. 
  // We can let the components fetch initial history.

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#3b0764',
            color: '#fff',
            border: '1px solid #7c3aed'
          }
        }} />

        {/* Modals placed at root level */}
        {showProfileModal && (
          <ProfileModal
            currentUser={currentUser}
            onClose={() => setShowProfileModal(false)}
            onSave={saveUser} // Pass the saveUser function to update state
          />
        )}
        {showTradeHistory && (
          <TradeHistoryModal
            isOpen={showTradeHistory}
            onClose={() => setShowTradeHistory(false)}
            trades={trades}
            coins={coins}
          />
        )}

        {/* Global Header */}
        <header className="border-b border-purple-500/30 backdrop-blur-sm bg-black/20 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-3 hover:opacity-80 transition">
                <Rocket className="w-8 h-8 text-purple-400" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  MemePump
                </h1>
                <span className="hidden sm:flex px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  LIVE
                </span>
              </a>

              <div className="flex gap-3 items-center">
                {currentUser && (
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/50 border border-purple-500">
                    <span className="text-2xl">{currentUser.avatar}</span>
                    <span className="font-bold truncate max-w-[100px]">{currentUser.username}</span>
                  </div>
                )}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-indigo-700 hover:bg-indigo-600 transition font-bold text-sm sm:text-base"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline">{currentUser ? 'Profile' : 'Login'}</span>
                </button>
                <button
                  onClick={() => setShowTradeHistory(true)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-purple-700 hover:bg-purple-600 transition font-bold text-sm sm:text-base"
                >
                  <History className="w-5 h-5" />
                  <span className="hidden sm:inline">Trades</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Info */}
        <Routes>
          <Route
            path="/"
            element={
              <Home
                coins={coins}
                currentUser={currentUser}
                comments={comments}
              />
            }
          />
          <Route
            path="/coins/:id"
            element={
              <CoinDetails
                coins={coins}
                trades={trades}
                comments={comments}
                currentUser={currentUser}
                setShowProfileModal={setShowProfileModal}
                setComments={setComments}
              />
            }
          />
        </Routes>

      </div>
    </Router>
  );
}

export default App;