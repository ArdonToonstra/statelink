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

test.describe('Groups', () => {
    test.beforeEach(async ({ page }) => {
        const uniqueId = Date.now();
        const email = `group${uniqueId}@example.com`;
        const password = 'Password123';

        await page.goto('/onboarding');
        await expect(page.getByPlaceholder('e.g. Alice')).toBeVisible();
        await page.getByPlaceholder('e.g. Alice').fill(`User ${uniqueId}`);
        await page.getByRole('button', { name: 'Next Step' }).click();

        await expect(page.getByText('Secure Account')).toBeVisible();
        await page.getByPlaceholder('you@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Group Selection - wait with longer timeout
        await expect(page.getByText('Find your Squad')).toBeVisible({ timeout: 15000 });
    });

    test('Create group and invite someone', async ({ page }) => {
        await page.locator('button:has-text("Create Group")').first().click();

        const groupNameInput = page.getByPlaceholder('e.g. The Avengers');
        await expect(groupNameInput).toBeVisible();
        await groupNameInput.fill('Test Group');
        await page.getByRole('button', { name: 'Create Group' }).click();

        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
        await expect(page.getByText('Test Group')).toBeVisible();

        // Go to settings > Group
        await page.goto('/settings?tab=group');
        await expect(page.getByRole('heading', { name: 'Group Details' })).toBeVisible();

        // Check invite code exists
        const inviteCodeElement = page.locator('.font-mono').first();
        await expect(inviteCodeElement).toBeVisible();
        const code = await inviteCodeElement.textContent();
        expect(code?.length).toBeGreaterThan(0);
    });

    test('Regenerate invite code', async ({ page }) => {
        // Create Group first
        await page.locator('button:has-text("Create Group")').first().click();
        await expect(page.getByPlaceholder('e.g. The Avengers')).toBeVisible();
        await page.getByPlaceholder('e.g. The Avengers').fill('Regen Group');
        await page.getByRole('button', { name: 'Create Group' }).click();
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

        await page.goto('/settings?tab=group');
        await expect(page.getByRole('heading', { name: 'Group Details' })).toBeVisible();

        const inviteCodeElement = page.locator('.font-mono').first();
        await expect(inviteCodeElement).toBeVisible();
        const param1 = await inviteCodeElement.textContent();

        const regenBtn = page.getByTitle('Regenerate Invite Code');
        await expect(regenBtn).toBeVisible();
        await regenBtn.click();

        await expect(page.getByText('Confirm')).toBeVisible();
        await page.getByText('Confirm').click();

        // Wait for regeneration - code should change
        await expect(inviteCodeElement).not.toHaveText(param1 || '', { timeout: 10000 });
    });
});
