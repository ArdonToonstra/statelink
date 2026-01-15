import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/better-auth'
import { Pool } from 'pg'

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

        // Query Better Auth's verification table directly
        const pool = new Pool({
            connectionString: process.env.DATABASE_URI,
        })

        try {
            // Better Auth stores verifications in a 'verification' table
            // The identifier includes a prefix like 'email-verification-otp-' + email
            // The value includes a counter suffix like ':0'
            const result = await pool.query(
                `SELECT value, "expiresAt" FROM verification 
                 WHERE identifier LIKE $1 
                 ORDER BY "createdAt" DESC 
                 LIMIT 1`,
                [`%${userEmail}`]
            )

            if (result.rows.length === 0) {
                return NextResponse.json({ 
                    error: 'No verification code', 
                    debug: 'No verification record found for user',
                    isVerified 
                }, { status: 404 })
            }

            const verification = result.rows[0]
            // Extract OTP code from value (format is "code:counter")
            const otpCode = verification.value.split(':')[0]
            
            return NextResponse.json({
                verificationCode: otpCode,
                expiresAt: verification.expiresAt,
            })
        } finally {
            await pool.end()
        }
    } catch (error) {
        console.error('[TEST-GET-CODE] Error getting verification code:', error)
        return NextResponse.json({ error: 'Failed to get code', details: String(error) }, { status: 500 })
    }
}

