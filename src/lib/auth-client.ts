import { createAuthClient } from 'better-auth/react'
import { emailOTPClient } from 'better-auth/client/plugins'
import type { auth } from './better-auth'

export const authClient = createAuthClient<typeof auth>({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  plugins: [
    emailOTPClient(),
  ],
})

// Export commonly used methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  emailOtp,
} = authClient
