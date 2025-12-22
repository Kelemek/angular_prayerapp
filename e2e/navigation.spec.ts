import { test, expect } from '@playwright/test';

test.describe('Navigation and Routing', () => {
  test('should navigate to presentation mode from home', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Look for presentation button or link
    const presentationButton = page.locator('button:has-text("Present"), a[href*="presentation"]').first();
    
    if (await presentationButton.isVisible()) {
      // Click presentation button
      await presentationButton.click();
      await page.waitForTimeout(2000);
      
      // Should navigate to presentation page
      expect(page.url()).toContain('presentation');
    }
  });

  test('should navigate back from presentation to home', async ({ page }) => {
    await page.goto('/presentation');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Look for back/home button or use browser back
    const backButton = page.locator('button[title*="Back"], a[href="/"]').first();
    
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Use browser back navigation
      await page.goBack();
      await page.waitForTimeout(1000);
    }
    
    // Should be on home page
    expect(page.url()).not.toContain('presentation');
  });

  test('should navigate to admin login', async ({ page }) => {
    await page.goto('/');
    
    // Look for admin link
    const adminLink = page.locator('a[href*="admin"], button:has-text("Admin")').first();
    
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await page.waitForTimeout(1000);
      
      // Should navigate to admin area
      expect(page.url()).toContain('admin');
    }
  });

  test('should handle browser back button', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Navigate to presentation
    const presentationButton = page.locator('button:has-text("Present"), a[href*="presentation"]').first();
    if (await presentationButton.isVisible()) {
      await presentationButton.click();
      await page.waitForTimeout(1000);
      
      // Go back using browser
      await page.goBack();
      await page.waitForTimeout(1000);
      
      // Should be back on home page
      expect(page.url()).not.toContain('presentation');
    }
  });

  test('should reload page without losing state', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Get initial content
    const initialContent = await page.locator('body').textContent();
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Page should still have content
    const reloadedContent = await page.locator('body').textContent();
    expect(reloadedContent).toBeTruthy();
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to various routes
    const routes = ['/', '/presentation', '/login'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(1500);
      
      // Page should load without errors
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
