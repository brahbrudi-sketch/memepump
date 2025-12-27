import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';

import Header from './components/Header';
import Home from './pages/Home';
import CoinDetails from './pages/CoinDetails';
import UserProfile from './pages/UserProfile';
import AuthModal from './components/modals/AuthModal';
import SettingsModal from './components/modals/SettingsModal';
import TradeHistoryModal from './components/modals/TradeHistoryModal';
import ActivityTicker from './components/ActivityTicker';

const API_URL = 'http://localhost:8080/api/v1';
const WS_URL = 'ws://localhost:8080/ws';

function App() {
  const [coins, setCoins] = useState([]);
  const [trades, setTrades] = useState([]);
  const [comments, setComments] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);

  const wsRef = useRef(null);

  // --- WebSocket & Data Loading ---

  // Defined BEFORE useEffect to avoid TDZ error in dependency array
  const connectWebSocket = useCallback(() => {
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
        // We can reload coins to update prices, or just push the trade
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
  }, []);

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
  }, [connectWebSocket]);

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
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onLogin={(user) => {
              saveUser(user);
              setShowAuthModal(false);
            }}
          />
        )}

        {showSettingsModal && currentUser && (
          <SettingsModal
            currentUser={currentUser}
            onClose={() => setShowSettingsModal(false)}
            onUpdate={saveUser}
            onLogout={() => {
              localStorage.removeItem('memepump_user');
              setCurrentUser(null);
            }}
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
        <Header
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenHistory={() => setShowTradeHistory(true)}
        />

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
                setShowAuthModal={setShowAuthModal}
              />
            }
          />
          <Route
            path="/u/:id"
            element={<UserProfile coins={coins} />}
          />
        </Routes>

        <ActivityTicker trades={trades} coins={coins} />

      </div>
    </Router>
  );
}

export default App;