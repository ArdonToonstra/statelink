'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Smile,
  Meh,
  Frown,
  Users,
  Heart,
  Dumbbell,
  Trophy,
  Coffee,
  Monitor,
  Gamepad2,
  BookOpen,
  Sparkles,
  Moon,
  Apple,
  ShoppingBag,
  Plus,
  ArrowLeft,
  Check
} from 'lucide-react'
import { format } from 'date-fns'

const VIBE_OPTIONS = [
  { value: 10, label: 'rad', color: '#10B981', icon: Smile }, // Green
  { value: 8, label: 'good', color: '#84CC16', icon: Smile }, // Lime
  { value: 6, label: 'meh', color: '#3B82F6', icon: Meh }, // Blue
  { value: 4, label: 'bad', color: '#F59E0B', icon: Frown }, // Orange (Orange for bad)
  { value: 2, label: 'awful', color: '#EF4444', icon: Frown }, // Red
]

const ACTIVITIES = [
  { id: 'family', label: 'family', icon: Users },
  { id: 'friends', label: 'friends', icon: Users }, // Reuse users or find better
  { id: 'date', label: 'date', icon: Heart },
  { id: 'exercise', label: 'exercise', icon: Dumbbell },
  { id: 'sport', label: 'sport', icon: Trophy },
  { id: 'relax', label: 'relax', icon: Coffee },
  { id: 'movies', label: 'movies', icon: Monitor },
  { id: 'gaming', label: 'gaming', icon: Gamepad2 },
  { id: 'reading', label: 'reading', icon: BookOpen },
  { id: 'cleaning', label: 'cleaning', icon: Sparkles },
  { id: 'sleep', label: 'sleep early', icon: Moon },
  { id: 'eat', label: 'eat healthy', icon: Apple },
  { id: 'shopping', label: 'shopping', icon: ShoppingBag },
]

export default function CheckInPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [vibe, setVibe] = useState<number | null>(null)
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleVibeSelect = (value: number) => {
    setVibe(value)
    setStep(2)
  }

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!vibe) return
    setSaving(true)

    try {
      // In production: await fetch('/api/checkins/create', ...)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800))
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to save vibe check', error)
      setSaving(false)
    }
  }

  // Get current date formatted like "Today, Dec 17, 11:21 AM"
  const currentDate = format(new Date(), "eeee, MMM d, h:mm a").replace('Today', 'Today')
  // date-fns doesn't say "Today" automatically, let's just use the format. 
  // Or "Today, " + format(...) if we want that effect. 
  // Let's stick to a clean format.

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        {step === 2 ? (
          <button
            onClick={() => setStep(1)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-500" />
          </button>
        ) : (
          <div className="w-10" /> // Spacer
        )}

        {step === 2 && vibe && (
          <div
            className="text-3xl"
            style={{ color: VIBE_OPTIONS.find(o => o.value === vibe)?.color }}
          >
            {/* Show selected vibe icon centered/top or just keep clean */}
          </div>
        )}

        {step === 2 ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <Check className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10" /> // Spacer
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">

        {step === 1 && (
          <div className="w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <h1 className="text-3xl font-medium text-gray-700 dark:text-gray-200">
                HOW ARE YOU?
              </h1>
              <p className="text-green-500 font-medium">
                Today, {format(new Date(), "MMM d, h:mm a")}
              </p>
            </div>

            <div className="flex justify-between items-end gap-2">
              {VIBE_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => handleVibeSelect(option.value)}
                    className="flex flex-col items-center gap-2 group transition-transform hover:scale-110"
                  >
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: option.color,
                        color: option.color
                      }}
                    >
                      <Icon className="w-8 h-8 sm:w-9 sm:h-9" />
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: option.color }}
                    >
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="w-full text-center space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Selected Vibe Indicator */}
            <div className="flex justify-center mb-4">
              {(() => {
                const option = VIBE_OPTIONS.find(o => o.value === vibe)
                if (!option) return null
                const Icon = option.icon
                return (
                  <Icon
                    className="w-12 h-12"
                    style={{ color: option.color }}
                  />
                )
              })()}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-medium text-gray-700 dark:text-gray-200 uppercase">
                What have you<br />been up to?
              </h1>
            </div>

            <div className="grid grid-cols-5 gap-y-6 gap-x-2">
              {ACTIVITIES.map((activity) => {
                const isSelected = selectedActivities.includes(activity.id)
                return (
                  <button
                    key={activity.id}
                    onClick={() => toggleActivity(activity.id)}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSelected
                          ? 'bg-green-500 text-white shadow-lg scale-105'
                          : 'bg-transparent border border-gray-300 text-green-600 hover:border-green-400'
                        }`}
                    >
                      <activity.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {activity.label}
                    </span>
                  </button>
                )
              })}

              {/* Add New Button */}
              <button
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-gray-500 font-medium">
                  edit/new
                </span>
              </button>
            </div>

            <div className="pt-4">
              <Input
                placeholder="Add Note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-6 px-4 text-center placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
