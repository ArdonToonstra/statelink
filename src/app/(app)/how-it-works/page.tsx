'use client'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, BarChart3, Bell, Users, Shield, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full p-4 md:p-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            How GroupVibes Works
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Stay connected with your group&apos;s wellbeing through simple daily check-ins and insightful analytics.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Check-in Feature */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Daily Check-ins
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Share your current vibe with your group. Choose from 5 vibe levels—from wonderful to awful—and add optional tags to give context about your day.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Quick 30-second check-ins</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Customizable tags for context</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Optional private notes</span>
              </li>
            </ul>
          </Card>

          {/* Stats Feature */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Personal & Group Stats
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Track your wellbeing patterns over time and see how your group is doing. View trends, heatmaps, and insights to better understand collective mental health.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                <span>Personal mood trends</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                <span>Group activity feed</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                <span>Visual heatmaps and insights</span>
              </li>
            </ul>
          </Card>

          {/* Push Notifications */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="bg-purple-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Smart Reminders
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Group admins can configure custom push notifications to remind members to check in. Set your own schedule that works for your group&apos;s rhythm.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
                <span>Customizable reminder times</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
                <span>Admin-controlled settings</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
                <span>Helps build daily habits</span>
              </li>
            </ul>
          </Card>

          {/* Privacy */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="bg-green-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Private & Secure
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Your data stays within your trusted circle. We only store essential information and you maintain full control over your account and data.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Closed group sharing</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Delete account anytime</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Export your data</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* How to Get Started */}
        <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-2xl p-8 text-center">
          <Users className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Want to know the vibe?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            Create your account, join or create a group, and start checking in with the people who matter most.
          </p>
          <Link href="/onboarding">
            <Button size="lg" className="h-12 px-8 text-base rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105">
              Get Started Now
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-gray-400 dark:text-gray-600">
        <Link href="/" className="hover:text-primary transition-colors">
          © {new Date().getFullYear()} GroupVibes
        </Link>
      </footer>
    </div>
  )
}
