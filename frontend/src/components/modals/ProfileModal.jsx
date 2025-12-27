import React, { useState } from 'react';
import axios from 'axios';
import { User, PieChart } from 'lucide-react';
import toast from 'react-hot-toast';
import Portfolio from '../Portfolio';

const API_URL = 'http://localhost:8080/api/v1';

const ProfileModal = ({ currentUser, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: currentUser?.username || '',
        avatar: currentUser?.avatar || '😎',
        bio: currentUser?.bio || ''
    });

    const handleSave = async () => {
        try {
            setLoading(true);
            const response = await axios.post(`${API_URL}/users`, formData);
            onSave(response.data);
            toast.success('Profil gespeichert!');
        } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-lg w-full border border-purple-500 max-h-[80vh] overflow-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                        <User className="w-8 h-8" />
                        User Profile
                    </h2>
                    <button onClick={onClose} className="text-white hover:text-purple-300 text-2xl">✕</button>
                </div>

                <div className="flex gap-2 mb-6 bg-purple-950/50 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-2 rounded-md font-bold transition flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:text-white'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('portfolio')}
                        className={`flex-1 py-2 rounded-md font-bold transition flex items-center justify-center gap-2 ${activeTab === 'portfolio' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:text-white'
                            }`}
                    >
                        <PieChart className="w-4 h-4" />
                        Portfolio
                    </button>
                </div>

                {activeTab === 'profile' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-purple-200 mb-2 font-semibold">Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                placeholder="CryptoKing"
                            />
                        </div>
                        <div>
                            <label className="block text-purple-200 mb-2 font-semibold">Avatar Emoji</label>
                            <input
                                type="text"
                                value={formData.avatar}
                                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                placeholder="😎"
                            />
                        </div>
                        <div>
                            <label className="block text-purple-200 mb-2 font-semibold">Bio</label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                placeholder="Diamond hands only 💎"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <Portfolio userId={currentUser?.id} />
                )}
            </div>
        </div>
    );
};

export default ProfileModal;
