import clarity from '@microsoft/clarity';
import { environment } from '../environments/environment';

export function initializeClarity(): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const clarityProjectId = environment.clarityProjectId;
    
    // Debug logging to verify environment variable is loaded
    if (clarityProjectId) {
      console.debug('Clarity environment check:', {
        projectId: clarityProjectId,
        hasValue: !!clarityProjectId,
        isDefined: clarityProjectId !== undefined,
        isEmpty: clarityProjectId === '',
        type: typeof clarityProjectId,
        production: environment.production
      });
    }
    
    // Only initialize if project ID is explicitly set and not empty
    if (!clarityProjectId || clarityProjectId === '' || clarityProjectId === 'undefined') {
      console.debug('Clarity not configured - skipping initialization');
      return;
    }

    // Initialize Clarity using the official npm package
    clarity.init(clarityProjectId);
    console.log('✓ Clarity initialized with project:', clarityProjectId);
  } catch (error) {
    console.error('✗ Failed to initialize Clarity:', error instanceof Error ? error.message : String(error));
  }
}
