import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies, headers } from 'next/headers'
import { auth } from '@/lib/better-auth'

export interface AuthenticatedUser {
  id: number
  email: string
  displayName: string | null
  groupID: number | null
  isVerified: boolean
  betterAuthId: string
}

/**
 * Get authenticated user from Better Auth session
 * Returns a user object compatible with the existing API
 * Automatically syncs Better Auth user to Payload if not exists
 * @returns User object if authenticated, null otherwise
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const headersList = await headers()
    
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: headersList,
    })

    if (!session?.user) {
      console.log('No Better Auth session found')
      return null
    }

    const betterAuthUser = session.user
    
    // Get the corresponding Payload user for app data (groupID, etc.)
    // Better Auth user ID is stored, and we look up by email
    const payload = await getPayload({ config })
    
    let payloadUsers = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: betterAuthUser.email,
        },
      },
      limit: 1,
    })

    // If no Payload user exists, auto-sync from Better Auth
    if (payloadUsers.docs.length === 0) {
      const randomPassword = Math.random().toString(36).slice(-16) + 'Aa1!'
      const newPayloadUser = await payload.create({
        collection: 'users',
        data: {
          email: betterAuthUser.email,
          password: randomPassword,
          displayName: (betterAuthUser as any).displayName || betterAuthUser.name || betterAuthUser.email.split('@')[0],
          isVerified: betterAuthUser.emailVerified || false,
        },
      })
      payloadUsers = { docs: [newPayloadUser], totalDocs: 1, limit: 1, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null }
    }

    const payloadUser = payloadUsers.docs[0]
    // Return a merged user object with Payload ID for relationships
    return {
      id: payloadUser.id, // Use Payload user ID for relationships
      email: betterAuthUser.email,
      displayName: (betterAuthUser as any).displayName || payloadUser.displayName,
      groupID: typeof payloadUser.groupID === 'object' ? payloadUser.groupID?.id ?? null : payloadUser.groupID ?? null,
      isVerified: betterAuthUser.emailVerified || payloadUser.isVerified || false,
      betterAuthId: betterAuthUser.id,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

/**
 * Require authentication - throws error if not authenticated
 * @returns Authenticated user
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}
