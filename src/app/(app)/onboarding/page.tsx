'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Zap, ArrowLeft, Users, Plus, ArrowRight, Download, Trash2, ArrowRightLeft, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { authClient, emailOtp } from '@/lib/auth-client'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // tRPC mutations
  const createGroupMutation = trpc.groups.create.useMutation()
  const joinGroupMutation = trpc.groups.join.useMutation()
  const dashboardQuery = trpc.dashboard.getData.useQuery(undefined, {
    enabled: false, // Only fetch when explicitly called
    retry: false,
  })

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

        // No need to sync to Payload anymore - Better Auth uses our unified user table via Drizzle

        setError('')

        // Check if verification is enabled
        const isVerificationEnabled = process.env.NEXT_PUBLIC_IS_VERIFICATION_ENABLED === 'true'

        if (isVerificationEnabled) {
          // Send verification OTP via Better Auth
          try {
            await emailOtp.sendVerificationOtp({
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
        // Use Better Auth session check instead of dashboard API
        const session = await authClient.getSession()
        if (session?.data?.user) {
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
      const result = await emailOtp.verifyEmail({
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
      const result = await emailOtp.sendVerificationOtp({
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
      await createGroupMutation.mutateAsync({ name: groupName })
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

    // With multi-group support, migration is no longer needed
    // Users can simply join groups and their check-ins are visible via membership

    try {
      await joinGroupMutation.mutateAsync({ inviteCode })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
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
      await joinGroupMutation.mutateAsync({ inviteCode })
      router.push('/dashboard')
    } catch (err: any) {
      // Check if it's a conflict requiring migration choice
      if (err.data?.code === 'CONFLICT') {
        setShowMigrationModal(true)
        setLoading(false)
        return
      }
      setError(err.message || 'An error occurred')
    } finally {
      if (!showMigrationModal) {
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
              <span className="font-bold text-gray-900 dark:text-white tracking-tight">GroupVibes</span>
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
                    <Link href="/forgot-password" className="text-xs text-primary cursor-pointer hover:underline">Forgot?</Link>
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

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })}
                disabled={loading}
                className="w-full h-14 text-lg rounded-2xl font-semibold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
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

                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/onboarding?step=4' })}
                      className="w-full h-14 text-lg rounded-2xl font-semibold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Sign up with Google
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
