import React, { useState } from 'react';
import axios from 'axios';
import { User, Key, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8080/api/v1';

const AuthModal = ({ onClose, onLogin }) => {
    const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        pin: '',
        avatar: '😎',
        bio: ''
    });

    const handleSubmit = async () => {
        if (!formData.username || !formData.pin) {
            toast.error('Username and PIN are required');
            return;
        }

        try {
            setLoading(true);
            let response;

            if (activeTab === 'register') {
                response = await axios.post(`${API_URL}/users`, {
                    username: formData.username,
                    pin: formData.pin,
                    avatar: formData.avatar,
                    bio: formData.bio
                });
                toast.success('Account created! Welcome!');
            } else {
                response = await axios.post(`${API_URL}/users/login`, {
                    username: formData.username,
                    pin: formData.pin
                });
                toast.success('Welcome back!');
            }

            onLogin(response.data);
            onClose();
        } catch (error) {
            console.error('Auth error:', error);
            const msg = error.response?.data?.error || 'Authentication failed';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-sm w-full border border-purple-500 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {activeTab === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                        {activeTab === 'login' ? 'Login' : 'Sign Up'}
                    </h2>
                    <button onClick={onClose} className="text-purple-300 hover:text-white transition">✕</button>
                </div>

                <div className="flex bg-purple-950/50 p-1 rounded-lg mb-6">
                    <button
                        onClick={() => setActiveTab('login')}
                        className={`flex-1 py-2 rounded-md font-bold text-sm transition ${activeTab === 'login' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:text-white'}`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setActiveTab('register')}
                        className={`flex-1 py-2 rounded-md font-bold text-sm transition ${activeTab === 'register' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:text-white'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-purple-200 mb-1 font-semibold text-sm">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-purple-400" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                placeholder="CryptoKing"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-purple-200 mb-1 font-semibold text-sm">Secret PIN</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 w-4 h-4 text-purple-400" />
                            <input
                                type="password"
                                value={formData.pin}
                                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400 tracking-widest"
                                placeholder="••••"
                                maxLength={6}
                            />
                        </div>
                        <p className="text-xs text-purple-400 mt-1">Don't forget this! It's your password.</p>
                    </div>

                    {activeTab === 'register' && (
                        <>
                            <div>
                                <label className="block text-purple-200 mb-1 font-semibold text-sm">Avatar</label>
                                <input
                                    type="text"
                                    value={formData.avatar}
                                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    placeholder="😎"
                                />
                            </div>
                            <div>
                                <label className="block text-purple-200 mb-1 font-semibold text-sm">Bio</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    placeholder="To the moon!"
                                    rows={2}
                                />
                            </div>
                        </>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 transition shadow-lg disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Processing...' : (activeTab === 'login' ? 'Login' : 'Create Account')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
