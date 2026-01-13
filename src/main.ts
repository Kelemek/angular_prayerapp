import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { IMAGE_CONFIG } from '@angular/common';
import { APP_INITIALIZER } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { AdminAuthService } from './app/services/admin-auth.service';

// Initialize Sentry asynchronously to avoid blocking render
const initSentryLater = async () => {
  try {
    const { initializeSentry } = await import('./lib/sentry');
    initializeSentry();
  } catch (error) {
    console.error('Failed to load Sentry module:', error);
  }
};

initSentryLater();

// Initialize Microsoft Clarity for session replays
const initClarityLater = async () => {
  try {
    const { initializeClarity } = await import('./lib/clarity');
    initializeClarity();
  } catch (error) {
    console.error('Failed to load Clarity module:', error);
  }
};

initClarityLater();

// Initialize Vercel Analytics
const initVercelAnalytics = async () => {
  try {
    const { inject } = await import('@vercel/analytics');
    inject();
  } catch (error) {
    console.error('Failed to initialize Vercel Analytics:', error);
  }
};

initVercelAnalytics();

// Initialize Vercel Speed Insights
const initVercelSpeedInsights = async () => {
  try {
    const { injectSpeedInsights } = await import('@vercel/speed-insights');
    injectSpeedInsights();
  } catch (error) {
    console.error('Failed to initialize Vercel Speed Insights:', error);
  }
};

initVercelSpeedInsights();

// Add a global visibility check to ensure content stays visible during background refresh
const setupVisibilityRecovery = () => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('[AppInitialization] Page became visible');
      
      // Verify router outlet exists
      const routerOutlet = document.querySelector('router-outlet');
      if (!routerOutlet) {
        console.warn('[AppInitialization] Router outlet not found when page became visible');
        // Don't reload - let services handle the refresh
      } else {
        console.log('[AppInitialization] Page visible and router outlet intact');
        // Dispatch event to services that the app became visible
        window.dispatchEvent(new CustomEvent('app-became-visible'));
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Also handle focus event which may fire before visibilitychange on some browsers
  window.addEventListener('focus', () => {
    if (!document.hidden) {
      console.log('[AppInitialization] Focus event - app became visible');
      window.dispatchEvent(new CustomEvent('app-became-visible'));
    }
  });
};

setupVisibilityRecovery();

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(),
    provideAnimations(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerImmediately'
    }),
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true
      }
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (adminAuthService: AdminAuthService) => {
        return () => {
          console.log('[AppInitialization] Initializing AdminAuthService for session restoration');
          // Wait for the loading state to complete (loading goes from true -> false)
          return new Promise(resolve => {
            let resolved = false;
            
            // Subscribe to loading state
            const subscription = adminAuthService.loading$.subscribe(isLoading => {
              // Once loading completes (becomes false), resolve
              if (!isLoading && !resolved) {
                resolved = true;
                console.log('[AppInitialization] AdminAuthService initialization complete');
                subscription.unsubscribe();
                resolve(true);
              }
            });
            
            // Safety timeout in case loading never completes
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                console.warn('[AppInitialization] AdminAuthService initialization timed out after 5s');
                subscription.unsubscribe();
                resolve(true);
              }
            }, 5000);
          });
        };
      },
      deps: [AdminAuthService],
      multi: true
    }
  ]
}).catch(err => {
  console.error('[AppInitialization] Bootstrap error:', err);
  // Ensure user sees something instead of blank page
  const rootElement = document.querySelector('app-root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f3f4f6; font-family: system-ui, -apple-system, sans-serif;">
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="color: #374151; margin-bottom: 1rem;">Oops, something went wrong</h1>
          <p style="color: #6b7280; margin-bottom: 1.5rem;">The application encountered an error. Attempting to recover...</p>
          <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">Reload Page</button>
        </div>
      </div>
    `;
  }
  // Attempt automatic reload
  setTimeout(() => {
    window.location.reload();
  }, 3000);
});
