import React, { useState } from 'react';
import axios from 'axios';
import { User, Key, Save, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8080/api/v1';

const SettingsModal = ({ currentUser, onClose, onUpdate, onLogout }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        pin: '', // Required to authorize changes
        avatar: currentUser?.avatar || '😎',
        bio: currentUser?.bio || '',
        twitter: currentUser?.twitter || '',
        telegram: currentUser?.telegram || '',
        website: currentUser?.website || ''
    });

    const handleSave = async () => {
        if (!formData.pin) {
            toast.error('Please enter your PIN to save changes');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.put(`${API_URL}/users/${currentUser.id}`, formData);
            onUpdate(response.data);
            toast.success('Settings saved!');
            onClose();
        } catch (error) {
            console.error('Error saving settings:', error);
            const msg = error.response?.data?.error || 'Failed to update';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-lg w-full border border-purple-500 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                        <User className="w-8 h-8" />
                        Settings
                    </h2>
                    <button onClick={onClose} className="text-white hover:text-purple-300 text-2xl">✕</button>
                </div>

                <div className="space-y-4">
                    <div className="bg-purple-950/40 p-4 rounded-lg border border-purple-600/30 mb-4">
                        <p className="text-purple-200 text-sm mb-1">Logged in as:</p>
                        <h3 className="text-xl font-bold text-white">{currentUser.username}</h3>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input type="text" value={formData.twitter} onChange={e => setFormData({ ...formData, twitter: e.target.value })} placeholder="Twitter" className="px-3 py-2 rounded bg-purple-950 border border-purple-500 text-sm focus:outline-none text-white" />
                        <input type="text" value={formData.telegram} onChange={e => setFormData({ ...formData, telegram: e.target.value })} placeholder="Telegram" className="px-3 py-2 rounded bg-purple-950 border border-purple-500 text-sm focus:outline-none text-white" />
                        <input type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="Website" className="px-3 py-2 rounded bg-purple-950 border border-purple-500 text-sm focus:outline-none text-white" />
                    </div>

                    <div className="bg-purple-950/80 p-4 rounded-lg border border-purple-500 mt-6">
                        <label className="block text-purple-200 mb-2 font-semibold flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Confirm PIN to Save
                        </label>
                        <input
                            type="password"
                            value={formData.pin}
                            onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-black/30 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400 tracking-widest font-mono"
                            placeholder="••••"
                            maxLength={6}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            <Save className="w-5 h-5" /> Save Changes
                        </button>
                    </div>
                </div>

                <div className="mt-8 border-t border-purple-800 pt-6">
                    <button
                        onClick={() => {
                            onLogout();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 font-bold py-2 border border-red-900/50 hover:bg-red-900/20 rounded-lg transition"
                    >
                        <LogOut className="w-5 h-5" /> Log Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
