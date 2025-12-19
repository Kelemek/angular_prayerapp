import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { IMAGE_CONFIG } from '@angular/common';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

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

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true
      }
    }
  ]
}).catch(err => console.error(err));
