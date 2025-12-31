'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

const THEME_COLORS = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F59E0B', // Orange
    '#10B981', // Green
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
]

export default function SettingsPage() {
    const router = useRouter()
    // In a real app, we would fetch the user's current color from the API
    const [themeColor, setThemeColor] = useState(THEME_COLORS[0])
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        // Here we would call an API to update the user's theme color
        // await fetch('/api/users/update', ... )

        // Simulate delay
        setTimeout(() => {
            setSaving(false)
            alert('Settings saved!')
        }, 500)
    }

    return (
        <div className="min-h-screen p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
                <div className="flex items-center gap-4 pt-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">Settings</h1>
                </div>

                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Appearance</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-3">
                                Theme Color
                            </label>
                            <div className="grid grid-cols-4 gap-3">
                                {THEME_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setThemeColor(color)}
                                        className={`w-full aspect-square rounded-xl transition-transform ${themeColor === color ? 'scale-110 ring-4 ring-offset-2 ring-blue-500' : ''
                                            }`}
                                        style={{
                                            backgroundColor: color,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                <Button onClick={handleSave} className="w-full" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    )
}
