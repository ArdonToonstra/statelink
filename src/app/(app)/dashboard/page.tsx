'use client'

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageHeader } from "@/components/ui/page-header"
import { Users, Zap, Settings, Activity, ChevronDown, Check, Plus, X, Loader2 } from "lucide-react"
import Link from 'next/link'
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"

export default function DashboardPage() {
  const router = useRouter()
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState<'create' | 'join' | null>(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [modalError, setModalError] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error, refetch } = trpc.dashboard.getData.useQuery(undefined, {
    retry: false,
  })

  const setActiveGroupMutation = trpc.groups.setActiveGroup.useMutation({
    onSuccess: () => {
      refetch()
      setShowGroupDropdown(false)
    },
  })

  const createGroupMutation = trpc.groups.create.useMutation({
    onSuccess: () => {
      refetch()
      setShowGroupModal(null)
      setGroupName('')
      setModalError('')
    },
    onError: (err) => {
      setModalError(err.message)
    },
  })

  const joinGroupMutation = trpc.groups.join.useMutation({
    onSuccess: () => {
      refetch()
      setShowGroupModal(null)
      setInviteCode('')
      setModalError('')
    },
    onError: (err) => {
      setModalError(err.message)
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowGroupDropdown(false)
      }
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowGroupModal(null)
        setModalError('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Redirect to onboarding if not authenticated
  if (error?.data?.code === 'UNAUTHORIZED') {
    router.push('/onboarding')
    return null
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!data) return null; // Or error state

  const pulseValue = data.groupPulse ? parseFloat(data.groupPulse) : 0
  const hasVibe = !!data.groupPulse
  const isSolo = data.memberCount <= 1
  const hasGroups = data.groups && data.groups.length > 0
  const emptyVibeText = "Waiting for input..."

  // Color logic for pulse
  const getPulseColor = (val: number) => {
    if (val >= 8) return "text-emerald-500"
    if (val >= 5) return "text-blue-500"
    return "text-orange-500"
  }

  // Empty State Logic
  const showInviteCallout = isSolo && !hasVibe && !data.userLastVibe

  const handleGroupSwitch = (groupId: string | null) => {
    setActiveGroupMutation.mutate({ groupId })
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setModalError('Please enter a group name')
      return
    }
    setModalLoading(true)
    setModalError('')
    try {
      await createGroupMutation.mutateAsync({ name: groupName })
    } finally {
      setModalLoading(false)
    }
  }

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      setModalError('Please enter an invite code')
      return
    }
    setModalLoading(true)
    setModalError('')
    try {
      await joinGroupMutation.mutateAsync({ inviteCode })
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-gray-50 to-gray-50 dark:from-blue-900/20 dark:via-gray-900 dark:to-gray-900 font-sans pb-20">

      {/* Header */}
      <PageHeader
        title={
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                {data.groupName}
              </span>
              {hasGroups && (
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Group Switcher Dropdown */}
            {showGroupDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 bg-white dark:bg-gray-800">
                <div className="p-2 bg-white dark:bg-gray-800">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                    Your Groups
                  </div>

                  {/* Group list */}
                  {data.groups?.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleGroupSwitch(group.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${data.activeGroupId === group.id
                          ? 'bg-primary/10 text-primary'
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                        }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center text-xs font-bold text-primary">
                        {group.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-medium">{group.name}</span>
                        {group.isOwner && (
                          <span className="ml-2 text-xs text-gray-400">Owner</span>
                        )}
                      </div>
                      {data.activeGroupId === group.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
                  <button
                    onClick={() => { setShowGroupDropdown(false); setShowGroupModal('create'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors bg-white dark:bg-gray-800"
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="font-medium">Create New Group</span>
                  </button>
                  <button
                    onClick={() => { setShowGroupDropdown(false); setShowGroupModal('join'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors bg-white dark:bg-gray-800"
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="font-medium">Join Group</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        }
        maxWidth="md"
        rightContent={
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Settings className="w-5 h-5 text-gray-500" />
            </Button>
          </Link>
        }
      />

      <div className={`max-w-md mx-auto p-4 space-y-6 transition-all duration-300 ease-out ${showGroupDropdown ? 'mt-64 opacity-50' : 'mt-0 opacity-100'}`}>

        {/* Vibe Card */}
        <Card className="border-none shadow-xl shadow-blue-500/5 bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden relative min-h-[300px] flex flex-col items-center justify-center p-8">
          {/* Background decorative blobs */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent animate-slow-spin" />
          </div>

          <div className="relative z-10 text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50 text-xs font-medium text-gray-500 mb-4">
              <Users className="w-3 h-3" />
              {data.memberCount} Members Active
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Group Pulse</h2>

            <div className="relative">
              {/* Pulse Rings */}
              {hasVibe && (
                <>
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${getPulseColor(pulseValue).replace('text-', 'bg-')}`}></div>
                  <div className="absolute inset-0 rounded-full animate-pulse opacity-10 bg-primary blur-3xl"></div>
                </>
              )}

              <div className={`text-8xl font-black tracking-tighter ${hasVibe ? getPulseColor(pulseValue) : 'text-gray-300'}`}>
                {hasVibe ? pulseValue : '--'}
              </div>
            </div>

            <p className="text-gray-500 font-medium">
              {hasVibe
                ? (pulseValue > 7 ? "Vibes are immaculate" : pulseValue > 4 ? "Keepin' it steady" : "Needs some love")
                : emptyVibeText}
            </p>
          </div>

          {/* Bounce removed */}
        </Card>

        {/* Empty State Call to Action */}
        {/* Empty State Call to Action */}
        {showInviteCallout && (
          <div className="my-2">
            <Link href="/settings?tab=group">
              <Button variant="outline" className="w-full h-20 rounded-2xl border-dashed border-2 border-primary/20 hover:border-primary hover:bg-primary/5 text-primary gap-3 text-lg font-semibold bg-white dark:bg-gray-800">
                <Users className="w-6 h-6" />
                Invite People To Your Group
              </Button>
            </Link>
          </div>
        )}

        {/* Core Action */}
        <Link href="/check-in" className="block transform transition-transform active:scale-95">
          <Button className="w-full h-20 text-xl rounded-3xl font-bold shadow-2xl shadow-emerald-500/40 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 hover:from-emerald-500 hover:via-green-600 hover:to-teal-600">
            <Zap className="mr-3 w-8 h-8 fill-white" />
            Check In Now
          </Button>
        </Link>

        {/* Secondary Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/stats">
            <Button variant="outline" className="w-full h-24 rounded-2xl flex flex-col gap-2 border-0 bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-700 dark:text-gray-200">Group Stats</span>
            </Button>
          </Link>

          <Link href="/stats/me">
            <Button variant="outline" className="w-full h-24 rounded-2xl flex flex-col gap-2 border-0 bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <UserIcon className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-700 dark:text-gray-200">My Stats</span>
            </Button>
          </Link>
        </div>



      </div>

      {/* Create/Join Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {showGroupModal === 'create' ? 'Create New Group' : 'Join Group'}
              </h2>
              <button
                onClick={() => { setShowGroupModal(null); setModalError(''); }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {showGroupModal === 'create' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Group Name
                    </label>
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Enter group name..."
                      className="h-12"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                    />
                  </div>

                  {modalError && (
                    <p className="text-sm text-red-500">{modalError}</p>
                  )}

                  <Button
                    onClick={handleCreateGroup}
                    disabled={modalLoading}
                    className="w-full h-12 rounded-xl font-semibold"
                  >
                    {modalLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Create Group'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Invite Code
                    </label>
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="Enter invite code..."
                      className="h-12 font-mono tracking-widest uppercase"
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinGroup()}
                    />
                  </div>

                  {modalError && (
                    <p className="text-sm text-red-500">{modalError}</p>
                  )}

                  <Button
                    onClick={handleJoinGroup}
                    disabled={modalLoading}
                    className="w-full h-12 rounded-xl font-semibold"
                  >
                    {modalLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Join Group'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
