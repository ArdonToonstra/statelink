'use client'

import { Card } from "@/components/ui/card"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

interface StatsViewProps {
    checkins: any[]
}

export function StatsView({ checkins }: StatsViewProps) {
    if (checkins.length === 0) {
        return (
            <div className="text-center text-gray-400 py-10">
                No data available for trends.
            </div>
        )
    }

    // Basic stats calculation
    const totalCheckins = checkins.length
    const totalVibe = checkins.reduce((acc, curr) => acc + (curr.vibeScore || 0), 0)
    const averageVibe = (totalVibe / totalCheckins).toFixed(1)

    // Prepare data for chart
    // 1. Sort by date just in case
    // 2. Aggregate by day (mean score per day)
    const sortedCheckins = [...checkins].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    // Group check-ins by day and calculate mean
    type DailyDataEntry = { total: number; count: number; date: Date }
    const dailyData: Record<string, DailyDataEntry> = sortedCheckins.reduce((acc, c) => {
        const dateKey = new Date(c.createdAt).toISOString().split('T')[0] // YYYY-MM-DD
        if (!acc[dateKey]) {
            acc[dateKey] = { total: 0, count: 0, date: new Date(c.createdAt) }
        }
        acc[dateKey].total += c.vibeScore || 0
        acc[dateKey].count += 1
        return acc
    }, {} as Record<string, DailyDataEntry>)

    const chartData = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, data]: [string, DailyDataEntry]) => ({
            date: data.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            fullDate: dateKey,
            vibe: Math.round((data.total / data.count) * 10) / 10, // Mean score rounded to 1 decimal
            count: data.count
        }))

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm rounded-xl">
                    <div className="text-sm text-gray-500 mb-1">Total Check-ins</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCheckins}</div>
                </Card>
                <Card className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm rounded-xl">
                    <div className="text-sm text-gray-500 mb-1">Avg Vibe</div>
                    <div className="text-2xl font-bold text-primary">{averageVibe}</div>
                </Card>
            </div>

            <Card className="p-5 bg-white dark:bg-gray-800 border-none shadow-sm rounded-xl">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Vibe Trend</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                            />
                            <YAxis
                                domain={[0, 10]}
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                labelStyle={{ color: '#374151', fontSize: '12px', marginBottom: '4px' }}
                                itemStyle={{ color: '#2563EB', fontWeight: 600, fontSize: '14px' }}
                                cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '4 4' }}
                                formatter={(value: number, name: string, props: any) => [
                                    `${value} (${props.payload.count} check-in${props.payload.count > 1 ? 's' : ''})`,
                                    'Avg Vibe'
                                ]}
                            />
                            <Line
                                type="monotone"
                                dataKey="vibe"
                                stroke="#2563EB"
                                strokeWidth={3}
                                dot={{ fill: '#2563EB', r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    )
}
