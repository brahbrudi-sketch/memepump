import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const API_URL = 'http://localhost:8080/api/v1';
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];

const Portfolio = ({ userId }) => {
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPortfolio = async () => {
            try {
                const response = await axios.get(`${API_URL}/users/${userId}/portfolio`);
                setPortfolio(response.data || []);
            } catch (error) {
                console.error('Error loading portfolio:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            loadPortfolio();
        }
    }, [userId]);

    if (loading) return <div className="text-center text-purple-300">Loading portfolio...</div>;

    if (portfolio.length === 0) {
        return <div className="text-center text-purple-300">No coins in portfolio. Start trading!</div>;
    }

    const totalValue = portfolio.reduce((acc, item) => acc + item.value, 0);

    const chartData = portfolio.map(item => ({
        name: item.coin.symbol,
        value: item.value
    }));

    return (
        <div className="space-y-6">
            <div className="bg-purple-950/50 rounded-lg p-4 border border-purple-700">
                <h3 className="text-white font-bold mb-2">Total Value</h3>
                <p className="text-3xl font-bold text-green-400">${totalValue.toFixed(2)}</p>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#2e1065',
                                border: '1px solid #7c3aed',
                                borderRadius: '8px'
                            }}
                            formatter={(value) => `$${value.toFixed(2)}`}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-3">
                {portfolio.map(item => (
                    <div key={item.coin.id} className="flex justify-between items-center bg-purple-900/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{item.coin.image}</span>
                            <div>
                                <div className="font-bold text-white">{item.coin.name} ({item.coin.symbol})</div>
                                <div className="text-xs text-purple-300">{item.amount.toFixed(4)} tokens</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-white">${item.value.toFixed(2)}</div>
                            <div className={`text-xs ${item.value >= item.amount * item.avgPrice ? 'text-green-400' : 'text-red-400'}`}>
                                {((item.value - (item.amount * item.avgPrice)) / (item.amount * item.avgPrice) * 100).toFixed(2)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Portfolio;
