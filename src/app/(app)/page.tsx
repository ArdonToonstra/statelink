'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Zap, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export default function Home() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check if user is already logged in and redirect to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession()
        if (session?.data?.user) {
          router.replace('/dashboard')
          return
        }
      } catch (e) {
        // Not logged in, show homepage
      }
      setIsCheckingAuth(false)
    }
    checkAuth()
  }, [router])

  // Show nothing while checking auth to avoid flash
  if (isCheckingAuth) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-gray-50 to-gray-50 dark:from-blue-900/20 dark:via-gray-900 dark:to-gray-900">

      {/* Navbar / Header */}
      <header className="w-full p-4 md:p-6 relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/icons/logo-groupvibes.PNG" 
              alt="GroupVibes Logo" 
              width={50} 
              height={50}
              className="rounded-lg"
            />
            <span className="hidden md:inline font-bold text-xl text-gray-900 dark:text-white tracking-tight">GroupVibes</span>
          </Link>
          <nav className="flex items-center gap-1 md:gap-2">
            <Link href="/how-it-works" className="font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors px-2 md:px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-sm md:text-base">
              How it Works
            </Link>
            <div className="hidden sm:block text-gray-300 dark:text-gray-600">|</div>
            <Link href="/install" className="font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors px-2 md:px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-sm md:text-base">
              Install
            </Link>
            <div className="hidden sm:block text-gray-300 dark:text-gray-600">|</div>
            <Link href="/onboarding?view=login" className="font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors px-2 md:px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-sm md:text-base">
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center max-w-4xl mx-auto mt-0 md:mt-[-4rem]">


        {/* Hero Text */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-gray-400 mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-5 duration-700 fill-mode-backwards delay-100">
          Know the group's vibe.
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-backwards delay-200">
          Real-time wellbeing insights for your inner circle. Simple, private, and built to help you show up for each other when it counts.
        </p>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-7 duration-700 fill-mode-backwards delay-300">
          <Link href="/onboarding">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95">
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>

      </main>

      {/* Basic Footer */}
      <footer className="p-6 text-center text-xs text-gray-400 dark:text-gray-600">
        <div className="mb-2">
          <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors">Terms</Link>
          <span className="mx-2">·</span>
          <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors">Privacy</Link>
        </div>
        <div>© {new Date().getFullYear()} GroupVibes</div>
      </footer>
    </div>
  )
}
