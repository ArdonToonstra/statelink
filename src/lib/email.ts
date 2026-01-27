import Mailjet from 'node-mailjet'

// Check if valid API keys exist
const hasValidKeys = process.env.MAILJET_API_KEY && 
                    process.env.MAILJET_SECRET_KEY &&
                    process.env.MAILJET_API_KEY.length > 10 &&
                    process.env.MAILJET_SECRET_KEY.length > 10

// Only initialize Mailjet if we have valid keys
const mailjet = hasValidKeys 
    ? Mailjet.apiConnect(
        process.env.MAILJET_API_KEY!,
        process.env.MAILJET_SECRET_KEY!
    )
    : null

type SendVerificationEmailProps = {
    to: string
    code: string
}

export async function sendVerificationEmail({ to, code }: SendVerificationEmailProps) {
    // Skip sending in dev/test mode if API keys are not properly configured
    if (process.env.NODE_ENV !== 'production' && !hasValidKeys) {
        console.log('[EMAIL] Dev mode - Skipping email send to:', to, 'Code:', code)
        return { success: true, devMode: true }
    }

    if (!mailjet) {
        throw new Error('Email service not configured - missing API keys')
    }

    console.log('[EMAIL] Sending verification email to:', to)
    try {
        const request = mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: 'noreply@groupvibes.nl',
                        Name: 'GroupVibes',
                    },
                    To: [
                        {
                            Email: to,
                        },
                    ],
                    Subject: 'Your Verification Code',
                    TextPart: `Your verification code is: ${code}. It expires in 30 minutes.`,
                    HTMLPart: `
            <h3>Welcome to GroupVibes!</h3>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>This code will expire in 30 minutes.</p>
          `,
                },
            ],
        })

        const result = await request
        return result.body
    } catch (error) {
        console.error('Error sending email:', error)
        throw new Error('Failed to send verification email')
    }
}

type SendPasswordResetEmailProps = {
    to: string
    resetUrl: string
}

export async function sendPasswordResetEmail({ to, resetUrl }: SendPasswordResetEmailProps) {
    // Skip sending in dev/test mode if API keys are not properly configured
    if (process.env.NODE_ENV !== 'production' && !hasValidKeys) {
        console.log('[EMAIL] Dev mode - Skipping password reset email to:', to, 'URL:', resetUrl)
        return { success: true, devMode: true }
    }

    if (!mailjet) {
        throw new Error('Email service not configured - missing API keys')
    }

    console.log('[EMAIL] Sending password reset email to:', to)
    try {
        const request = mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: 'noreply@groupvibes.nl',
                        Name: 'GroupVibes',
                    },
                    To: [
                        {
                            Email: to,
                        },
                    ],
                    Subject: 'Reset Your Password',
                    TextPart: `You requested a password reset for your GroupVibes account. Click this link to reset your password: ${resetUrl}. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
                    HTMLPart: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Reset Your Password</h2>
                <p>You requested a password reset for your GroupVibes account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="margin: 24px 0;">
                    <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
          `,
                },
            ],
        })

        const result = await request
        return result.body
    } catch (error) {
        console.error('Error sending password reset email:', error)
        throw new Error('Failed to send password reset email')
    }
}

type SendEmailChangeVerificationProps = {
    to: string
    code: string
    isNewEmail: boolean
}

export async function sendEmailChangeVerification({ to, code, isNewEmail }: SendEmailChangeVerificationProps) {
    // Skip sending in dev/test mode if API keys are not properly configured
    if (process.env.NODE_ENV !== 'production' && !hasValidKeys) {
        console.log('[EMAIL] Dev mode - Skipping email change verification to:', to, 'Code:', code)
        return { success: true, devMode: true }
    }

    if (!mailjet) {
        throw new Error('Email service not configured - missing API keys')
    }

    console.log('[EMAIL] Sending email change verification to:', to)
    try {
        const subject = isNewEmail ? 'Verify Your New Email Address' : 'Email Change Request'
        const heading = isNewEmail ? 'Verify Your New Email Address' : 'Email Change Request'
        const description = isNewEmail 
            ? 'Please verify this email address to complete the change.'
            : 'Someone requested to change the email address for your GroupVibes account.'

        const request = mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: 'noreply@groupvibes.nl',
                        Name: 'GroupVibes',
                    },
                    To: [
                        {
                            Email: to,
                        },
                    ],
                    Subject: subject,
                    TextPart: `${description} Your verification code is: ${code}. It expires in 30 minutes.`,
                    HTMLPart: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">${heading}</h2>
                <p>${description}</p>
                <p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 2px;">${code}</strong></p>
                <p style="color: #666; font-size: 14px;">This code will expire in 30 minutes.</p>
                ${!isNewEmail ? '<p style="color: #666; font-size: 14px;">If you didn\'t request this change, please secure your account immediately.</p>' : ''}
            </div>
          `,
                },
            ],
        })

        const result = await request
        return result.body
    } catch (error) {
        console.error('Error sending email change verification:', error)
        throw new Error('Failed to send email change verification')
    }
}
