import clarity from '@microsoft/clarity';
import { environment } from '../environments/environment';

export function initializeClarity(): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const clarityProjectId = environment.clarityProjectId;
    
    // Only initialize if project ID is explicitly set and not empty
    if (!clarityProjectId || clarityProjectId === '' || clarityProjectId === 'undefined') {
      return;
    }

    // Initialize Clarity using the official npm package
    clarity.init(clarityProjectId);
  } catch (error) {
    console.error('✗ Failed to initialize Clarity:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Identify a user in Clarity for activity tracking
 * @param email - User's email address to identify
 */
export function identifyUserInClarity(email: string): void {
  try {
    if (typeof window !== 'undefined' && (window as any).clarity) {
      (window as any).clarity.identify(email);
    }
  } catch (error) {
    console.warn('[Clarity] Failed to identify user:', error instanceof Error ? error.message : String(error));
    // Don't break the app if Clarity fails
  }
}
