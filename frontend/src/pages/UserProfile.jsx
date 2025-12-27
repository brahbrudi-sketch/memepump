import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Calendar, Twitter, Globe, Send, ArrowLeft, Coins, PieChart, Layers } from 'lucide-react';
import Portfolio from '../components/Portfolio';

const API_URL = 'http://localhost:8080/api/v1';

const UserProfile = ({ coins }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' or 'created'

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get(`${API_URL}/users/${id}`);
                setUser(response.data);
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    if (loading) {
        return <div className="text-center p-8 text-white">Loading profile...</div>;
    }

    if (!user) {
        return <div className="text-center p-8 text-white">User not found</div>;
    }

    // Filter created coins
    const createdCoins = coins.filter(c => c.creator === user.username);

    return (
        <div className="container mx-auto px-4 py-8">
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-purple-300 hover:text-white mb-6 transition"
            >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
            </button>

            <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-8 border border-purple-500/30 backdrop-blur-md mb-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="text-8xl bg-purple-950 rounded-full p-4 border-4 border-purple-500 shadow-xl">
                        {user.avatar}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-4xl font-bold text-white mb-2">{user.username}</h1>
                        <p className="text-purple-200 text-lg mb-4">{user.bio || 'No bio yet.'}</p>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4">
                            {user.twitter && (
                                <a href={user.twitter.startsWith('http') ? user.twitter : `https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm hover:bg-blue-500/40 transition">
                                    <Twitter className="w-4 h-4" /> @{user.twitter.replace('https://twitter.com/', '').replace('http://twitter.com/', '')}
                                </a>
                            )}
                            {user.telegram && (
                                <a href={user.telegram.startsWith('http') ? user.telegram : `https://t.me/${user.telegram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-400/20 text-blue-300 px-3 py-1 rounded-full text-sm hover:bg-blue-400/40 transition">
                                    <Send className="w-4 h-4" /> Telegram
                                </a>
                            )}
                            {user.website && (
                                <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-sm hover:bg-pink-500/40 transition">
                                    <Globe className="w-4 h-4" /> Website
                                </a>
                            )}
                        </div>

                        <div className="flex justify-center md:justify-start gap-6 text-sm text-purple-400">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1 text-green-400 font-bold">
                                <Coins className="w-4 h-4" />
                                {createdCoins.length} Coins Launched
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-purple-800 pb-2">
                <button
                    onClick={() => setActiveTab('portfolio')}
                    className={`px-4 py-2 font-bold flex items-center gap-2 transition border-b-2 ${activeTab === 'portfolio' ? 'text-white border-purple-500' : 'text-purple-400 border-transparent hover:text-white'}`}
                >
                    <PieChart className="w-4 h-4" /> Portfolio
                </button>
                <button
                    onClick={() => setActiveTab('created')}
                    className={`px-4 py-2 font-bold flex items-center gap-2 transition border-b-2 ${activeTab === 'created' ? 'text-white border-purple-500' : 'text-purple-400 border-transparent hover:text-white'}`}
                >
                    <Layers className="w-4 h-4" /> Created Coins
                </button>
            </div>

            {activeTab === 'portfolio' ? (
                <Portfolio userId={user.id} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {createdCoins.length > 0 ? (
                        createdCoins.map(coin => (
                            <div key={coin.id} onClick={() => navigate(`/coins/${coin.id}`)} className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 cursor-pointer hover:bg-purple-800/40 transition flex items-center gap-4">
                                <span className="text-4xl">{coin.image}</span>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{coin.name}</h3>
                                    <p className="text-sm text-purple-300">${coin.marketCap.toLocaleString()} MC</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center text-purple-400 py-8">
                            No coins launched yet.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserProfile;
