import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import * as schema from '@/db/schema'
import { sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeVerification } from '@/lib/email'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  // Social OAuth providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Only map name from Google, skip profile picture
      mapProfileToUser: (profile) => ({
        name: profile.name,
        displayName: profile.name,
        // Explicitly don't include image/picture
      }),
    },
  },
  
  // Use email/password authentication
  emailAndPassword: {
    enabled: true,
    // We'll handle password validation in the frontend
    minPasswordLength: 8,
    // Auto sign-in after signup (we handle verification separately)
    autoSignIn: true,
    // Forgot password configuration
    sendResetPassword: async ({ user, url }) => {
      console.log(`[BETTER-AUTH] Sending password reset email to ${user.email}`)
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl: url,
      })
    },
  },

  // Email verification settings
  emailVerification: {
    sendOnSignUp: process.env.NEXT_PUBLIC_IS_VERIFICATION_ENABLED === 'true',
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // For email change verification, we use OTP instead
      console.log(`[BETTER-AUTH] Sending email verification to ${user.email}`)
      // Extract token from URL for OTP-style verification
      const token = new URL(url).searchParams.get('token') || ''
      await sendVerificationEmail({
        to: user.email,
        code: token.substring(0, 6).toUpperCase(), // Use first 6 chars as display code
      })
    },
  },

  // User fields - changeEmail configuration
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, url }) => {
        console.log(`[BETTER-AUTH] Sending email change verification to ${newEmail}`)
        // Extract verification code/token from URL
        const token = new URL(url).searchParams.get('token') || ''
        const code = token.substring(0, 6).toUpperCase()
        
        // Send to new email
        await sendEmailChangeVerification({
          to: newEmail,
          code: code,
          isNewEmail: true,
        })
      },
    },
    additionalFields: {
      displayName: {
        type: 'string',
        required: true,
      },
      groupId: {
        type: 'string',
        required: false,
      },
    },
  },

  // Session configuration with extended expiry for PWA
  session: {
    // 30 days session expiry
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    // Refresh session if older than 1 day
    updateAge: 60 * 60 * 24, // 1 day in seconds
    // Use cookie-based JWT sessions with extended cache for PWA offline support
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days to match session expiry
    },
  },

  // Plugins
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        console.log(`[BETTER-AUTH] Sending ${type} OTP to ${email}: ${otp}`)
        
        // Use existing email service
        await sendVerificationEmail({
          to: email,
          code: otp,
        })
      },
      otpLength: 6,
      expiresIn: 30 * 60, // 30 minutes (matches existing behavior)
      // For testing - store code in DB so we can query it
      sendVerificationOnSignUp: process.env.NEXT_PUBLIC_IS_VERIFICATION_ENABLED === 'true',
    }),
  ],

  // Trust host for Next.js - include all possible origins
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://groupvibes.nl',
    'https://www.groupvibes.nl',
    'https://groupvibes.vercel.app',
    'http://localhost:3000',
  ],
})

// Export type for client
export type Auth = typeof auth
