'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Laugh,
  Smile,
  Meh,
  Frown,
  Angry,
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
  Check,
  TreePine,
  Briefcase,
  GraduationCap,
  ChefHat,
  Music,
  Palette,
  Plane,
  PartyPopper,
  X
} from 'lucide-react'
import { format } from 'date-fns'

const VIBE_OPTIONS = [
  { value: 10, label: 'rad', color: '#10B981', icon: Laugh },
  { value: 8, label: 'good', color: '#84CC16', icon: Smile },
  { value: 6, label: 'meh', color: '#3B82F6', icon: Meh },
  { value: 4, label: 'bad', color: '#F59E0B', icon: Frown },
  { value: 2, label: 'awful', color: '#EF4444', icon: Angry },
]

const ALL_ACTIVITIES = [
  { id: 'family', label: 'family', icon: Users },
  { id: 'friends', label: 'friends', icon: Users },
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
  { id: 'nature', label: 'nature', icon: TreePine },
  { id: 'work', label: 'work', icon: Briefcase },
  { id: 'study', label: 'study', icon: GraduationCap },
  { id: 'cooking', label: 'cooking', icon: ChefHat },
  { id: 'music', label: 'music', icon: Music },
  { id: 'art', label: 'art', icon: Palette },
  { id: 'travel', label: 'travel', icon: Plane },
  { id: 'party', label: 'party', icon: PartyPopper },
]

const DEFAULT_ACTIVITY_IDS = [
  'family', 'friends', 'date', 'exercise', 'sport',
  'relax', 'movies', 'gaming', 'reading', 'cleaning',
  'sleep', 'eat', 'shopping'
]

export default function CheckInPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [vibe, setVibe] = useState<number | null>(null)
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [myActivityIds, setMyActivityIds] = useState<string[]>(DEFAULT_ACTIVITY_IDS)
  const [isEditing, setIsEditing] = useState(false)
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

  const toggleMyActivity = (id: string) => {
    setMyActivityIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!vibe) return
    setSaving(true)

    try {
      // Collect data
      const selectedActivitiesList = ALL_ACTIVITIES.filter(a => selectedActivities.includes(a.id))
      const tags = selectedActivitiesList.map(a => a.label) // Send labels as tags

      const userId = localStorage.getItem('statelink_user_id')
      if (!userId) {
        throw new Error("User session not found")
      }

      const res = await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          // VIBE_OPTIONS values are already 2, 4, 6, 8, 10.
          // So `vibe` state already holds the 1-10 scale value.
          vibeScore: vibe,
          tags,
          customNote: note
        })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")

      router.push('/dashboard')
    } catch (e) {
      console.error(e)
      alert("Failed to save check-in")
      setSaving(false)
    }
  }

  // Activities to display in main grid
  const visibleActivities = ALL_ACTIVITIES.filter(a => myActivityIds.includes(a.id))

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col relative overflow-hidden">

      {/* Editing Overlay */}
      {isEditing && (
        <div className="absolute inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="text-xl font-bold">Customize Activities</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
              <X className="w-6 h-6" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-gray-500 mb-6 text-center">
              Tap to add or remove activities from your check-in list.
            </p>
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              {ALL_ACTIVITIES.map((activity) => {
                const isActive = myActivityIds.includes(activity.id)
                return (
                  <button
                    key={activity.id}
                    onClick={() => toggleMyActivity(activity.id)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive
                        ? 'bg-blue-100 border-2 border-blue-500 text-blue-600'
                        : 'bg-gray-50 border border-gray-200 text-gray-400 grayscale'
                        }`}
                    >
                      <activity.icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                      {activity.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="p-4 border-t bg-white dark:bg-gray-900">
            <Button onClick={() => setIsEditing(false)} className="w-full h-12 text-lg">
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <button
          onClick={() => step === 2 ? setStep(1) : router.push('/dashboard')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-500" />
        </button>

        {step === 2 && vibe && (
          <div
            className="text-3xl"
            style={{ color: VIBE_OPTIONS.find(o => o.value === vibe)?.color }}
          >
            {/* Icon placeholder if needed */}
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
          <div className="w-10" />
        )}
      </div>

      <div className="flex-1 flex flex-col items-center p-6 max-w-md mx-auto w-full overflow-y-auto pb-24">

        {step === 1 && (
          <div className="w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-20">
            <div className="space-y-4">
              <h1 className="text-3xl font-medium text-gray-700 dark:text-gray-200">
                HOW ARE YOU?
              </h1>
              <p className="text-green-500 font-medium">
                {format(new Date(), "MMM d, h:mm a")}
              </p>
            </div>

            <div className="flex justify-between items-end gap-2">
              {VIBE_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => handleVibeSelect(option.value)}
                    className="flex flex-col items-center gap-2 group transition-transform hover:scale-110 active:scale-95 duration-200"
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
                    className="w-16 h-16"
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
              {visibleActivities.map((activity) => {
                const isSelected = selectedActivities.includes(activity.id)
                return (
                  <button
                    key={activity.id}
                    onClick={() => toggleActivity(activity.id)}
                    className="flex flex-col items-center gap-2 group transition-all duration-200 active:scale-95"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected
                        ? 'bg-green-500 text-white shadow-lg scale-105'
                        : 'bg-transparent border border-gray-300 text-green-600 hover:border-green-400'
                        }`}
                    >
                      <activity.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium group-hover:text-gray-700">
                      {activity.label}
                    </span>
                  </button>
                )
              })}

              {/* Add New Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center hover:bg-gray-50 transition-colors">
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
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-6 px-4 text-center placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-green-500"
              />
            </div>

            {/* Disclaimer or space */}
            <div className="h-20"></div>
          </div>
        )}
      </div>

      {/* Bottom Save Button - Sticky */}
      {step === 2 && (
        <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky bottom-0 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom duration-300">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 text-lg bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg shadow-green-500/20"
          >
            {saving ? 'Saving...' : 'Save Vibe Check'}
          </Button>
        </div>
      )}
    </div>
  )
}
