import posthog from 'posthog-js';
import { environment } from '../environments/environment';
import { getAppAnalyticsContext, type AppAnalyticsContext } from './app-analytics-context';

let initialized = false;

type PostHogAppContextClient = {
  register: (properties: AppAnalyticsContext) => void;
  setPersonProperties: (properties: AppAnalyticsContext) => void;
  setPersonPropertiesForFlags: (
    properties: AppAnalyticsContext,
    reloadFeatureFlags?: boolean
  ) => void;
};

/** Super properties, person properties, and flag/survey targeting for the running build. */
export function applyPostHogAppContext(
  ph: PostHogAppContextClient,
  reloadFeatureFlags = true
): void {
  try {
    const context = getAppAnalyticsContext(environment.production);
    ph.register(context);
    ph.setPersonProperties(context);
    ph.setPersonPropertiesForFlags(context, reloadFeatureFlags);
  } catch (error) {
    console.error('Failed to apply PostHog app context:', error);
  }
}

/** Resets init state for unit tests only. */
export function resetPostHogForTesting(): void {
  initialized = false;
}

export function isPostHogConfigured(): boolean {
  const key = environment.posthogKey?.trim();
  return !!key && key !== 'undefined';
}

export function initializePostHog(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (initialized || !isPostHogConfigured()) {
    if (!environment.production && !isPostHogConfigured()) {
      console.debug('PostHog project key not configured');
    }
    return;
  }

  try {
    posthog.init(environment.posthogKey.trim(), {
      api_host: environment.posthogHost,
      ui_host: environment.posthogUiHost,
      person_profiles: 'identified_only',
      capture_pageview: false,
      autocapture: true,
      loaded: ph => {
        // Ensure capturing is on when a key is configured (dev used to opt out and persist in localStorage).
        ph.opt_in_capturing();
        applyPostHogAppContext(ph);
      },
    });
    initialized = true;
    (window as Window & { posthog?: typeof posthog }).posthog = posthog;
    // Tag events before `loaded` so the first pageview includes version/platform.
    applyPostHogAppContext(posthog, false);
  } catch (error) {
    console.error('Failed to initialize PostHog:', error);
  }
}

export function capturePostHogException(
  error: unknown,
  additionalProperties?: Record<string, unknown>
): void {
  if (!initialized || !isPostHogConfigured()) {
    return;
  }
  try {
    posthog.captureException(error, additionalProperties);
  } catch (captureError) {
    console.error('Failed to capture PostHog exception:', captureError);
  }
}

export function capturePostHogPageview(path: string): void {
  if (!initialized || !isPostHogConfigured()) {
    return;
  }
  try {
    posthog.capture('$pageview', { $current_url: path });
  } catch (error) {
    console.error('Failed to capture PostHog pageview:', error);
  }
}

export function capturePostHogEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!initialized || !isPostHogConfigured()) {
    return;
  }
  try {
    posthog.capture(event, properties);
  } catch (error) {
    console.error('Failed to capture PostHog event:', error);
  }
}

export { posthog };
