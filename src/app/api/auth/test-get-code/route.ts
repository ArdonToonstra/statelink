import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// This endpoint is for TESTING/DEVELOPMENT ONLY
// It is disabled in production
export async function GET() {
    // Only allow in development/test environment
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        const payload = await getPayload({ config })
        const headersList = await headers()
        const { user } = await payload.auth({ headers: headersList })

        if (!user) {
            console.log('[TEST-GET-CODE] No authenticated user found')
            console.log('[TEST-GET-CODE] Headers:', Object.fromEntries(headersList.entries()))
            return NextResponse.json({ error: 'Unauthorized', debug: 'No user in session' }, { status: 401 })
        }

        // Fetch full user data including hidden fields
        const fullUser = await payload.findByID({
            collection: 'users',
            id: user.id,
        })

        console.log('[TEST-GET-CODE] User authenticated:', user.id, 'Code:', fullUser.verificationCode, 'Is verified:', fullUser.isVerified)

        if (!fullUser.verificationCode) {
            return NextResponse.json({ 
                error: 'No verification code', 
                debug: 'User has no verification code set',
                isVerified: fullUser.isVerified 
            }, { status: 404 })
        }

        return NextResponse.json({
            verificationCode: fullUser.verificationCode,
            expiresAt: fullUser.verificationCodeExpiresAt,
        })
    } catch (error) {
        console.error('[TEST-GET-CODE] Error getting verification code:', error)
        return NextResponse.json({ error: 'Failed to get code', details: String(error) }, { status: 500 })
    }
}

