'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Download, Trash2, User, Users, Copy, Check, LogOut, Loader2 } from 'lucide-react'

// Mock Data
const MOCK_USER = {
    id: '1',
    displayName: 'Alice',
    email: 'alice@example.com',
    isGroupOwner: true
}

const MOCK_GROUP = {
    id: 'grp_1',
    name: 'The Avengers',
    inviteCode: 'XE92-K821',
    members: [
        { id: '1', name: 'Alice', role: 'owner' },
        { id: '2', name: 'Bob', role: 'member' },
        { id: '3', name: 'Charlie', role: 'member' },
    ]
}

export default function SettingsPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'profile' | 'group'>('profile')

    // User State
    const [displayName, setDisplayName] = useState(MOCK_USER.displayName)
    const [email] = useState(MOCK_USER.email)

    // Group State
    const [groupName, setGroupName] = useState(MOCK_GROUP.name)
    const [members, setMembers] = useState(MOCK_GROUP.members)
    const [copied, setCopied] = useState(false)

    // UI Save State
    const [saveStatus, setSaveStatus] = useState<{ field: string, status: 'saving' | 'saved' | 'idle' }>({ field: '', status: 'idle' })

    const handleCopyCode = () => {
        navigator.clipboard.writeText(MOCK_GROUP.inviteCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleRemoveMember = (memberId: string) => {
        if (confirm('Are you sure you want to remove this member?')) {
            setMembers(members.filter(m => m.id !== memberId))
        }
    }

    // Auto-Save Handler
    const handleAutoSave = (field: string, value: string) => {
        // Prevent saving unchanged value logic could go here, but for now we just show movement
        setSaveStatus({ field, status: 'saving' })

        // Simulate API call
        setTimeout(() => {
            setSaveStatus({ field, status: 'saved' })
            // Clear 'saved' message after 2 seconds
            setTimeout(() => {
                setSaveStatus(prev => prev.field === field ? { ...prev, status: 'idle' } : prev)
            }, 2000)
        }, 800)
    }

    const handleDownloadData = () => {
        const data = JSON.stringify({ user: MOCK_USER, history: [] }, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'statelink-data.json'
        a.click()
    }

    const handleLogout = () => {
        router.push('/onboarding')
    }

    const handleDeleteAccount = () => {
        if (confirm('DANGER: This will permanently delete your account and all data. This cannot be undone. Continue?')) {
            alert('Account deleted.')
            router.push('/onboarding')
        }
    }

    // Helper to render Status Indicator
    const StatusIndicator = ({ fieldName }: { fieldName: string }) => {
        if (saveStatus.field !== fieldName || saveStatus.status === 'idle') return null

        if (saveStatus.status === 'saving') {
            return (
                <span className="text-xs text-gray-400 flex items-center gap-1 animate-in fade-in">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                </span>
            )
        }
        if (saveStatus.status === 'saved') {
            return (
                <span className="text-xs text-green-600 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3 h-3" /> Saved
                </span>
            )
        }
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-6">

                {/* Tabs */}
                <div className="flex p-1 bg-gray-200/50 dark:bg-gray-800 rounded-xl">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'profile'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        My Profile
                    </button>
                    {MOCK_USER.isGroupOwner && (
                        <button
                            onClick={() => setActiveTab('group')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'group'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Group Admin
                        </button>
                    )}
                </div>

                {/* Profile Content */}
                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Personal Info</h2>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Display Name
                                    </label>
                                    <StatusIndicator fieldName="displayName" />
                                </div>
                                <Input
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    onBlur={() => handleAutoSave('displayName', displayName)}
                                    className="h-12 bg-gray-50 dark:bg-gray-900 border-transparent focus:bg-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                    Email Address
                                </label>
                                <Input
                                    value={email}
                                    disabled
                                    className="h-12 bg-gray-50 dark:bg-gray-900 border-transparent opacity-60"
                                />
                                <p className="text-xs text-gray-400 mt-1">Contact support to change email.</p>
                            </div>
                        </Card>

                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <h2 className="font-semibold text-gray-900 dark:text-white">Account Actions</h2>

                            <Button variant="outline" onClick={handleLogout} className="w-full h-12 rounded-xl justify-start px-4 gap-3 bg-gray-50 border-0 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-700">
                                <LogOut className="w-5 h-5 text-gray-500" />
                                <div className="text-left">
                                    <div className="font-semibold">Log Out</div>
                                </div>
                            </Button>

                            <Button variant="outline" onClick={handleDownloadData} className="w-full h-12 rounded-xl justify-start px-4 gap-3 bg-gray-50 border-0 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-700">
                                <Download className="w-5 h-5 text-gray-500" />
                                <div className="text-left">
                                    <div className="font-semibold text-gray-700 dark:text-gray-200">Download my data</div>
                                    <div className="text-xs text-gray-400 font-normal">Get a copy of everything you've shared</div>
                                </div>
                            </Button>

                            <Button variant="ghost" onClick={handleDeleteAccount} className="w-full h-12 rounded-xl justify-start px-4 gap-3 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-red-500">
                                <Trash2 className="w-5 h-5" />
                                <div className="text-left">
                                    <div className="font-semibold">Delete Account</div>
                                    <div className="text-xs opacity-70 font-normal">Permanently remove your account</div>
                                </div>
                            </Button>
                        </Card>
                    </div>
                )}

                {/* Group Content */}
                {activeTab === 'group' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <h2 className="font-semibold text-gray-900 dark:text-white">Group Details</h2>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Group Name
                                    </label>
                                    <StatusIndicator fieldName="groupName" />
                                </div>
                                <Input
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    onBlur={() => handleAutoSave('groupName', groupName)}
                                    className="h-12 bg-gray-50 dark:bg-gray-900 border-transparent focus:bg-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                    Invite Code
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 h-12 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center px-4 font-mono font-bold tracking-widest text-gray-700 dark:text-gray-300">
                                        {MOCK_GROUP.inviteCode}
                                    </div>
                                    <Button onClick={handleCopyCode} variant={copied ? "default" : "outline"} className="h-12 w-12 rounded-lg p-0 flex items-center justify-center">
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-semibold text-gray-900 dark:text-white">Members ({members.length})</h2>
                            </div>

                            <div className="space-y-1">
                                {members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center text-sm font-bold text-primary">
                                                {member.name[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                                                <div className="text-xs text-gray-500 capitalize">{member.role}</div>
                                            </div>
                                        </div>

                                        {member.role !== 'owner' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

            </div>
        </div>
    )
}
