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

export default function PersonalStatsPage() {
    const router = useRouter()
    const [checkIns, setCheckIns] = useState<CheckIn[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Mock data - same as group stats but we'll filter for "Alice"
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
                id: '4',
                vibeScore: 7,
                tags: [{ tag: 'reading' }],
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                user: {
                    id: '1',
                    displayName: 'Alice',
                    themeColor: '#3B82F6',
                },
            },
            {
                id: '5',
                vibeScore: 5,
                tags: [{ tag: 'work' }, { tag: 'cleaning' }],
                createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
                user: {
                    id: '1',
                    displayName: 'Alice',
                    themeColor: '#3B82F6',
                },
            },
        ]

        setCheckIns(mockData)
        setLoading(false)
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col p-4 pb-20">
            <div className="max-w-3xl mx-auto w-full space-y-6">
                <div className="flex items-center gap-4 pt-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-gray-200">
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">My Activity</h1>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <Card>
                            <p className="text-center text-gray-500 py-8">Loading...</p>
                        </Card>
                    ) : checkIns.length === 0 ? (
                        <Card>
                            <div className="text-center space-y-4 py-8">
                                <p className="text-gray-600">
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
                                    className={`bg-white border-0 shadow-sm rounded-2xl p-4 ${stale ? 'opacity-60' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm text-gray-400 font-medium">
                                                    {formatTimestamp(checkIn.createdAt)}
                                                </span>
                                            </div>
                                            {checkIn.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {checkIn.tags.map((t, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs px-3 py-1.5 rounded-full font-medium"
                                                            style={{
                                                                backgroundColor: checkIn.user.themeColor + '10',
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
                                            className="text-4xl font-black tracking-tight"
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
