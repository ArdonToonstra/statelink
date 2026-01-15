import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/better-auth'
import { headers } from 'next/headers'

/**
 * Sync a Better Auth user to Payload CMS
 * This creates a corresponding Payload user for app data (groupID, etc.)
 */
export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const headersList = await headers()
    
    // Verify the user is authenticated with Better Auth
    const session = await auth.api.getSession({
      headers: headersList,
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { email, displayName, betterAuthId } = await request.json()

    // Verify the email matches the authenticated user
    if (session.user.email !== email) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 403 }
      )
    }

    // Check if Payload user already exists
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email,
        },
      },
      limit: 1,
    })

    if (existingUsers.docs.length > 0) {
      // User exists, update if needed
      const existingUser = existingUsers.docs[0]
      
      // Only update if displayName is different
      if (existingUser.displayName !== displayName) {
        await payload.update({
          collection: 'users',
          id: existingUser.id,
          data: {
            displayName,
          },
        })
      }

      return NextResponse.json({
        success: true,
        user: { id: existingUser.id },
        action: 'updated',
      })
    }

    // Create new Payload user
    // Use a random password since auth is handled by Better Auth
    const randomPassword = crypto.randomUUID() + 'Aa1!'
    
    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password: randomPassword,
        displayName,
        isVerified: session.user.emailVerified || false,
      },
    })

    return NextResponse.json({
      success: true,
      user: { id: user.id },
      action: 'created',
    })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
