import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { displayName, email, password } = await request.json()

    if (!displayName || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if user with email already exists (Payload create might throw, so we can try/catch wrapper or check first)
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
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create new user with provided credentials
    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        displayName,
        themeColor: '#3B82F6', // Default blue, changable in settings
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    )
  }
}
