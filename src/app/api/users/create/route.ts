import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/email'

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

    // Check if user with email already exists
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

    // Check if email verification is enabled
    const isVerificationEnabled = process.env.NEXT_PUBLIC_IS_VERIFICATION_ENABLED === 'true'

    // Generate verification code only if verification is enabled
    const verificationCode = isVerificationEnabled
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : null
    const verificationCodeExpiresAt = isVerificationEnabled
      ? new Date(Date.now() + 30 * 60 * 1000) // 30 mins
      : null

    console.log('[CREATE-USER] Verification enabled:', isVerificationEnabled)
    console.log('[CREATE-USER] Generated code:', verificationCode)

    // Create new user with provided credentials
    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        displayName,
        verificationCode,
        verificationCodeExpiresAt: verificationCodeExpiresAt?.toISOString() ?? null,
        lastVerificationEmailSentAt: isVerificationEnabled ? new Date().toISOString() : null,
        isVerified: !isVerificationEnabled, // Auto-verify if verification is disabled
      },
    })

    console.log('[CREATE-USER] User created with ID:', user.id)
    console.log('[CREATE-USER] User verificationCode field:', (user as any).verificationCode)

    // Log the user in automatically after creation
    const loginResult = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    // Send verification email only if verification is enabled
    if (isVerificationEnabled && verificationCode) {
      sendVerificationEmail({ to: email, code: verificationCode }).catch((err) => {
        console.error('Failed to send verification email:', err)
      })
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    })

    // Set the JWT token in an HTTP-only cookie
    if (loginResult?.token) {
      // Calculate maxAge from expiration timestamp
      const maxAge = loginResult.exp
        ? loginResult.exp - Math.floor(Date.now() / 1000)
        : 7200 // Default to 2 hours

      response.cookies.set('payload-token', loginResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAge > 0 ? maxAge : 7200,
      })
    }

    return response
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    )
  }
}

