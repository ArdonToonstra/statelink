import { test, expect } from '@playwright/test';

// Helper function to get verification code from test endpoint
async function getVerificationCode(page: any): Promise<string | null> {
    try {
        const response = await page.request.get('/api/auth/test-get-code');
        const data = await response.json();
        return data.verificationCode || null;
    } catch {
        return null;
    }
}

// Helper function to check if verification step appears and handle it
async function handleVerificationStepIfNeeded(page: any) {
    // Wait for either verification page or group selection page to appear
    try {
        await Promise.race([
            page.waitForSelector('text=Verify Email', { timeout: 10000 }),
            page.waitForSelector('text=Find your Squad', { timeout: 10000 }),
        ]);
    } catch (e) {
        return;
    }

    const verifyEmailVisible = await page.getByText('Verify Email').first().isVisible().catch(() => false);

    if (verifyEmailVisible) {
        // Use dev mode auto-fill button
        const autoFillButton = page.getByRole('button', { name: 'Auto-fill verification code' });
        const autoFillVisible = await autoFillButton.isVisible().catch(() => false);

        if (autoFillVisible) {
            await autoFillButton.click();
            await page.waitForTimeout(1500);
            
            const codeInput = page.getByPlaceholder('Enter 6-digit code');
            const codeValue = await codeInput.inputValue();
            
            if (!codeValue || codeValue.length < 6) {
                const code = await getVerificationCode(page);
                if (code) {
                    await codeInput.fill(code);
                    await page.waitForTimeout(500);
                } else {
                    return;
                }
            }
        } else {
            const code = await getVerificationCode(page);
            if (code) {
                await page.getByPlaceholder('Enter 6-digit code').fill(code);
                await page.waitForTimeout(500);
            } else {
                return;
            }
        }

        const verifyButton = page.getByRole('button', { name: 'Verify Email' });
        await verifyButton.waitFor({ state: 'visible', timeout: 5000 });
        await verifyButton.click();
        await page.waitForTimeout(1000);
    }
}

test.describe('Data Export', () => {
    test('should include check-ins in the downloaded data', async ({ page, request }) => {
        // 1. Sign up a new user
        const timestamp = Date.now();
        const email = `export_${timestamp}@example.com`;
        const password = 'Password123!';
        const name = 'Export User';

        await page.goto('/onboarding');
        await page.fill('input[placeholder="e.g. Alice"]', name);
        await page.click('button:has-text("Next Step")');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button:has-text("Continue")');

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Skip group creation, go to dashboard
        await page.click('text="Skip for now"');
        await expect(page.locator('text="No Group"')).toBeVisible();

        // 2. Perform a Check-in
        console.log('Navigating to check-in page...');
        await page.goto('/check-in');

        // Wait for page load
        await page.waitForTimeout(1000); // Small stability buffer

        console.log('Navigated to check-in page');
        await page.waitForURL('**/check-in');

        // Select Vibe
        console.log('Selecting vibe...');
        await page.click('button:has-text("good")');
        // Select Activity
        console.log('Selecting activity...');
        await page.click('button:has-text("sleep early")');
        // Submit
        console.log('Submitting...');
        await page.click('button:has-text("Save Vibe Check")');

        await page.waitForURL('**/dashboard');

        // 3. Go to Settings and trigger API call directly to inspect response
        // We can't easily intercept the blob download in this way, 
        // so let's fetch the API directly as the authenticated user.

        const response = await request.get('http://localhost:3000/api/settings');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        const fs = require('fs');
        fs.writeFileSync('debug_response.json', JSON.stringify(data, null, 2));

        // Verify User Data
        expect(data.user).toBeDefined();
        expect(data.user.email).toBe(email);

        // Verify Check-ins key exists and has items
        expect(data.checkins).toBeDefined();
        expect(Array.isArray(data.checkins)).toBeTruthy();
        expect(data.checkins.length).toBeGreaterThan(0);

        const checkin = data.checkins[0];
        expect(checkin.vibeScore).toBeDefined();
        // We selected "good", which maps to a score (e.g. 8)
    });
});
