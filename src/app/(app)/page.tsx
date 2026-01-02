'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect logic
    router.push('/onboarding')
  }, [router])

  return (
    <div suppressHydrationWarning className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-2xl animate-pulse">
          <Zap className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            StateLink
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 animate-in fade-in">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Initializing...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
