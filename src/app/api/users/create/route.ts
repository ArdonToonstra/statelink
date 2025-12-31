import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { displayName, themeColor } = await request.json()

    if (!displayName) {
      return NextResponse.json(
        { error: 'displayName is required' },
        { status: 400 }
      )
    }

    // Generate a unique email for the user (since Payload auth requires email)
    // We use a random suffix to ensure uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const email = `user-${randomSuffix}@statelink.local`
    const password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // Use provided theme color or default blue
    const finalThemeColor = themeColor || '#3B82F6'

    // Create the user with Payload's create method
    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        displayName,
        themeColor: finalThemeColor,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        themeColor: user.themeColor,
      },
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
