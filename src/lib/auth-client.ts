import { createAuthClient } from 'better-auth/react'
import { emailOTPClient } from 'better-auth/client/plugins'

// Auto-detect base URL - use env var, or derive from window location in browser
const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
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
