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
                        Email: 'ardontoonstra@hotmail.com',
                        Name: 'StateLink',
                    },
                    To: [
                        {
                            Email: to,
                        },
                    ],
                    Subject: 'Your Verification Code',
                    TextPart: `Your verification code is: ${code}. It expires in 30 minutes.`,
                    HTMLPart: `
            <h3>Welcome to StateLink!</h3>
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
