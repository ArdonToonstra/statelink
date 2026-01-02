import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateInviteCode } from '@/lib/utils'
import { getAuthenticatedUser } from '@/lib/auth'

export async function POST(request: Request) {
  // Get authenticated user from JWT token
  const authenticatedUser = await getAuthenticatedUser()
  
  if (!authenticatedUser) {
    return NextResponse.json(
      { error: 'Unauthorized - Please log in' },
      { status: 401 }
    )
  }

  const payload = await getPayload({ config })
  const userId = authenticatedUser.id

  try {
    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Generate unique invite code with retry limit
    let inviteCode = generateInviteCode(8)
    let isUnique = false
    let retryCount = 0
    const maxRetries = 10
    
    // Ensure uniqueness with retry limit to prevent infinite loops
    while (!isUnique && retryCount < maxRetries) {
      const existing = await payload.find({
        collection: 'groups',
        where: {
          inviteCode: {
            equals: inviteCode,
          },
        },
      })
      
      if (existing.docs.length === 0) {
        isUnique = true
      } else {
        inviteCode = generateInviteCode(8)
        retryCount++
      }
    }
    
    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique invite code. Please try again.' },
        { status: 500 }
      )
    }

    // Create the group
    const group = await payload.create({
      collection: 'groups',
      data: {
        name,
        inviteCode,
        inviteCodeCreated: new Date().toISOString(),
        createdBy: userId,
        frequency: 2,
        intervalMode: 'random',
      },
    })

    // Update user's groupID
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        groupID: group.id,
      },
    })

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
      },
    })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    )
  }
}
