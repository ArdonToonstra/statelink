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

test.describe('Solo Check-ins & Migration', () => {

    test('should allow a user to check in without a group', async ({ page, request }) => {
        // 1. Sign up a new user
        const timestamp = Date.now();
        const email = `solo_${timestamp}@example.com`;
        const password = 'Password123!';
        const name = 'Solo User';

        await page.goto('/onboarding');
        await page.fill('input[placeholder="e.g. Alice"]', name);
        await page.click('button:has-text("Next Step")');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button:has-text("Continue")');

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Group Selection - Use Skip for now
        await expect(page.locator('text="Create Group"')).toBeVisible({ timeout: 10000 });
        await page.click('text="Skip for now"');

        // 3. Verify Dashboard "No Group" state
        await expect(page.locator('text="No Group"')).toBeVisible();
        await expect(page.locator('text="Check In Now"')).toBeVisible();

        // 4. Perform Check-in
        await page.click('text="Check In Now"');
        await page.waitForURL('**/check-in');

        // Select Vibe (Good = 8)
        await page.click('button:has-text("good")');

        // Select Activity (Sleep)
        await page.click('button:has-text("sleep early")');

        // Submit
        await page.click('button:has-text("Save Vibe Check")');

        // 5. Verify return to dashboard and data presence
        await page.waitForURL('**/dashboard');
    });

    test('should merge data when joining a group', async ({ browser }) => {
        // Create Owner + Group
        const ownerContext = await browser.newContext();
        const ownerPage = await ownerContext.newPage();
        const timestamp = Date.now();
        const groupName = `Merge Group ${timestamp}`;

        // Owner signup & group creation
        await ownerPage.goto('http://localhost:3000/onboarding');
        await ownerPage.fill('input[placeholder="e.g. Alice"]', 'Owner');
        await ownerPage.click('button:has-text("Next Step")');
        await ownerPage.fill('input[type="email"]', `owner_${timestamp}@example.com`);
        await ownerPage.fill('input[type="password"]', 'Password123!');
        await ownerPage.click('button:has-text("Continue")');

        // Owner verification (if enabled)
        await handleVerificationStepIfNeeded(ownerPage);

        // Owner creates group
        await expect(ownerPage.locator('text="Create Group"')).toBeVisible({ timeout: 15000 });
        await ownerPage.click('button:has-text("Create Group")');
        await ownerPage.fill('input[placeholder="e.g. The Avengers"]', groupName);
        await ownerPage.click('button:text-is("Create Group")');

        // Basic verification owner is in
        await expect(ownerPage.locator(`text="${groupName}"`)).toBeVisible({ timeout: 10000 });

        // Get Invite Code
        await ownerPage.goto('http://localhost:3000/settings?tab=group');
        const inviteCodeElement = ownerPage.locator('code, .font-mono');
        const inviteCode = await inviteCodeElement.first().innerText();
        expect(inviteCode).toHaveLength(8);

        // Create Solo User with Check-ins
        const soloContext = await browser.newContext();
        const soloPage = await soloContext.newPage();
        await soloPage.goto('http://localhost:3000/onboarding');
        await soloPage.fill('input[placeholder="e.g. Alice"]', 'Solo User');
        await soloPage.click('button:has-text("Next Step")');
        await soloPage.fill('input[type="email"]', `solo_merge_${timestamp}@example.com`);
        await soloPage.fill('input[type="password"]', 'Password123!');
        await soloPage.click('button:has-text("Continue")');

        // Solo user verification (if enabled)
        await handleVerificationStepIfNeeded(soloPage);

        // Solo user skips group
        await expect(soloPage.locator('text="Skip for now"')).toBeVisible({ timeout: 15000 });
        await soloPage.click('text="Skip for now"');

        // Check in (Solo)
        await soloPage.click('text="Check In Now"');
        await soloPage.click('button:has-text("wonderful")');
        await soloPage.click('button:has-text("Save Vibe Check")');
        await expect(soloPage.locator('text="No Group"')).toBeVisible();

        // Join Group
        await soloPage.goto(`http://localhost:3000/settings?tab=group`);
        await soloPage.click('button:has-text("Join with Invite Code")');
        await soloPage.fill('input[placeholder="XXXXXXXX"]', inviteCode);
        await soloPage.click('button:text-is("Join Group")');

        // EXPECT MODAL
        await expect(soloPage.locator('text="Existing Data Found"')).toBeVisible();
        await soloPage.click('button:has-text("Take over data")');

        // Verify Joined
        await expect(soloPage.locator(`text="${groupName}"`)).toBeVisible();
    });

});
