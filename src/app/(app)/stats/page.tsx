'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatTimestamp, isDataStale, getVibeColor } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

interface CheckIn {
    id: string
    vibeScore: number
    tags: { tag: string }[]
    createdAt: string
    user: {
        id: string
        displayName: string
        themeColor: string
    }
}

export default function StatsPage() {
    const router = useRouter()
    const [checkIns, setCheckIns] = useState<CheckIn[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // In production, this would fetch real data
        // For now, showing mock data (copied from dashboard)
        const mockData: CheckIn[] = [
            {
                id: '1',
                vibeScore: 8,
                tags: [{ tag: 'exercise' }, { tag: 'friends' }],
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                user: {
                    id: '1',
                    displayName: 'Alice',
                    themeColor: '#3B82F6',
                },
            },
            {
                id: '2',
                vibeScore: 6,
                tags: [{ tag: 'work' }, { tag: 'relax' }],
                createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                user: {
                    id: '2',
                    displayName: 'Bob',
                    themeColor: '#8B5CF6',
                },
            },
            {
                id: '3',
                vibeScore: 4,
                tags: [{ tag: 'cleaning' }],
                createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
                user: {
                    id: '3',
                    displayName: 'Charlie',
                    themeColor: '#EC4899',
                },
            },
        ]

        setCheckIns(mockData)
        setLoading(false)
    }, [])

    return (
        <div className="min-h-screen p-4 pb-20">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-4 pt-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">Group Activity</h1>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <Card>
                            <p className="text-center text-gray-500">Loading...</p>
                        </Card>
                    ) : checkIns.length === 0 ? (
                        <Card>
                            <div className="text-center space-y-4 py-8">
                                <p className="text-gray-600 dark:text-gray-400">
                                    No check-ins yet.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        checkIns.map((checkIn) => {
                            const stale = isDataStale(checkIn.createdAt)
                            return (
                                <Card
                                    key={checkIn.id}
                                    className={stale ? 'opacity-60' : ''}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar with colored ring */}
                                        <div
                                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                                            style={{
                                                backgroundColor: checkIn.user.themeColor + '20',
                                                border: `3px solid ${checkIn.user.themeColor}`,
                                            }}
                                        >
                                            {checkIn.user.displayName[0].toUpperCase()}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p
                                                    className="font-semibold"
                                                    style={{ color: checkIn.user.themeColor }}
                                                >
                                                    {checkIn.user.displayName}
                                                </p>
                                                <span className="text-sm text-gray-500">
                                                    {formatTimestamp(checkIn.createdAt)}
                                                </span>
                                            </div>
                                            {checkIn.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {checkIn.tags.map((t, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs px-2 py-1 rounded-full"
                                                            style={{
                                                                backgroundColor: checkIn.user.themeColor + '20',
                                                                color: checkIn.user.themeColor,
                                                            }}
                                                        >
                                                            {t.tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Vibe Score */}
                                        <div
                                            className="text-4xl font-mono font-bold"
                                            style={{ color: getVibeColor(checkIn.vibeScore) }}
                                        >
                                            {checkIn.vibeScore}
                                        </div>
                                    </div>
                                </Card>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
