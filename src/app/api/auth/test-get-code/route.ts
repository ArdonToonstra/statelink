import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/better-auth'
import { db } from '@/db'
import { verifications } from '@/db/schema'
import { desc, like } from 'drizzle-orm'

// This endpoint is for TESTING/DEVELOPMENT ONLY
// It is disabled in production
export async function GET() {
    // Only allow in development/test environment
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        const headersList = await headers()
        
        // Get session from Better Auth
        const session = await auth.api.getSession({
            headers: headersList,
        })

        if (!session?.user) {
            console.log('[TEST-GET-CODE] No authenticated user found')
            return NextResponse.json({ error: 'Unauthorized', debug: 'No user in session' }, { status: 401 })
        }

        const userEmail = session.user.email
        const isVerified = session.user.emailVerified

        console.log('[TEST-GET-CODE] User authenticated:', session.user.id, 'Email:', userEmail, 'Is verified:', isVerified)

        // Query Better Auth's verification table using Drizzle
        // The identifier includes a prefix like 'email-verification-otp-' + email
        // The value includes a counter suffix like ':0'
        const result = await db
            .select({ value: verifications.value, expiresAt: verifications.expiresAt })
            .from(verifications)
            .where(like(verifications.identifier, `%${userEmail}`))
            .orderBy(desc(verifications.createdAt))
            .limit(1)

        if (result.length === 0) {
            return NextResponse.json({ 
                error: 'No verification code', 
                debug: 'No verification record found for user',
                isVerified 
            }, { status: 404 })
        }

        const verification = result[0]
        // Extract OTP code from value (format is "code:counter")
        const otpCode = verification.value.split(':')[0]
        
        return NextResponse.json({
            verificationCode: otpCode,
            expiresAt: verification.expiresAt,
        })
    } catch (error) {
        console.error('[TEST-GET-CODE] Error getting verification code:', error)
        return NextResponse.json({ error: 'Failed to get code', details: String(error) }, { status: 500 })
    }
}

