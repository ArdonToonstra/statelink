import { test, expect } from '@playwright/test';

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
        await expect(page.getByText('Find your Squad')).toBeVisible();
    });

    test('Create group and invite someone', async ({ page }) => {
        await page.locator('button:has-text("Create Group")').first().click();

        const groupNameInput = page.getByPlaceholder('e.g. The Avengers');
        await expect(groupNameInput).toBeVisible();
        await groupNameInput.fill('Test Group');
        await page.getByRole('button', { name: 'Create Group' }).click();

        await expect(page).toHaveURL('/dashboard');
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
        await expect(page).toHaveURL('/dashboard');

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
        // We can poll or wait for text to be different
        await expect(inviteCodeElement).not.toHaveText(param1 || '', { timeout: 10000 });
    });
});
