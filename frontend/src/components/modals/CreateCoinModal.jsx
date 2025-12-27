import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Twitter, Globe, Send, Rocket } from 'lucide-react';

const API_URL = 'http://localhost:8080/api/v1';

const CreateCoinModal = ({ currentUser, onClose, onCreated }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        image: '',
        creator: currentUser?.username || '0x' + Math.random().toString(16).substr(2, 8),
        twitter: '',
        telegram: '',
        website: '',
        initialBuyAmount: 0
    });

    const handleCreate = async () => {
        if (!formData.name || !formData.symbol || !formData.description || !formData.image) {
            toast.error('Bitte alle Felder ausfüllen');
            return;
        }

        try {
            setLoading(true);
            const payload = { ...formData, initialBuyAmount: parseFloat(formData.initialBuyAmount) || 0 };
            await axios.post(`${API_URL}/coins`, payload);
            onCreated();
            toast.success('Coin erfolgreich erstellt! 🚀');
            onClose();
        } catch (error) {
            console.error('Error creating coin:', error);
            toast.error('Fehler beim Erstellen des Coins');
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
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            placeholder="Doge Moon"
                            maxLength={32}
                        />
                    </div>
                    <div>
                        <label className="block text-purple-200 mb-2 font-semibold">Symbol</label>
                        <input
                            type="text"
                            value={formData.symbol}
                            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            placeholder="DGMN"
                            maxLength={10}
                        />
                    </div>
                    <div>
                        <label className="block text-purple-200 mb-2 font-semibold">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            placeholder="The next 100x gem!"
                            rows={3}
                            maxLength={500}
                        />
                    </div>
                    <div>
                        <label className="block text-purple-200 mb-2 font-semibold">Emoji</label>
                        <input
                            type="text"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            placeholder="🚀"
                        />
                    </div>

                    <div className="space-y-4 border-t border-purple-700 pt-4">
                        <h3 className="text-purple-300 font-bold uppercase text-sm tracking-wider">Socials (Optional)</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" value={formData.twitter} onChange={e => setFormData({ ...formData, twitter: e.target.value })} placeholder="Twitter" className="px-3 py-2 rounded bg-purple-950 border border-purple-500 text-sm focus:outline-none" />
                            <input type="text" value={formData.telegram} onChange={e => setFormData({ ...formData, telegram: e.target.value })} placeholder="Telegram" className="px-3 py-2 rounded bg-purple-950 border border-purple-500 text-sm focus:outline-none" />
                            <input type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="Website" className="px-3 py-2 rounded bg-purple-950 border border-purple-500 text-sm focus:outline-none" />
                        </div>
                    </div>

                    <div className="bg-purple-950/50 p-4 rounded-xl border border-purple-700">
                        <h3 className="text-green-400 font-bold uppercase text-sm tracking-wider mb-2">Initial Buy (Snipe) 🎯</h3>
                        <input
                            type="number"
                            value={formData.initialBuyAmount}
                            onChange={(e) => setFormData({ ...formData, initialBuyAmount: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-purple-900 text-white border border-purple-500 focus:outline-none font-mono"
                            placeholder="0.0 SOL"
                            step="0.1"
                            min="0"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
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

export default CreateCoinModal;
