'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
    Calendar,
    X,
    Clock,
    Download,
    ExternalLink,
    Check
} from 'lucide-react'
import {
    CalendarFrequency,
    CalendarOptions,
    downloadIcsFile,
    generateGoogleCalendarUrl,
    getScheduleDescription
} from '@/lib/calendar-utils'

interface CalendarModalProps {
    isOpen: boolean
    onClose: () => void
    checkInUrl: string
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
]

const FREQUENCY_OPTIONS: { value: CalendarFrequency; label: string; description: string }[] = [
    { value: 'daily', label: 'Daily', description: 'Every day' },
    { value: 'every-other-day', label: 'Every Other Day', description: 'Every 2 days' },
    { value: 'weekly', label: 'Weekly', description: 'Select specific days' },
]

export function CalendarModal({ isOpen, onClose, checkInUrl }: CalendarModalProps) {
    const [time, setTime] = useState('09:00')
    const [frequency, setFrequency] = useState<CalendarFrequency>('daily')
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]) // Mon, Wed, Fri default
    const [showSuccess, setShowSuccess] = useState<'google' | 'ics' | null>(null)

    if (!isOpen) return null

    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day].sort()
        )
    }

    const getCalendarOptions = (): CalendarOptions => ({
        time,
        frequency,
        days: frequency === 'weekly' ? selectedDays : undefined,
        checkInUrl,
    })

    const handleGoogleCalendar = () => {
        const url = generateGoogleCalendarUrl(getCalendarOptions())
        window.open(url, '_blank')
        setShowSuccess('google')
        setTimeout(() => setShowSuccess(null), 3000)
    }

    const handleDownloadIcs = () => {
        downloadIcsFile(getCalendarOptions())
        setShowSuccess('ics')
        setTimeout(() => setShowSuccess(null), 3000)
    }

    const scheduleDescription = getScheduleDescription({ time, frequency, days: selectedDays })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <Card className="relative z-10 w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">Calendar Reminder</h2>
                            <p className="text-sm text-gray-500">Add vibe check-in to your calendar</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Time Picker */}
                <div className="mb-6">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Reminder Time
                    </label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full h-12 pl-11 pr-4 bg-gray-50 dark:bg-gray-900 rounded-xl border-0 text-base font-medium focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* Frequency Selector */}
                <div className="mb-6">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Frequency
                    </label>
                    <div className="space-y-2">
                        {FREQUENCY_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setFrequency(option.value)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${frequency === option.value
                                        ? 'bg-primary/10 border-2 border-primary'
                                        : 'bg-gray-50 dark:bg-gray-900 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <div className="text-left">
                                    <div className={`font-medium ${frequency === option.value ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}>
                                        {option.label}
                                    </div>
                                    <div className="text-xs text-gray-500">{option.description}</div>
                                </div>
                                {frequency === option.value && (
                                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Day Selector (only shown for weekly) */}
                {frequency === 'weekly' && (
                    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            Select Days
                        </label>
                        <div className="flex gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                                <button
                                    key={day.value}
                                    onClick={() => toggleDay(day.value)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${selectedDays.includes(day.value)
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                        {selectedDays.length === 0 && (
                            <p className="text-xs text-amber-600 mt-2">Please select at least one day</p>
                        )}
                    </div>
                )}

                {/* Preview */}
                <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                        Preview
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        📅 {scheduleDescription}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        "Vibe Check-in Reminder" with link to check-in page
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <Button
                        onClick={handleGoogleCalendar}
                        disabled={frequency === 'weekly' && selectedDays.length === 0}
                        className="w-full h-12 rounded-xl gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                    >
                        {showSuccess === 'google' ? (
                            <>
                                <Check className="w-5 h-5" />
                                Opened in Google Calendar
                            </>
                        ) : (
                            <>
                                <ExternalLink className="w-5 h-5" />
                                Add to Google Calendar
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleDownloadIcs}
                        disabled={frequency === 'weekly' && selectedDays.length === 0}
                        className="w-full h-12 rounded-xl gap-2"
                    >
                        {showSuccess === 'ics' ? (
                            <>
                                <Check className="w-5 h-5" />
                                Downloaded!
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                Download .ics File
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-center text-gray-500">
                        .ics works with Outlook, Apple Calendar, and other apps
                    </p>
                </div>
            </Card>
        </div>
    )
}
