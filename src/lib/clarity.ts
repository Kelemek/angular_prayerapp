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
 * Uses the Clarity Identify API to tag sessions with a custom user ID
 * The email is hashed on the client before being sent to Clarity servers for security
 * The friendlyName (email) is displayed on the Clarity dashboard for easy searching
 * @param email - User's email address to identify
 */
export function identifyUserInClarity(email: string): void {
  try {
    if (typeof window !== 'undefined' && (window as any).clarity) {
      // Use the global clarity function: window.clarity("identify", customId, customSessionId?, customPageId?, friendlyName?)
      // Pass email as both customId (hashed for security) and friendlyName (readable on dashboard)
      (window as any).clarity('identify', email, undefined, undefined, email);
    }
  } catch (error) {
    console.warn('[Clarity] Failed to identify user:', error instanceof Error ? error.message : String(error));
    // Don't break the app if Clarity fails
  }
}
