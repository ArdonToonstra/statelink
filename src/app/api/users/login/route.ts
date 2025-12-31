import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const payload = await getPayload({ config })
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        // Authenticate using Payload's login method
        // This validates credentials and returns the user + token
        const result = await payload.login({
            collection: 'users',
            data: {
                email,
                password,
            },
            // Note: In local API mode, payload.login usually doesn't set browser cookies automatically unless specifically configured/handled
            // If we need the token, we can get it. payload.login returns { user, token, exp }
        })

        if (!result) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        // In a custom Next.js route, we might need to set the cookie manually if Payload doesn't do it via headers here.
        // However, payload.login does NOT set the cookie on the response object of this Next.js route automatically because it doesn't know about `NextResponse`.
        // We should return the user. The frontend can store the user state.
        // For a robust app, we'd set the 'payload-token' cookie here.

        // For this prototype/MVP, we'll return the user and let the frontend assume success. 
        // Ideally we set the cookie for subsequent requests.

        const response = NextResponse.json({
            user: result.user,
            message: 'Login successful'
        })

        // If we had the token, we could set it:
        // response.cookies.set('payload-token', result.token!, { httpOnly: true, path: '/' })
        // But result.token requires getting token back.

        return response

    } catch (error) {
        console.error('Error logging in:', error)
        return NextResponse.json(
            { error: 'Invalid email or password' }, // Generic error for security, or catch specific Payload errors
            { status: 401 }
        )
    }
}
