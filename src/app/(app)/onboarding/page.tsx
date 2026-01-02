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

  // View State: 'onboarding' (signup) or 'login'
  const [view, setView] = useState<'onboarding' | 'login'>('onboarding')

  // Signup State
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [groupAction, setGroupAction] = useState<'create' | 'join' | null>(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [autoInviteCode, setAutoInviteCode] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Login State
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('invite') || searchParams.get('code')
    if (code) {
      setInviteCode(code)
      setAutoInviteCode(code)
    }
  }, [searchParams])

  // --- LOGIN HANDLER ---
  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please enter email and password')
      return
    }
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Successful Login
      // In a real app we might check if they have a group, but redirecting to dashboard is fine
      router.push('/dashboard')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  // --- SIGNUP HANDLERS ---
  const handleNext = async () => {
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
      // Password validation: minimum 8 characters, at least one uppercase, one lowercase, and one number
      if (password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }
      if (!/[A-Z]/.test(password)) {
        setError('Password must contain at least one uppercase letter')
        return
      }
      if (!/[a-z]/.test(password)) {
        setError('Password must contain at least one lowercase letter')
        return
      }
      if (!/[0-9]/.test(password)) {
        setError('Password must contain at least one number')
        return
      }

      setLoading(true)
      setError('')

      try {
        // Check if we already have a user in session (from prev step or local)
        // Actually, we are creating new here.

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
          if (userData.error === 'User with this email already exists') {
            throw new Error("This email is already taken. Please log in.")
          } else {
            throw new Error(userData.error || 'Failed to create user account')
          }
        }

        const newUserId = userData.user.id
        setUserId(newUserId)
        localStorage.setItem('statelink_user_id', newUserId) // PERSIST

        setError('')
        if (autoInviteCode) {
          setGroupAction('join')
        }
        setStep(3)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
      return
    }
  }

  // --- AUTO LOGIN ON MOUNT ---
  useEffect(() => {
    const storedUserId = localStorage.getItem('statelink_user_id')
    if (storedUserId) {
      // Ideally verify it exists via API, but for now we trust it or dashboard will handle 404
      // Or we can just redirect to dashboard directly if we have it?
      // User might want to signup again if they are here.
      // But if they just refreshed, they want to be logged in.
      // We'll trust it.
      // If viewing '/' (onboarding), maybe we should redirect to dashboard?
      // For now, I won't auto-redirect to avoid loop if they explicitly came here to logout/switch.
      // But I will set it in state so 'Join/Create' works if they skip steps?
      // Actually they can't skip steps easily.
      // Let's just persist on Create/Login.
    }
  }, [])


  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name')
      return
    }
    if (!userId) {
      setError("User account not found. Please restart.")
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, userId: userId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create group')
      }
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
    if (!userId) {
      setError("User account not found. Please restart.")
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, userId: userId }),
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
    <div className="w-full max-w-md">
      <Card className="border-none shadow-2xl rounded-[2rem] bg-white dark:bg-gray-800 overflow-hidden relative min-h-[500px] flex flex-col">
        <div className="p-8 flex-1 flex flex-col h-full">

          {/* Header / Nav */}
          <div className="flex items-center justify-between mb-8 relative h-8">
            {view === 'onboarding' && step > 1 && (
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

          {/* --- LOGIN VIEW --- */}
          {view === 'login' && (
            <div className="space-y-6 flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="text-center space-y-2 mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sign in to check on your group.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 pl-1">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 pl-1">Password</label>
                    <span className="text-xs text-primary cursor-pointer hover:underline">Forgot?</span>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>}

              <Button onClick={handleLogin} disabled={loading} className="w-full h-14 text-lg rounded-2xl font-semibold shadow-lg shadow-primary/20 mt-4">
                {loading ? 'Signing In...' : 'Log In'}
              </Button>
            </div>
          )}

          {/* --- SIGNUP VIEW --- */}
          {view === 'onboarding' && (
            <>
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
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
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

                    <Button onClick={handleNext} disabled={loading} className="w-full h-14 text-lg rounded-2xl font-semibold shadow-lg shadow-primary/20">
                      {loading ? 'Creating Account...' : 'Continue'}
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
                      {loading ? 'Creating Group...' : 'Create Group'}
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
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 8))}
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
                      {loading ? 'Joining Group...' : 'Join Group'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </Card>

      {/* Footer / Login Link */}
      {/* Footer / Login Link */}
      <div className="mt-8 flex justify-center">
        <div
          onClick={() => { setView(view === 'onboarding' ? 'login' : 'onboarding'); setError('') }}
          className="group flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-6 py-3 rounded-full shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-gray-800 transition-all cursor-pointer border border-white/20 dark:border-gray-700/50"
        >
          <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
            {view === 'onboarding' ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <span className="text-sm font-bold text-primary">
            {view === 'onboarding' ? 'Log in' : 'Sign up'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-gray-50 to-gray-50 dark:from-blue-900/20 dark:via-gray-900 dark:to-gray-900">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <OnboardingContent />
      </Suspense>
    </div>
  )
}
