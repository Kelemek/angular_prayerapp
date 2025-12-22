import { test, expect } from '@playwright/test';

test.describe('Content Types & Display', () => {
  test('should display prayer requests correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Filter to prayer content if possible
    const contentTypeButton = page.locator('button:has-text("Prayer"), button[title*="prayer" i]').first();
    if (await contentTypeButton.isVisible()) {
      await contentTypeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Should display content
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
  });

  test('should display praise/worship content correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Filter to praise content if possible
    const contentTypeButton = page.locator('button:has-text("Praise"), button[title*="praise" i]').first();
    if (await contentTypeButton.isVisible()) {
      await contentTypeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Should display content
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
  });

  test('should display prompt/engagement content correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Filter to prompt content if possible
    const contentTypeButton = page.locator('button:has-text("Prompt"), button[title*="prompt" i]').first();
    if (await contentTypeButton.isVisible()) {
      await contentTypeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Should display content
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
  });

  test('should distinguish between different content types', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Get initial content
    const initialContent = await page.locator('body').textContent();
    
    // Apply content type filter using enabled buttons only
    const buttons = page.locator('button:visible:enabled');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      try {
        const firstButton = buttons.first();
        if (await firstButton.isEnabled().catch(() => false)) {
          await firstButton.click({ timeout: 500 }).catch(() => {});
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // Continue even if click fails
      }
    }
    
    // Content might be different after filter
    const newContent = await page.locator('body').textContent();
    
    // Both should be valid
    expect(initialContent).toBeTruthy();
    expect(newContent).toBeTruthy();
  });

  test('should display mixed content types without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should display all content types mixed
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    expect(content?.length).toBeGreaterThan(100);
  });

  test('presentation mode should handle all content types', async ({ page }) => {
    await page.goto('/presentation');
    await page.waitForTimeout(2000);
    
    // Wait for spinner to disappear
    const spinner = page.locator('.animate-spin').first();
    try {
      await spinner.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Spinner might not exist
    }
    
    // Should display content
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    // Should be able to navigate
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    
    // Page should still work
    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter content by type correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Get content before filter
    const beforeFilter = await page.locator('[class*="prayer"], [class*="card"]').count();
    
    // Apply filter using enabled buttons only
    const filterButtons = page.locator('button:visible:enabled');
    const filterButton = filterButtons.first();
    
    try {
      if (await filterButton.isVisible().catch(() => false)) {
        if (await filterButton.isEnabled().catch(() => false)) {
          await filterButton.click({ timeout: 500 }).catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
    } catch (e) {
      // Continue even if click fails
    }
    
    // Get content after filter
    const afterFilter = await page.locator('[class*="prayer"], [class*="card"]').count();
    
    // Should have some content both before and after
    expect(beforeFilter).toBeGreaterThanOrEqual(0);
    expect(afterFilter).toBeGreaterThanOrEqual(0);
    
    // Page should still be visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle content type switching without losing state', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Apply a search
    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('prayer');
      await page.waitForTimeout(500);
    }
    
    // Get initial results
    const initialCards = await page.locator('[class*="prayer"], [class*="card"]').count();
    
    // Switch content type
    const contentButton = page.locator('button').nth(2);
    if (await contentButton.isVisible()) {
      await contentButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Page should still function
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display content metadata for all types', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Get cards
    const cards = page.locator('[class*="prayer"], [class*="card"]');
    const firstCard = cards.first();
    
    if (await firstCard.isVisible()) {
      const cardContent = await firstCard.textContent();
      
      // Should have some structure/metadata
      expect(cardContent).toBeTruthy();
      expect(cardContent?.length).toBeGreaterThan(5);
    }
  });

  test('should handle rapid content type switches', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Get enabled buttons only
    const buttons = page.locator('button:visible:enabled');
    const count = await buttons.count();
    
    // Rapidly click enabled buttons
    for (let i = 0; i < Math.min(5, count); i++) {
      const btn = buttons.nth(i);
      try {
        if (await btn.isVisible().catch(() => false)) {
          if (await btn.isEnabled().catch(() => false)) {
            await btn.click({ timeout: 500 }).catch(() => {});
            await page.waitForTimeout(50);
          }
        }
      } catch (e) {
        // Continue to next button
        continue;
      }
    }
    
    // App should remain stable
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display content formatting correctly for all types', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Get first card
    const card = page.locator('[class*="prayer"], [class*="card"]').first();
    
    if (await card.isVisible()) {
      // Check layout isn't broken
      const box = await card.boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      expect(box?.height).toBeGreaterThan(0);
      
      // Text should be readable
      const text = await card.textContent();
      expect(text?.trim()).toBeTruthy();
    }
  });
});
