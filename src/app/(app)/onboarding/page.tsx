'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Zap, ArrowLeft, Users, Plus, ArrowRight } from 'lucide-react'

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)

  // Step 1: Name
  const [displayName, setDisplayName] = useState('')

  // Step 2: Credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 3: Group
  const [groupAction, setGroupAction] = useState<'create' | 'join' | null>(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [autoInviteCode, setAutoInviteCode] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('invite') || searchParams.get('code')
    if (code) {
      setInviteCode(code)
      setAutoInviteCode(code)
      // Logic to auto-select join will happen when they reach step 3
    }
  }, [searchParams])

  const handleNext = () => {
    if (step === 1) {
      if (!displayName.trim()) {
        setError('Please enter your name')
        return
      }
      setError('')
      setStep(2)
      return
    }

    if (step === 2) {
      if (!email.trim() || !password.trim()) {
        setError('Please enter email and password')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      setError('')

      // If we have an auto-invite code, go straight to join confirm
      if (autoInviteCode) {
        setGroupAction('join')
      }

      setStep(3)
      return
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First, create the user account
      const userResponse = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          email,
          password
        }),
      })

      const userData = await userResponse.json()

      if (!userResponse.ok) {
        throw new Error(userData.error || 'Failed to create user account')
      }

      // Then create the group with the real user ID
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, userId: userData.user.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create group')
      }

      // Show invite code to user
      alert(`Group created! Invite code: ${data.group.inviteCode}`)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First, create the user account
      // Note: In a real app we'd check if email exists and login, or creating new
      const userResponse = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          email,
          password
        }),
      })

      const userData = await userResponse.json()

      let userId = ''

      if (!userResponse.ok) {
        if (userData.error === 'User with this email already exists') {
          // For this demo, we assume they might want to login, but since we don't have login logic here
          // We'll just show error. Ideally we'd log them in or ask to login.
          throw new Error("User exists. Please log in (not implemented in this demo flow yet).")
        } else {
          throw new Error(userData.error || 'Failed to create user account')
        }
      } else {
        userId = userData.user.id
      }

      // Then join the group with the real user ID
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join group')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    if (groupAction) {
      setGroupAction(null)
      return
    }
    setStep(step - 1)
  }

  return (
    <Card className="w-full max-w-md border-none shadow-2xl rounded-[2rem] bg-white dark:bg-gray-800 overflow-hidden relative">
      <div className="p-8">
        {/* Header / Nav */}
        <div className="flex items-center justify-between mb-8 relative h-8">
          {step > 1 && (
            <button
              onClick={goBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors absolute left-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white tracking-tight">StateLink</span>
          </div>
        </div>

        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {step === 1 ? 'Welcome!' : step === 2 ? 'Secure Account' : 'Find your Squad'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === 1 ? 'Let\'s get started with your name.' : step === 2 ? 'Create a login to save your stats.' : 'Create or join a group.'}
          </p>
        </div>

        <div className="min-h-[200px]">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 pl-1">
                  Display Name
                </label>
                <Input
                  placeholder="e.g. Alice"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 transition-all text-lg"
                />
              </div>
              <Button onClick={handleNext} className="w-full h-14 text-lg rounded-2xl font-semibold shadow-lg shadow-primary/20">
                Next Step <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 pl-1">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 pl-1">Password</label>
                  <Input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>}

              <Button onClick={handleNext} className="w-full h-14 text-lg rounded-2xl font-semibold shadow-lg shadow-primary/20">
                continue
              </Button>
            </div>
          )}

          {step === 3 && !groupAction && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              {autoInviteCode ? (
                <div className="text-center p-4 bg-primary/5 rounded-2xl mb-4">
                  <p className="text-sm font-medium text-primary mb-2">Invite Code Found!</p>
                  <p className="text-2xl font-mono font-bold">{autoInviteCode}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setGroupAction('join')}
                  className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group h-40"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Users className="w-6 h-6 text-gray-500 group-hover:text-primary" />
                  </div>
                  <span className="font-semibold text-gray-700 group-hover:text-primary">Join Group</span>
                </button>

                <button
                  onClick={() => setGroupAction('create')}
                  className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group h-40"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Plus className="w-6 h-6 text-gray-500 group-hover:text-primary" />
                  </div>
                  <span className="font-semibold text-gray-700 group-hover:text-primary">Create Group</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && groupAction === 'create' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 pl-1">
                  Group Name
                </label>
                <Input
                  placeholder="e.g. The Avengers"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 transition-all text-lg"
                />
              </div>
              {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>}

              <Button
                onClick={handleCreateGroup}
                disabled={loading}
                className="w-full h-14 text-lg rounded-2xl font-semibold shadow-lg shadow-primary/20"
              >
                {loading ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          )}

          {step === 3 && groupAction === 'join' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 pl-1">
                  Invite Code
                </label>
                <Input
                  placeholder="XXXXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 transition-all text-center text-2xl font-mono tracking-widest uppercase"
                />
              </div>

              {autoInviteCode && (
                <p className="text-sm text-center text-green-600">
                  Auto-filled from invitation link
                </p>
              )}

              {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>}

              <Button
                onClick={handleJoinGroup}
                disabled={loading}
                className="w-full h-14 text-lg rounded-2xl font-semibold shadow-lg shadow-primary/20"
              >
                {loading ? 'Joining...' : 'Join Group'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-gray-50 to-gray-50 dark:from-blue-900/20 dark:via-gray-900 dark:to-gray-900">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <OnboardingContent />
      </Suspense>

      {/* Footer / Login Link */}
      <div className="fixed bottom-8 text-center text-sm text-gray-400">
        Already have an account? <span className="text-primary font-bold cursor-pointer hover:underline">Log in</span>
      </div>
    </div>
  )
}
