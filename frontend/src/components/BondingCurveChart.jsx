import React, { useMemo, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Format numbers for display (outside component to avoid recreation)
const formatSupply = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}B`;
    if (value >= 1) return `${value.toFixed(0)}M`;
    return `${(value * 1000).toFixed(0)}K`;
};

const formatPrice = (value) => {
    if (value < 0.00001) return value.toExponential(2);
    if (value < 0.001) return value.toFixed(6);
    if (value < 1) return value.toFixed(4);
    return value.toFixed(2);
};

/**
 * BondingCurveChart - Visualizes the bonding curve for a token
 * Shows price vs supply with current position and graduation target
 */
function BondingCurveChart({
    curveData,          // Array of { supply, price, marketCap, isCurrent }
    currentSupply,
    currentPrice,
    targetMarketCap = 100000,
    showProgress = true,
    height = 300
}) {
    // Generate curve points if not provided
    const chartData = useMemo(() => {
        if (curveData && curveData.length > 0) {
            return curveData;
        }

        // Generate default exponential curve
        const points = [];
        const maxSupply = 1200000000;
        const basePrice = 0.00001;
        const k = 0.000000001;

        for (let i = 0; i <= 100; i++) {
            const supply = (i / 100) * maxSupply;
            const price = basePrice * Math.exp(k * supply);
            points.push({
                supply: supply / 1000000, // Display in millions
                price,
                isCurrent: Math.abs(supply - currentSupply) < maxSupply / 100
            });
        }
        return points;
    }, [curveData, currentSupply]);

    // Find graduation point (where market cap reaches target)
    const graduationPoint = useMemo(() => {
        if (!chartData.length) return null;

        for (const point of chartData) {
            if (point.supply * 1000000 * point.price >= targetMarketCap) {
                return point;
            }
        }
        return null;
    }, [chartData, targetMarketCap]);

    // Custom tooltip render function (not a component)
    const renderTooltip = useCallback(({ active, payload }) => {
        if (!active || !payload?.length) return null;

        const data = payload[0].payload;
        return (
            <div className="bg-slate-800 border border-purple-500 rounded-lg p-3 shadow-xl">
                <p className="text-sm text-gray-300">
                    Supply: <span className="text-white font-medium">{formatSupply(data.supply)}</span>
                </p>
                <p className="text-sm text-gray-300">
                    Price: <span className="text-green-400 font-medium">{formatPrice(data.price)} SOL</span>
                </p>
                {data.isCurrent && (
                    <p className="text-xs text-purple-400 mt-1">← Current Position</p>
                )}
            </div>
        );
    }, []);

    // Calculate progress percentage
    const progress = Math.min(100, (currentSupply * currentPrice / targetMarketCap) * 100);

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Bonding Curve</h3>
                {showProgress && (
                    <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-sm text-gray-400">{progress.toFixed(1)}%</span>
                    </div>
                )}
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <XAxis
                        dataKey="supply"
                        tickFormatter={formatSupply}
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={{ stroke: '#475569' }}
                    />
                    <YAxis
                        tickFormatter={formatPrice}
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={{ stroke: '#475569' }}
                        width={60}
                    />
                    <Tooltip content={renderTooltip} />

                    {/* Graduation line */}
                    {graduationPoint && (
                        <ReferenceLine
                            x={graduationPoint.supply}
                            stroke="#22c55e"
                            strokeDasharray="5 5"
                            label={{
                                value: '🎓 Graduation',
                                fill: '#22c55e',
                                fontSize: 12,
                                position: 'top'
                            }}
                        />
                    )}

                    {/* Current position line */}
                    <ReferenceLine
                        x={currentSupply / 1000000}
                        stroke="#f59e0b"
                        strokeWidth={2}
                        label={{
                            value: 'You are here',
                            fill: '#f59e0b',
                            fontSize: 11,
                            position: 'insideTopRight'
                        }}
                    />

                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#curveGradient)"
                        animationDuration={1000}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-purple-500"></div>
                    <span>Price Curve</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-amber-500"></div>
                    <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-green-500" style={{ borderStyle: 'dashed' }}></div>
                    <span>Graduation (${(targetMarketCap / 1000).toFixed(0)}k)</span>
                </div>
            </div>
        </div>
    );
}

export default BondingCurveChart;
