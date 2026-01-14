import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
    },
    // Ensure email verification is enabled for tests
    // The test-get-code endpoint will provide codes without sending emails
    // Empty MAILJET keys ensure no actual emails are sent
    env: {
        NEXT_PUBLIC_IS_VERIFICATION_ENABLED: 'true',
        MAILJET_API_KEY: '',
        MAILJET_SECRET_KEY: '',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },

    ],
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        env: {
            // Enable email verification but skip sending emails in test mode
            NEXT_PUBLIC_IS_VERIFICATION_ENABLED: 'true',
            MAILJET_API_KEY: '',
            MAILJET_SECRET_KEY: '',
            NODE_ENV: 'development',
        },
    },
});
