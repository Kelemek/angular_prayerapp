import * as Sentry from '@sentry/angular';
import { environment } from '../environments/environment';

export function initializeSentry(): void {
  const dsn = environment.sentryDsn;

  console.log('🔍 Sentry initialization check:');
  console.log('DSN configured:', !!dsn);
  console.log('Environment:', environment.production ? 'production' : 'development');

  if (!dsn) {
    console.warn('⚠️ Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  try {
    Sentry.init({
      dsn: dsn,
      environment: environment.production ? 'production' : 'development',
      tracesSampleRate: 0.1,
      release: '1.0.0',
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration()
      ],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      ignoreErrors: [
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',
        'error:addon_install_cancelled',
        'NetworkError',
        'Failed to fetch',
        'Permission denied',
      ],
      beforeSend(event) {
        // Don't send errors in development
        if (!environment.production) {
          console.log('🚫 Filtering out development error');
          return null;
        }
        return event;
      },
    });

    console.log('✅ Sentry initialized successfully');
    
    // Expose Sentry globally for manual testing
    (window as any).Sentry = Sentry;
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
}
