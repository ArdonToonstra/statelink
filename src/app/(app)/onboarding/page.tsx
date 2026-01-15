'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Zap, ArrowLeft, Users, Plus, ArrowRight, Download, Trash2, ArrowRightLeft, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'

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
  const [showMigrationModal, setShowMigrationModal] = useState(false)

  // Verification State
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    const code = searchParams.get('invite') || searchParams.get('code')
    if (code) {
      setInviteCode(code)
      setAutoInviteCode(code)
    }

    // Check for view parameter
    const viewParam = searchParams.get('view')
    if (viewParam === 'login' || viewParam === 'onboarding') {
      setView(viewParam)
    }

    // Check for step and action parameters (from settings page)
    const stepParam = searchParams.get('step')
    const actionParam = searchParams.get('action')

    // Step 4 is now group selection (was step 3)
    if (stepParam === '4' && (actionParam === 'create' || actionParam === 'join')) {
      // User is already authenticated and wants to create/join group
      setStep(4)
      setGroupAction(actionParam)
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
      const result = await authClient.signIn.email({
        email: loginEmail,
        password: loginPassword,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Login failed')
      }

      // Successful Login - navigate to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 100)

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
        // Sign up with Better Auth
        // displayName is a required custom field in our Better Auth config
        const result = await authClient.signUp.email({
          email,
          password,
          name: displayName,
          displayName, // Custom field required by our config
        } as any)

        if (result.error) {
          if (result.error.message?.includes('already exists') || result.error.code === 'USER_ALREADY_EXISTS') {
            throw new Error("This email is already taken. Please log in.")
          }
          throw new Error(result.error.message || 'Failed to create user account')
        }

        const newUserId = result.data?.user?.id
        setUserId(newUserId || null)

        // Create corresponding Payload user for app data (groupID, etc.)
        try {
          await fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email,
              displayName,
              betterAuthId: newUserId,
            }),
          })
        } catch (syncErr) {
          console.error('Failed to sync Payload user:', syncErr)
          // Continue anyway - the sync can happen later
        }

        setError('')

        // Check if verification is enabled
        const isVerificationEnabled = process.env.NEXT_PUBLIC_IS_VERIFICATION_ENABLED === 'true'

        if (isVerificationEnabled) {
          // Send verification OTP via Better Auth
          try {
            await authClient.emailOtp.sendVerificationOtp({
              email,
              type: 'email-verification',
            })
          } catch (otpErr) {
            console.error('Failed to send OTP:', otpErr)
          }
          // Start resend cooldown since email was just sent
          setResendCooldown(300)
          // Go to verification step (step 3)
          setStep(3)
        } else {
          // Skip verification, go directly to group selection (step 4)
          if (autoInviteCode) {
            setGroupAction('join')
          }
          setStep(4)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
      return
    }
  }

  // --- CHECK IF ALREADY AUTHENTICATED ON MOUNT ---
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check if user is coming from settings to create/join group
      const stepParam = searchParams.get('step')
      const actionParam = searchParams.get('action')
      if (stepParam === '4' && (actionParam === 'create' || actionParam === 'join')) {
        return // Let them proceed to group creation/join
      }

      try {
        const res = await fetch('/api/dashboard', {
          credentials: 'include'
        })

        // If user is authenticated and has group, redirect to dashboard
        if (res.ok) {
          router.push('/dashboard')
        }
        // Otherwise stay on onboarding page
      } catch (e) {
        // Error checking auth, stay on onboarding
      }
    }
    checkAuth()
  }, [router, searchParams])


  // --- VERIFICATION HANDLERS ---
  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length < 6) {
      setError('Please enter the 6-digit code')
      return
    }
    setVerifying(true)
    setError('')

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp: verificationCode,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Verification failed')
      }

      toast.success('Email verified!')
      // Pre-fill group action if invite code was provided
      if (autoInviteCode) {
        setGroupAction('join')
      }
      setStep(4) // Go to group selection
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    setError('')

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })

      if (result.error) {
        if (result.error.code === 'RATE_LIMIT_EXCEEDED') {
          toast.error('Please wait before requesting another code')
          setResendCooldown(300)
          return
        }
        throw new Error(result.error.message || 'Failed to send email')
      }

      toast.success('Verification code sent!')
      setResendCooldown(300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend')
    } finally {
      setLoading(false)
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
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: groupName }),
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



  const handleMigrationChoice = async (action: 'merge' | 'delete') => {
    setLoading(true)
    setError('')

    // If delete + download, we download first
    if (action === 'delete') {
      // Trigger download (simple fetch of own data)
      try {
        // We can re-use the GET /api/check-ins?scope=me logic if we want, 
        // but for now let's assume we proceed with delete.
        // Ideally we fetch data & trigger download here.
        const res = await fetch('/api/check-ins?scope=me', { credentials: 'include' })
        if (res.ok) {
          const json = await res.json()
          const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'my-statelink-data.json'
          a.click()
        }
      } catch (e) {
        console.error("Failed to download data", e)
        // Proceed anyway? Or warn?
      }
    }

    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteCode, migrationAction: action }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join group')
      }

      router.push('/dashboard')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setShowMigrationModal(false)
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
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteCode }),
      })
      const data = await response.json()

      if (response.status === 409 && data.confirmationRequired) {
        setShowMigrationModal(true)
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join group')
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      // Only stop loading if we didn't show modal
      if (!showMigrationModal) {
        // Check state in next render cycle or use ref, but here simplistic check might fail
        // Actually setLoading(false) is fine because modal will show up
        // Wait, if 409, we did set loading false manually above.
        setLoading(false)
      }
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
                  {step === 1 ? 'Welcome!' : step === 2 ? 'Secure Account' : step === 3 ? 'Verify Email' : 'Find your Squad'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {step === 1 ? 'Let\'s get started with your name.' : step === 2 ? 'Create a login to save your stats.' : step === 3 ? 'Enter the code we sent to your email.' : 'Create or join a group.'}
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

                {/* Step 3: Verification */}
                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-500">
                        <Mail className="w-8 h-8" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 pl-1">
                        Verification Code
                      </label>
                      <Input
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.trim())}
                        placeholder="Enter 6-digit code"
                        className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 transition-all text-center text-2xl tracking-widest"
                        maxLength={6}
                      />
                    </div>

                    {/* Development Mode Helper */}
                    {process.env.NODE_ENV !== 'production' && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium mb-2">🛠️ Dev Mode</p>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/auth/test-get-code', { credentials: 'include' })
                              const data = await res.json()
                              if (data.verificationCode) {
                                setVerificationCode(data.verificationCode)
                                toast.success('Code auto-filled!')
                              } else {
                                toast.error('No code found')
                              }
                            } catch (e) {
                              toast.error('Failed to get code')
                            }
                          }}
                          className="w-full text-sm bg-yellow-100 dark:bg-yellow-800/50 hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-800 dark:text-yellow-200 py-2 px-3 rounded-lg transition-colors"
                        >
                          Auto-fill verification code
                        </button>
                      </div>
                    )}

                    {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>}

                    <Button
                      onClick={handleVerifyCode}
                      disabled={verifying || verificationCode.length < 6}
                      className="w-full h-14 text-lg rounded-2xl font-semibold shadow-lg shadow-primary/20"
                    >
                      {verifying ? 'Verifying...' : 'Verify Email'}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCooldown > 0 || loading}
                        className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resendCooldown > 0
                          ? `Resend available in ${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60).toString().padStart(2, '0')}`
                          : loading ? 'Sending...' : 'Resend verification code'
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Group Selection */}
                {step === 4 && !groupAction && (
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

                    <button
                      onClick={() => router.push('/dashboard')}
                      className="w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pt-4"
                    >
                      Skip for now
                    </button>
                  </div>
                )}

                {step === 4 && groupAction === 'create' && (
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

                {step === 4 && groupAction === 'join' && (
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

          {/* MIGRATION MODAL OVERLAY */}
          {showMigrationModal && (
            <div className="absolute inset-0 z-50 bg-white dark:bg-gray-800 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">Existing Data Found</h2>
              <p className="text-gray-500 text-center mb-8">
                You have checks-ins that were made while not in a group. What would you like to do?
              </p>

              <div className="w-full space-y-4">
                <Button
                  onClick={() => handleMigrationChoice('merge')}
                  className="w-full h-16 rounded-2xl flex items-center justify-between px-6 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-800"
                  variant="ghost"
                  disabled={loading}
                >
                  <span className="flex items-center gap-3 font-semibold">
                    <ArrowRightLeft className="w-5 h-5" />
                    Take over data
                  </span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-400">Or</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleMigrationChoice('delete')}
                  className="w-full h-16 rounded-2xl flex items-center justify-between px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:hover:bg-gray-700 dark:text-gray-300 border-2 border-dashed border-gray-200 dark:border-gray-700"
                  variant="ghost"
                  disabled={loading}
                >
                  <span className="flex items-center gap-3 font-semibold">
                    <Download className="w-5 h-5" />
                    Download & Delete
                  </span>
                </Button>

                <Button variant="ghost" onClick={() => setShowMigrationModal(false)} className="w-full text-gray-400">
                  Cancel
                </Button>
              </div>
            </div>
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
