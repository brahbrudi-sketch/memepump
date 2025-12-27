import React, { useState } from 'react';
import { TrendingUp, Plus, Filter, ArrowUpDown, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CoinCard from '../components/CoinCard';
import CreateCoinModal from '../components/modals/CreateCoinModal';

const Home = ({ coins, currentUser, onCoinCreated, comments }) => {
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [sortBy, setSortBy] = useState('marketCap');
    const [sortOrder, setSortOrder] = useState('desc');

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

    const filteredCoins = getFilteredAndSortedCoins();

    return (
        <div className="container mx-auto px-4 py-8">
            {showCreateModal && (
                <CreateCoinModal
                    currentUser={currentUser}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={onCoinCreated}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 p-6 rounded-2xl border border-purple-500/30 flex-1 w-full text-center md:text-left">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent mb-2">
                        Welcome to MemePump
                    </h2>
                    <p className="text-purple-300">Launch your own coin in seconds or trade the next moonshot.</p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition font-bold text-lg shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-1"
                >
                    <Rocket className="w-6 h-6" />
                    Start a new coin
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-purple-400" />
                        <h2 className="text-2xl font-bold">Live Market ({coins.length})</h2>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative">
                            <Filter className="w-5 h-5 text-purple-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search name or symbol..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg bg-purple-950 text-white border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['marketCap', 'progress', 'holders', 'createdAt'].map((field) => (
                        <button
                            key={field}
                            onClick={() => toggleSort(field)}
                            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${sortBy === field
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-950 text-purple-300 hover:bg-purple-800'
                                }`}
                        >
                            {field === 'createdAt' ? 'Newest' : field.charAt(0).toUpperCase() + field.slice(1).replace('Cap', ' Cap')}
                            <ArrowUpDown className="w-4 h-4" />
                        </button>
                    ))}
                </div>

                {filteredCoins.length === 0 ? (
                    <div className="text-center py-24 bg-purple-900/10 rounded-2xl border border-dashed border-purple-800">
                        <p className="text-xl text-purple-300 font-medium">
                            {filterText ? 'No coins match your filter' : 'No coins yet. Create the first one!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredCoins.map(coin => (
                            <CoinCard
                                key={coin.id}
                                coin={coin}
                                onClick={() => navigate(`/coins/${coin.id}`)}
                                commentCount={(comments[coin.id] || []).length}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
