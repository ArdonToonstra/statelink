'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PageHeader } from '@/components/ui/page-header'
import { Download, Trash2, User, Users, Copy, Check, LogOut, Loader2, LogOut as LeaveIcon, RefreshCw, AlertCircle, Plus, Hash, Smartphone, Bell, BellOff, Clock, Zap } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { trpc } from '@/lib/trpc'

// Helper to subscribe to push notifications
async function subscribeToPush(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push notifications are not supported in your browser')
        return null
    }
    
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
        alert('Notification permission denied')
        return null
    }
    
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
    
    return subscription
}

// Helper to get existing subscription
async function getExistingSubscription(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator)) return null
    const registration = await navigator.serviceWorker.ready
    return registration.pushManager.getSubscription()
}

// Sub-component for regeneration button state
function RegenerateButton({ group, onUpdate }: { group: any, onUpdate: (g: any) => void }) {
    const [status, setStatus] = useState<'idle' | 'confirm' | 'generating'>('idle')
    const regenerateMutation = trpc.groups.regenerateInviteCode.useMutation()

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (status === 'idle') {
            setStatus('confirm')
            setTimeout(() => {
                setStatus(prev => prev === 'confirm' ? 'idle' : prev)
            }, 3000)
            return
        }

        if (status === 'confirm') {
            setStatus('generating')
            try {
                const data = await regenerateMutation.mutateAsync({ groupId: group.id })
                onUpdate({
                    ...group,
                    inviteCode: data.inviteCode,
                    inviteCodeCreated: data.inviteCodeCreated
                })
            } catch (e) {
                console.error(e)
                alert("Error generating code")
            } finally {
                setStatus('idle')
            }
        }
    }

    if (status === 'generating') {
        return (
            <Button variant="ghost" size="sm" disabled className="text-gray-400 gap-2 h-auto p-0">
                <Loader2 className="w-3 h-3 animate-spin" /> Generating...
            </Button>
        )
    }

    if (status === 'confirm') {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={handleClick}
                className="text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-600 animate-in fade-in zoom-in duration-200 h-9 px-3 gap-2"
            >
                <AlertCircle className="w-4 h-4" />
                Confirm
            </Button>
        )
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className="text-gray-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg w-9 h-9 transition-all"
            title="Regenerate Invite Code"
        >
            <RefreshCw className="w-4 h-4" />
        </Button>
    )
}

function SettingsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Default tab logic
    const initialTab = searchParams.get('tab') === 'group' ? 'group' : 'profile'
    const [activeTab, setActiveTab] = useState<'profile' | 'group'>(initialTab)
    const [loading, setLoading] = useState(true)

    // Data State
    const [user, setUser] = useState<any>(null)
    const [group, setGroup] = useState<any>(null)

    // Form State
    const [displayName, setDisplayName] = useState('')
    const [groupName, setGroupName] = useState('')
    
    // Push notification state
    const [pushEnabled, setPushEnabled] = useState(false)
    const [pushLoading, setPushLoading] = useState(true)
    
    // Admin settings state
    const [frequency, setFrequency] = useState(2)
    const [quietHoursStart, setQuietHoursStart] = useState<number | null>(null)
    const [quietHoursEnd, setQuietHoursEnd] = useState<number | null>(null)

    const [copied, setCopied] = useState(false)
    const [saveStatus, setSaveStatus] = useState<{ field: string, status: 'saving' | 'saved' | 'idle' }>({ field: '', status: 'idle' })

    // tRPC queries and mutations
    const settingsQuery = trpc.settings.getData.useQuery(undefined, {
        retry: false,
    })
    const updateProfileMutation = trpc.users.updateProfile.useMutation()
    const updateGroupMutation = trpc.groups.update.useMutation()
    const leaveGroupMutation = trpc.users.leaveGroup.useMutation()
    const removeGroupMemberMutation = trpc.groups.removeMember.useMutation()
    const deleteAccountMutation = trpc.users.deleteAccount.useMutation()
    const pushSubscribeMutation = trpc.push.subscribe.useMutation()
    const pushUnsubscribeMutation = trpc.push.unsubscribe.useMutation()

    // Redirect if unauthorized
    useEffect(() => {
        if (settingsQuery.error?.data?.code === 'UNAUTHORIZED') {
            router.push('/onboarding')
        }
    }, [settingsQuery.error, router])

    // Initialize form state when data loads
    useEffect(() => {
        if (settingsQuery.data) {
            setUser(settingsQuery.data.user)
            setGroup(settingsQuery.data.group)
            setDisplayName(settingsQuery.data.user.displayName || '')
            if (settingsQuery.data.group) {
                setGroupName(settingsQuery.data.group.name || '')
                setFrequency(settingsQuery.data.group.frequency ?? 2)
                setQuietHoursStart(settingsQuery.data.group.quietHoursStart ?? null)
                setQuietHoursEnd(settingsQuery.data.group.quietHoursEnd ?? null)
            }
            setLoading(false)
        }
    }, [settingsQuery.data])
    
    // Check push notification status on mount
    useEffect(() => {
        const checkPushStatus = async () => {
            try {
                const subscription = await getExistingSubscription()
                setPushEnabled(!!subscription)
            } catch (e) {
                console.error('Error checking push status:', e)
            } finally {
                setPushLoading(false)
            }
        }
        checkPushStatus()
    }, [])
    
    // Handle push notification toggle
    const handlePushToggle = async () => {
        setPushLoading(true)
        try {
            if (pushEnabled) {
                // Unsubscribe
                const subscription = await getExistingSubscription()
                if (subscription) {
                    await pushUnsubscribeMutation.mutateAsync({ endpoint: subscription.endpoint })
                    await subscription.unsubscribe()
                }
                setPushEnabled(false)
            } else {
                // Subscribe
                const subscription = await subscribeToPush()
                if (subscription) {
                    const json = subscription.toJSON()
                    await pushSubscribeMutation.mutateAsync({
                        endpoint: subscription.endpoint,
                        p256dh: json.keys?.p256dh ?? '',
                        auth: json.keys?.auth ?? '',
                    })
                    setPushEnabled(true)
                }
            }
        } catch (e) {
            console.error('Error toggling push:', e)
            alert('Failed to update notification settings')
        } finally {
            setPushLoading(false)
        }
    }
    
    // Handle admin settings save
    const handleAdminSettingsSave = async (field: string, value: any) => {
        if (!user.isGroupOwner || !group) return
        
        setSaveStatus({ field, status: 'saving' })
        try {
            await updateGroupMutation.mutateAsync({
                groupId: group.id,
                [field]: value,
            })
            setSaveStatus({ field, status: 'saved' })
            setTimeout(() => {
                setSaveStatus(prev => prev.field === field ? { ...prev, status: 'idle' } : prev)
            }, 2000)
        } catch (e) {
            console.error(e)
            setSaveStatus(prev => prev.field === field ? { ...prev, status: 'idle' } : prev)
        }
    }


    const handleCopyCode = () => {
        if (!group) return
        const link = `${window.location.origin}/onboarding?code=${group.inviteCode}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!user.isGroupOwner) return

        if (confirm('Are you sure you want to remove this member?')) {
            // Optimistic update
            const updatedMembers = group.members.filter((m: any) => m.id !== memberId)
            setGroup({ ...group, members: updatedMembers })

            try {
                await removeGroupMemberMutation.mutateAsync({ groupId: group.id, memberId })
            } catch (e) {
                console.error(e)
                // Revert on error
                setGroup(group)
            }
        }
    }

    const handleLeaveGroup = async () => {
        if (confirm('Are you sure you want to leave this group?')) {
            try {
                await leaveGroupMutation.mutateAsync()
                setGroup(null)
                setActiveTab('profile')
            } catch (e) {
                console.error(e)
                alert("Failed to leave group")
            }
        }
    }

    // Auto-Save Handler
    const handleAutoSave = async (field: string, value: string) => {
        if (field === 'groupName' && !user.isGroupOwner) return

        setSaveStatus({ field, status: 'saving' })

        try {
            if (field === 'displayName') {
                await updateProfileMutation.mutateAsync({ displayName: value })
            } else if (field === 'groupName' && group) {
                await updateGroupMutation.mutateAsync({ groupId: group.id, name: value })
            }

            setSaveStatus({ field, status: 'saved' })
            setTimeout(() => {
                setSaveStatus(prev => prev.field === field ? { ...prev, status: 'idle' } : prev)
            }, 2000)
        } catch (e) {
            console.error(e)
            setSaveStatus(prev => prev.field === field ? { ...prev, status: 'idle' } : prev)
        }
    }

    const handleDownloadData = () => {
        const data = JSON.stringify({ user, group }, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'statelink-data.json'
        a.click()
    }

    const handleLogout = async () => {
        try {
            await authClient.signOut()
        } catch (e) {
            console.error('Logout error:', e)
        }
        router.push('/onboarding')
    }

    const handleDeleteAccount = async () => {
        if (confirm('DANGER: This will permanently delete your account and all data. This cannot be undone. Continue?')) {
            try {
                await deleteAccountMutation.mutateAsync()
                // Sign out after deletion
                try {
                    await authClient.signOut()
                } catch (e) {
                    // Ignore signout errors since account is deleted
                }
                router.push('/onboarding')
            } catch (e: any) {
                console.error(e)
                alert(e.message || 'Failed to delete account')
            }
        }
    }

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

    if (loading) return <LoadingSpinner message="Loading settings..." />

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <PageHeader title="Settings" showBackButton maxWidth="2xl" />


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
                    {/* Always show Group tab */}
                    <button
                        onClick={() => setActiveTab('group')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'group'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Group
                    </button>
                </div>

                {/* Profile Content */}
                {activeTab === 'profile' && user && (
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
                                    value={user.email}
                                    disabled
                                    className="h-12 bg-gray-50 dark:bg-gray-900 border-transparent opacity-60"
                                />
                                <p className="text-xs text-gray-400 mt-1">Contact support to change email.</p>
                            </div>


                        </Card>

                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <h2 className="font-semibold text-gray-900 dark:text-white">Notifications</h2>
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <div className="flex items-center gap-3">
                                    {pushEnabled ? (
                                        <Bell className="w-5 h-5 text-primary" />
                                    ) : (
                                        <BellOff className="w-5 h-5 text-gray-400" />
                                    )}
                                    <div>
                                        <div className="font-semibold text-gray-700 dark:text-gray-200">Push Notifications</div>
                                        <div className="text-xs text-gray-500">Get notified for vibe check-ins</div>
                                    </div>
                                </div>
                                <Button 
                                    variant={pushEnabled ? "default" : "outline"}
                                    size="sm"
                                    onClick={handlePushToggle}
                                    disabled={pushLoading}
                                    className="min-w-[80px]"
                                >
                                    {pushLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : pushEnabled ? (
                                        'Enabled'
                                    ) : (
                                        'Enable'
                                    )}
                                </Button>
                            </div>
                        </Card>

                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <h2 className="font-semibold text-gray-900 dark:text-white">Application</h2>
                            <Button variant="outline" onClick={() => router.push('/install')} className="w-full h-12 rounded-xl justify-start px-4 gap-3 bg-gray-50 border-0 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                                <Smartphone className="w-5 h-5 text-gray-500" />
                                <div className="text-left">
                                    <div className="font-semibold">Install App</div>
                                </div>
                            </Button>
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
                                    <div className="font-semibold text-gray-700 dark:text-gray-200">Download All My Data</div>
                                </div>
                            </Button>

                            <Button variant="ghost" onClick={handleDeleteAccount} className="w-full h-12 rounded-xl justify-start px-4 gap-3 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-red-500">
                                <Trash2 className="w-5 h-5" />
                                <div className="text-left">
                                    <div className="font-semibold">Delete Account</div>
                                </div>
                            </Button>
                        </Card>
                    </div>
                )}

                {/* Group Content */}
                {activeTab === 'group' && !group && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <div>
                                <h2 className="font-semibold text-gray-900 dark:text-white mb-1">No Group</h2>
                                <p className="text-sm text-gray-500">
                                    You are not currently in a group. Create one or join an existing one.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    onClick={() => router.push('/onboarding?step=3&action=create')}
                                    variant="outline"
                                    className="h-32 flex flex-col gap-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:text-primary transition-all shadow-none"
                                >
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="font-semibold">Create Group</span>
                                </Button>

                                <Button
                                    onClick={() => router.push('/onboarding?step=3&action=join')}
                                    variant="outline"
                                    className="h-32 flex flex-col gap-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-600 transition-all shadow-none"
                                >
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                        <Hash className="w-6 h-6" />
                                    </div>
                                    <span className="font-semibold">Join with Invite Code</span>
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'group' && group && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <h2 className="font-semibold text-gray-900 dark:text-white">Group Details</h2>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Group Name
                                    </label>
                                    {user.isGroupOwner && <StatusIndicator fieldName="groupName" />}
                                </div>
                                <Input
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    onBlur={() => handleAutoSave('groupName', groupName)}
                                    disabled={!user.isGroupOwner}
                                    className={`h-12 bg-gray-50 dark:bg-gray-900 border-transparent focus:bg-white transition-colors ${!user.isGroupOwner ? 'opacity-70' : ''}`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                    Invite Code
                                </label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <div className="flex-1 h-12 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center px-4 font-mono font-bold tracking-widest text-gray-700 dark:text-gray-300">
                                            {group.inviteCode}
                                        </div>
                                        <Button onClick={handleCopyCode} variant={copied ? "default" : "outline"} className="h-12 w-12 rounded-lg p-0 flex items-center justify-center">
                                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                        </Button>
                                        {user.isGroupOwner && (
                                            <RegenerateButton group={group} onUpdate={(updatedGroup) => setGroup(updatedGroup)} />
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center mt-2">
                                        <div className="text-xs text-gray-500">
                                            {(() => {
                                                if (!group.inviteCodeCreated) return null

                                                const created = new Date(group.inviteCodeCreated).getTime()
                                                const now = new Date().getTime()
                                                const expires = created + (7 * 24 * 60 * 60 * 1000)
                                                const diff = expires - now

                                                if (diff <= 0) return <span className="text-red-500">Expired</span>

                                                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                                                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

                                                return <span>Expires in {days}d {hours}h</span>
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-semibold text-gray-900 dark:text-white">Members ({group.members.length})</h2>
                            </div>

                            <div className="space-y-1">
                                {group.members.map((member: any) => (
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

                                        {/* Remove member logic: only if OWNER and removing OTHERS */}
                                        {member.role !== 'owner' && user.isGroupOwner && (
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

                        {/* Admin Panel - Only visible to group owners */}
                        {user.isGroupOwner && (
                            <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-5 h-5 text-primary" />
                                    <h2 className="font-semibold text-gray-900 dark:text-white">Ping Settings</h2>
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Pings per Week
                                        </label>
                                        <StatusIndicator fieldName="frequency" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="1"
                                            max="7"
                                            value={frequency}
                                            onChange={(e) => setFrequency(parseInt(e.target.value))}
                                            onMouseUp={() => handleAdminSettingsSave('frequency', frequency)}
                                            onTouchEnd={() => handleAdminSettingsSave('frequency', frequency)}
                                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
                                        />
                                        <span className="text-lg font-bold text-primary w-8 text-center">{frequency}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">How often members get pinged for check-ins</p>
                                </div>
                                
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Quiet Hours
                                        </label>
                                        <StatusIndicator fieldName="quietHours" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Start</label>
                                            <select
                                                value={quietHoursStart ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? null : parseInt(e.target.value)
                                                    setQuietHoursStart(val)
                                                    handleAdminSettingsSave('quietHoursStart', val)
                                                }}
                                                className="w-full h-10 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg border-0 text-sm"
                                            >
                                                <option value="">Off</option>
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={i}>
                                                        {i.toString().padStart(2, '0')}:00
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">End</label>
                                            <select
                                                value={quietHoursEnd ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? null : parseInt(e.target.value)
                                                    setQuietHoursEnd(val)
                                                    handleAdminSettingsSave('quietHoursEnd', val)
                                                }}
                                                className="w-full h-10 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg border-0 text-sm"
                                            >
                                                <option value="">Off</option>
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={i}>
                                                        {i.toString().padStart(2, '0')}:00
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">No pings will be sent during quiet hours</p>
                                </div>
                            </Card>
                        )}

                        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 space-y-4">
                            <h2 className="font-semibold text-gray-900 dark:text-white">Group Actions</h2>
                            <Button variant="ghost" onClick={handleLeaveGroup} className="w-full h-12 rounded-xl justify-start px-4 gap-3 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-red-500">
                                <LeaveIcon className="w-5 h-5" />
                                <div className="text-left">
                                    <div className="font-semibold">Leave Group</div>
                                    <div className="text-xs opacity-70 font-normal">Leave this group and join another</div>
                                </div>
                            </Button>
                        </Card>
                    </div>
                )}



            </div>
        </div>
    )
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<LoadingSpinner message="Loading settings..." />}>
            <SettingsContent />
        </Suspense>
    )
}
