import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8080/api/v1';

const CreateCoinModal = ({ currentUser, onClose, onCreated }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        description: '',
        image: '',
        creator: currentUser?.username || '0x' + Math.random().toString(16).substr(2, 8)
    });

    const handleCreate = async () => {
        if (!formData.name || !formData.symbol || !formData.description || !formData.image) {
            toast.error('Bitte alle Felder ausfüllen');
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${API_URL}/coins`, formData);
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
