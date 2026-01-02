'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Zap, Settings, Activity } from "lucide-react"
import Link from 'next/link'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    groupPulse: string | null,
    memberCount: number,
    userLastVibe: any, // Checkin object
    groupName: string
  } | null>(null)

  useEffect(() => {
    const userId = localStorage.getItem('statelink_user_id')
    if (!userId) {
      router.push('/onboarding')
      return
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/dashboard?userId=${userId}`)
        
        if (res.status === 404) {
          localStorage.removeItem('statelink_user_id')
          router.push('/onboarding')
          return
        }

        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        // Check if user has no group (should handle in UI)
        setData(json)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Zap className="w-8 h-8 text-gray-300 mb-4" />
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!data) return null; // Or error state

  const pulseValue = data.groupPulse ? parseFloat(data.groupPulse) : 0
  const hasVibe = !!data.groupPulse
  const isSolo = data.memberCount <= 1

  // Color logic for pulse
  const getPulseColor = (val: number) => {
    if (val >= 8) return "text-emerald-500"
    if (val >= 5) return "text-blue-500"
    return "text-orange-500"
  }

  // Empty State Logic
  const showInviteCallout = isSolo && !hasVibe && !data.userLastVibe
  const emptyVibeText = "Waiting for input..."

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-gray-50 to-gray-50 dark:from-blue-900/20 dark:via-gray-900 dark:to-gray-900 font-sans pb-20">

      {/* Header */}
      <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              {data.groupName}
            </h1>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Settings className="w-5 h-5 text-gray-500" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">

        {/* Vibe Card */}
        <Card className="border-none shadow-xl shadow-blue-500/5 bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden relative min-h-[300px] flex flex-col items-center justify-center p-8">
          {/* Background decorative blobs */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent animate-slow-spin" />
          </div>

          <div className="relative z-10 text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50 text-xs font-medium text-gray-500 mb-4">
              <Users className="w-3 h-3" />
              {data.memberCount} Members Active
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Group Pulse</h2>

            <div className="relative">
              {/* Pulse Rings */}
              {hasVibe && (
                <>
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${getPulseColor(pulseValue).replace('text-', 'bg-')}`}></div>
                  <div className="absolute inset-0 rounded-full animate-pulse opacity-10 bg-primary blur-3xl"></div>
                </>
              )}

              <div className={`text-8xl font-black tracking-tighter ${hasVibe ? getPulseColor(pulseValue) : 'text-gray-300'}`}>
                {hasVibe ? pulseValue : '--'}
              </div>
            </div>

            <p className="text-gray-500 font-medium">
              {hasVibe
                ? (pulseValue > 7 ? "Vibes are immaculate" : pulseValue > 4 ? "Keepin' it steady" : "Needs some love")
                : emptyVibeText}
            </p>
          </div>

          {/* Bounce removed */}
        </Card>

        {/* Empty State Call to Action */}
        {/* Empty State Call to Action */}
        {showInviteCallout && (
          <div className="my-2">
            <Link href="/settings?tab=group">
              <Button variant="outline" className="w-full h-20 rounded-2xl border-dashed border-2 border-primary/20 hover:border-primary hover:bg-primary/5 text-primary gap-3 text-lg font-semibold bg-white dark:bg-gray-800">
                <Users className="w-6 h-6" />
                Invite People to Start
              </Button>
            </Link>
          </div>
        )}

        {/* Core Action */}
        <Link href="/check-in" className="block transform transition-transform active:scale-95">
          <Button className="w-full h-20 text-xl rounded-3xl font-bold shadow-2xl shadow-primary/30 bg-gradient-to-br from-primary to-violet-600 hover:from-primary/90 hover:to-violet-700 border-t border-white/20">
            <Zap className="mr-3 w-8 h-8 fill-white" />
            Check In Now
          </Button>
        </Link>

        {/* Secondary Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/stats">
            <Button variant="outline" className="w-full h-24 rounded-2xl flex flex-col gap-2 border-0 bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-700 dark:text-gray-200">Group Stats</span>
            </Button>
          </Link>

          <Link href="/stats/me">
            <Button variant="outline" className="w-full h-24 rounded-2xl flex flex-col gap-2 border-0 bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                <UserIcon className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-700 dark:text-gray-200">My Stats</span>
            </Button>
          </Link>
        </div>

        {/* Latest Update (if User has data) */}
        {data.userLastVibe && (
          <div className="text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-2">Your Last Check-in</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
              <span className="font-bold text-gray-900 dark:text-white">{new Date(data.userLastVibe.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span className="text-primary font-bold">Vibe: {data.userLastVibe.vibeScore}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
