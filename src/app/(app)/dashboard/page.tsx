'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getVibeColor } from '@/lib/utils'
import { Settings, Activity } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  // Mock average vibe for now - in production this would fetch the last 7 days average
  const averageVibe = 7

  return (
    <div className="min-h-screen p-4 pb-20 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        {/* Header with Settings Link */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🛸 Group Pulse</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your group's wellbeing
            </p>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="w-6 h-6" />
            </Button>
          </Link>
        </div>

        {/* Average Vibe Card */}
        <Card className="p-8 text-center space-y-4">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Average Group Vibe (Last 7 Days)
          </p>
          <div
            className="text-8xl font-mono font-bold"
            style={{ color: getVibeColor(averageVibe) }}
          >
            {averageVibe}
          </div>
        </Card>

        {/* Main Action */}
        <Button
          className="w-full h-16 text-xl"
          onClick={() => router.push('/check-in')}
        >
          Submit Vibe Check
        </Button>

        {/* Stats Link */}
        <div className="text-center">
          <Link
            href="/stats"
            className="text-blue-500 hover:underline flex items-center justify-center gap-2"
          >
            <Activity className="w-4 h-4" />
            View Group Stats & Activity
          </Link>
        </div>
      </div>
    </div>
  )
}
