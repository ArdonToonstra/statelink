'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getVibeColor } from '@/lib/utils'
import { Settings, Activity, ArrowRight, Zap, User } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  // Mock average vibe for now - in production this would fetch the last 7 days average
  const averageVibe = 7
  const vibeColor = getVibeColor(averageVibe)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 pb-28 flex flex-col relative overflow-hidden">

      {/* Background decoration - Lighter and Happier */}
      <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-blue-400/20 rounded-full blur-3xl pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-pink-400/20 rounded-full blur-3xl pointer-events-none mix-blend-multiply" />

      {/* Header */}
      <div className="flex justify-between items-center mb-8 relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-500 to-purple-500 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">StateLink</span>
        </div>
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <Settings className="w-6 h-6 text-gray-500" />
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center space-y-6 max-w-md mx-auto w-full relative z-10">

        {/* Vibe Card */}
        <div className="relative group cursor-default">
          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-blue-400 to-purple-500 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"
          />

          <Card className="relative overflow-hidden border-none shadow-xl shadow-gray-200/50 dark:shadow-none rounded-[2.5rem] bg-white dark:bg-gray-900 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

            <h2 className="text-gray-400 font-bold tracking-widest uppercase text-xs mb-6">
              Group Pulse · Last 7 Days
            </h2>

            <div className="relative mb-6">
              {/* Pulse Rings */}
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-10"
                style={{ backgroundColor: vibeColor }}
              />
              <div
                className="relative w-32 h-32 rounded-full flex items-center justify-center text-7xl font-bold tracking-tighter shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${vibeColor}15, ${vibeColor}05)`,
                  color: vibeColor,
                }}
              >
                {averageVibe}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Feeling Good!
              </p>
              <p className="text-sm text-gray-500 px-8">
                The group vibe is trending up this week.
              </p>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            className="w-full h-16 text-lg rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200/50 dark:shadow-none font-semibold"
            onClick={() => router.push('/check-in')}
          >
            Vibe Check
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/stats" className="block">
              <Button
                variant="ghost"
                className="w-full h-14 text-sm rounded-2xl bg-white/60 hover:bg-white border-0 shadow-sm text-gray-600 font-medium"
              >
                <Activity className="mr-2 w-4 h-4" />
                Group Stats
              </Button>
            </Link>
            <Link href="/stats/me" className="block">
              <Button
                variant="ghost"
                className="w-full h-14 text-sm rounded-2xl bg-white/60 hover:bg-white border-0 shadow-sm text-gray-600 font-medium"
              >
                <User className="mr-2 w-4 h-4" />
                My Stats
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
