'use client'
import Link from 'next/link'
import { Zap, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-gray-50 to-gray-50 dark:from-blue-900/20 dark:via-gray-900 dark:to-gray-900">

      {/* Navbar / Header */}
      <header className="w-full p-4 md:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">StateLink</span>
        </div>
        <Link href="/onboarding?view=login">
          <Button variant="ghost" className="font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors">
            Log in
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center max-w-4xl mx-auto mt-[-4rem]">


        {/* Hero Text */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-gray-400 mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-5 duration-700 fill-mode-backwards delay-100">
          Sync your squad&apos;s <br className="hidden md:block" /> dynamic state.
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-backwards delay-200">
          StateLink helps you track your group&apos;s wellbeing in real-time.
          Only an email and a display name is required. No unnecessary tracking, ever.
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
      <footer className="p-6 text-center text-sm text-gray-400 dark:text-gray-600">
        © {new Date().getFullYear()} StateLink. All rights reserved.
      </footer>
    </div>
  )
}
