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

test.describe('Authentication', () => {
    test('User can sign up and reach dashboard', async ({ page }) => {
        const uniqueId = Date.now();
        const email = `user${uniqueId}@example.com`;
        const password = 'Password123';
        const displayName = `User ${uniqueId}`;

        await page.goto('/onboarding');

        // Step 1: Display Name
        const nameInput = page.getByPlaceholder('e.g. Alice');
        await expect(nameInput).toBeVisible();
        await nameInput.fill(displayName);
        await page.getByRole('button', { name: 'Next Step' }).click();

        // Step 2: Email & Password - Wait for Secure Account header
        await expect(page.getByText('Secure Account')).toBeVisible();
        const emailInput = page.getByPlaceholder('you@example.com');
        await expect(emailInput).toBeVisible();
        await emailInput.fill(email);

        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Step 3: Verification (if enabled) - handled automatically
        await handleVerificationStepIfNeeded(page);

        // Step 4 (or 3 if verification disabled): Group Selection
        await expect(page.getByText('Find your Squad')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Create Group')).toBeVisible();

        // Click Create Group
        await page.locator('button:has-text("Create Group")').first().click();

        // Group Name
        const groupInput = page.getByPlaceholder('e.g. The Avengers');
        await expect(groupInput).toBeVisible();
        const groupName = `Group ${uniqueId}`;
        await groupInput.fill(groupName);
        await page.getByRole('button', { name: 'Create Group' }).click();

        // Should be redirected to dashboard
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
        await expect(page.getByText(groupName)).toBeVisible();
    });

    test('User can log out', async ({ page }) => {
        const testId = Date.now() + 1;
        const testEmail = `logout${testId}@example.com`;
        const testPass = 'Password123';

        // Signup
        await page.goto('/onboarding');
        await expect(page.getByPlaceholder('e.g. Alice')).toBeVisible();
        await page.getByPlaceholder('e.g. Alice').fill('Logout User');
        await page.getByRole('button', { name: 'Next Step' }).click();

        await expect(page.getByText('Secure Account')).toBeVisible();
        await page.getByPlaceholder('you@example.com').fill(testEmail);
        await page.locator('input[type="password"]').fill(testPass);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Group Selection
        await expect(page.getByText('Find your Squad')).toBeVisible({ timeout: 15000 });
        await page.locator('button:has-text("Create Group")').first().click();

        await expect(page.getByPlaceholder('e.g. The Avengers')).toBeVisible();
        await page.getByPlaceholder('e.g. The Avengers').fill('Logout Group');
        await page.getByRole('button', { name: 'Create Group' }).click();
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

        // Go to settings
        await page.goto('/settings');
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

        // Click Log Out
        const logoutBtn = page.getByText('Log Out');
        await expect(logoutBtn).toBeVisible();
        await logoutBtn.click();

        // Should be back at onboarding
        await expect(page).toHaveURL(/\/onboarding/);
    });

    test('User can log in', async ({ page }) => {
        const testId = Date.now() + 2;
        const testEmail = `login${testId}@example.com`;
        const testPass = 'Password123';

        // Signup first to exist
        await page.goto('/onboarding?step=1');
        await expect(page.getByPlaceholder('e.g. Alice')).toBeVisible();
        await page.getByPlaceholder('e.g. Alice').fill('Login User');
        await page.getByRole('button', { name: 'Next Step' }).click();

        await expect(page.getByText('Secure Account')).toBeVisible();
        await page.getByPlaceholder('you@example.com').fill(testEmail);
        await page.locator('input[type="password"]').fill(testPass);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Group Selection
        await expect(page.getByText('Find your Squad')).toBeVisible({ timeout: 15000 });
        await page.locator('button:has-text("Create Group")').first().click();

        await expect(page.getByPlaceholder('e.g. The Avengers')).toBeVisible();
        await page.getByPlaceholder('e.g. The Avengers').fill('Login Group');
        await page.getByRole('button', { name: 'Create Group' }).click();
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

        // Log out
        await page.goto('/settings');
        await page.getByText('Log Out').click();
        await expect(page).toHaveURL(/\/onboarding/);

        // Login
        await page.goto('/onboarding?view=login');
        await expect(page.getByText('Welcome Back')).toBeVisible();

        await page.getByPlaceholder('you@example.com').fill(testEmail);
        await page.getByPlaceholder('••••••••').fill(testPass);
        await page.getByRole('button', { name: 'Log In' }).click();

        await expect(page).toHaveURL('/dashboard');
    });

    test('User can skip group selection', async ({ page }) => {
        const uniqueId = Date.now() + 3;
        const email = `skip${uniqueId}@example.com`;
        const password = 'Password123';
        const displayName = `Skip User ${uniqueId}`;

        await page.goto('/onboarding');

        // Step 1: Display Name
        await page.getByPlaceholder('e.g. Alice').fill(displayName);
        await page.getByRole('button', { name: 'Next Step' }).click();

        // Step 2: Email & Password
        await expect(page.getByText('Secure Account')).toBeVisible();
        await page.getByPlaceholder('you@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Group Selection - Click Skip
        await expect(page.getByText('Find your Squad')).toBeVisible({ timeout: 15000 });
        await page.getByText('Skip for now').click();

        // Should be redirected to dashboard
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    });
});
