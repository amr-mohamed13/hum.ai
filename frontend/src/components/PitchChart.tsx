/**
 * PitchChart Component
 * =====================
 * Visualizes the comparison between the user's hummed melody and the matched song segment.
 * 
 * This chart helps users understand why a particular song was matched by showing:
 * - The normalized pitch contour of their hum (blue line)
 * - The normalized pitch contour of the matched song segment (green line)
 * 
 * The closer the shapes of these two lines, the better the match.
 * Values are in "normalized MIDI" units - centered around zero for key invariance.
 */

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

// Props interface
interface PitchChartProps {
    humPitch: number[];    // User's normalized pitch contour
    songPitch: number[];   // Matched song segment's pitch contour
}

/**
 * PitchChart - Dual-line chart comparing hum and song pitch contours
 */
export function PitchChart({ humPitch, songPitch }: PitchChartProps) {
    /**
     * Transform the pitch arrays into a format suitable for Recharts.
     * 
     * We need to align the two sequences for comparison. Since DTW may have
     * matched sequences of different lengths, we'll normalize the time axis
     * to show both at the same scale.
     */
    const chartData = useMemo(() => {
        // Determine the longer sequence for the x-axis
        const maxLength = Math.max(humPitch.length, songPitch.length);
        const data = [];

        for (let i = 0; i < maxLength; i++) {
            // Interpolate to handle different length sequences
            const humIndex = Math.floor((i / maxLength) * humPitch.length);
            const songIndex = Math.floor((i / maxLength) * songPitch.length);

            data.push({
                // Time index (normalized to percentage)
                time: Math.round((i / maxLength) * 100),
                // Hum pitch value (or null if out of bounds)
                hum: humIndex < humPitch.length ? Number(humPitch[humIndex].toFixed(2)) : null,
                // Song pitch value (or null if out of bounds)
                song: songIndex < songPitch.length ? Number(songPitch[songIndex].toFixed(2)) : null,
            });
        }

        // Downsample if there are too many points (for performance)
        if (data.length > 200) {
            const step = Math.ceil(data.length / 200);
            return data.filter((_, index) => index % step === 0);
        }

        return data;
    }, [humPitch, songPitch]);

    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;

        return (
            <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
                <p className="text-slate-400 text-xs mb-2">Time: {label}%</p>
                {payload.map((entry: any, index: number) => (
                    <p
                        key={index}
                        className="text-sm"
                        style={{ color: entry.color }}
                    >
                        {entry.name}: {entry.value !== null ? entry.value.toFixed(2) : 'N/A'}
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="chart-container w-full">
            {/* Chart Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-slate-200 font-medium">Pitch Comparison</h4>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-slate-400">Your Hum</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-slate-400">Matched Song</span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={200}>
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.1)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="time"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        label={{
                            value: 'Time %',
                            position: 'bottom',
                            fill: '#64748b',
                            fontSize: 11,
                            offset: -5
                        }}
                    />
                    <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        label={{
                            value: 'Pitch (normalized)',
                            angle: -90,
                            position: 'insideLeft',
                            fill: '#64748b',
                            fontSize: 11,
                            style: { textAnchor: 'middle' }
                        }}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Hum pitch line (user's input) */}
                    <Line
                        type="monotone"
                        dataKey="hum"
                        name="Your Hum"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#3b82f6' }}
                    />

                    {/* Song pitch line (matched segment) */}
                    <Line
                        type="monotone"
                        dataKey="song"
                        name="Matched Song"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#10b981' }}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Explanation */}
            <p className="text-slate-500 text-xs mt-3 text-center">
                The closer these lines match in shape, the stronger the melody similarity.
                Values are normalized (key-invariant).
            </p>
        </div>
    );
}

export default PitchChart;
