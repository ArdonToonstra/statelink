'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from "react"

export default function GroupStatsPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'feed' | 'insights'>('feed')
    const [checkins, setCheckins] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const userId = localStorage.getItem('statelink_user_id')
        if (!userId) {
            router.push('/onboarding')
            return
        }

        const fetchFeed = async () => {
            try {
                // Scope=group automatically finds group by userId
                const res = await fetch(`/api/check-ins?userId=${userId}&scope=group`)
                if (res.ok) {
                    const data = await res.json()
                    setCheckins(data.docs || []) // Payload returns { docs: [...] } usually for find
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchFeed()
    }, [router])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Button>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Group Activity</h1>
                    </div>

                    {/* Simple Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('feed')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'feed' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                        >
                            Feed
                        </button>
                        <button
                            onClick={() => setActiveTab('insights')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'insights' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                        >
                            Trends
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-6">
                {loading ? (
                    <div className="text-center text-gray-400 py-10">Loading activity...</div>
                ) : checkins.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">No activity yet. Be the first to check in!</div>
                ) : (
                    <div className="space-y-4">
                        {checkins.map((checkin) => (
                            <Card key={checkin.id} className="p-5 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center font-bold text-primary">
                                            {(checkin.user?.displayName || 'U')[0]}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-white">{checkin.user?.displayName || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">{new Date(checkin.createdAt).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full">
                                        <span className="text-sm font-bold text-primary">Vibe: {checkin.vibeScore}</span>
                                    </div>
                                </div>

                                {checkin.customNote && (
                                    <p className="text-gray-600 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl text-sm italic">
                                        &quot;{checkin.customNote}&quot;
                                    </p>
                                )}

                                {checkin.tags && checkin.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {checkin.tags.map((tagObj: any, idx: number) => (
                                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                                                {tagObj.tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
