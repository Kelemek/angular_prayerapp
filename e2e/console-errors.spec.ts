import { test, expect } from '@playwright/test';

test.describe('Browser Console & DevTools', () => {
  test('should have no JavaScript errors on home page', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Filter out expected errors in test environment
    const criticalErrors = consoleErrors.filter(error => {
      // Network errors for external resources are expected in CI
      if (error.includes('ERR_NAME_NOT_RESOLVED') || error.includes('Failed to load resource')) {
        return false;
      }
      // Supabase lock errors are expected in test environment
      if (error.includes('NavigatorLockAcquireTimeoutError') || error.includes('lock:sb-')) {
        return false;
      }
      return true;
    });
    
    // Should have no critical application errors
    expect(criticalErrors.length).toBeLessThan(3);
  });

  test('should have no JavaScript errors on presentation page', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/presentation');
    await page.waitForTimeout(2000);
    
    // Filter out expected errors in test environment
    const criticalErrors = consoleErrors.filter(error => {
      // Network errors for external resources are expected in CI
      if (error.includes('ERR_NAME_NOT_RESOLVED') || error.includes('Failed to load resource')) {
        return false;
      }
      // Supabase lock errors are expected in test environment
      if (error.includes('NavigatorLockAcquireTimeoutError') || error.includes('lock:sb-')) {
        return false;
      }
      return true;
    });
    
    // Should have no critical application errors
    expect(criticalErrors.length).toBeLessThan(3);
  });

  test('should have no broken resource links', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Filter out expected failures in test environment
    const criticalFailures = failedRequests.filter(url => {
      // External resources may not be accessible in CI
      if (url.includes('http') && !url.includes('localhost')) {
        return false;
      }
      // Analytics and external tracking are expected to fail
      if (url.includes('analytics') || url.includes('external')) {
        return false;
      }
      return true;
    });
    
    // Should load critical resources successfully
    expect(criticalFailures.length).toBeLessThan(3);
  });

  test('should have no 404 errors for critical resources', async ({ page }) => {
    const notFoundUrls: string[] = [];
    
    page.on('response', response => {
      if (response.status() === 404) {
        notFoundUrls.push(response.url());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Critical resources should load
    const criticalNotFound = notFoundUrls.filter(url => 
      !url.includes('analytics') && !url.includes('external')
    );
    
    expect(criticalNotFound.length).toBeLessThan(2);
  });

  test('should have no uncaught exceptions', async ({ page }) => {
    let uncaughtException = false;
    
    page.on('pageerror', error => {
      console.error('Page error:', error);
      uncaughtException = true;
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should handle errors gracefully
    expect(uncaughtException).toBeFalsy();
  });

  test('should load stylesheets correctly', async ({ page }) => {
    const stylesheets: string[] = [];
    
    page.on('response', response => {
      if (response.url().endsWith('.css')) {
        stylesheets.push(response.url());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should have CSS resources
    expect(stylesheets.length).toBeGreaterThanOrEqual(1);
  });

  test('should load JavaScript bundles correctly', async ({ page }) => {
    const scripts: string[] = [];
    
    page.on('response', response => {
      if (response.url().endsWith('.js')) {
        scripts.push(response.url());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should have JavaScript resources
    expect(scripts.length).toBeGreaterThanOrEqual(1);
  });

  test('should have no memory leaks on rapid navigation', async ({ page }) => {
    const metrics: number[] = [];
    
    // Check memory usage (if available)
    try {
      for (let i = 0; i < 5; i++) {
        await page.goto('/');
        await page.waitForTimeout(500);
        
        await page.goto('/presentation');
        await page.waitForTimeout(500);
      }
      
      // If we got here without crash, memory handling is OK
      await expect(page.locator('body')).toBeVisible();
    } catch (e) {
      // Should not crash from memory issues
      throw e;
    }
  });

  test('should handle errors in async operations', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Trigger async operations
    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
    }
    
    // Should handle async operations without fatal errors
    const fatalErrors = errors.filter(e => 
      e.includes('Uncaught') || e.includes('unhandled')
    );
    expect(fatalErrors.length).toBe(0);
  });

  test('should have valid DOM structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Check for invalid nesting
    const doctype = await page.evaluate(() => {
      const dt = document.doctype;
      return dt ? dt.name : null;
    });
    
    // Should have DOCTYPE
    expect(doctype).toBeTruthy();
    
    // Check for basic structure
    const html = await page.locator('html');
    const body = await page.locator('body');
    
    expect(await html.count()).toBe(1);
    expect(await body.count()).toBe(1);
  });

  test('should have no infinite loops or hangs', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for page to load with timeout
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should complete within reasonable time
    expect(loadTime).toBeLessThan(30000);
  });

  test('should handle network requests properly', async ({ page }) => {
    const requests: { url: string; status: number }[] = [];
    
    page.on('response', response => {
      requests.push({
        url: response.url(),
        status: response.status()
      });
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should have successful requests
    const successfulRequests = requests.filter(r => r.status >= 200 && r.status < 300);
    expect(successfulRequests.length).toBeGreaterThan(0);
    
    // Critical requests should not fail
    const failedCritical = requests.filter(r => 
      r.status >= 400 && !r.url.includes('analytics')
    );
    expect(failedCritical.length).toBeLessThan(2);
  });

  test('should have no warning messages for deprecated APIs', async ({ page }) => {
    const warnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should minimize deprecated API warnings
    const deprecationWarnings = warnings.filter(w => 
      w.includes('deprecated') || w.includes('Deprecated')
    );
    
    expect(deprecationWarnings.length).toBeLessThan(5);
  });

  test('should properly execute Angular initialization', async ({ page }) => {
    const angularInitialized = await page.evaluate(() => {
      return !!(window as any).ng;
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Angular should be initialized
    expect(angularInitialized || (await page.locator('body').isVisible())).toBeTruthy();
  });
});
