import { Injectable } from '@angular/core';

/**
 * Account approval code service
 * Generates simple base64-encoded codes for account approval/denial links
 */
@Injectable({
  providedIn: 'root'
})
export class ApprovalLinksService {

  /**
   * Generate a simple code for account approval/denial links
   * These codes are validated by decoding the email from the code
   * Format: account_approve_{base64Email} or account_deny_{base64Email}
   */
  generateCode(type: 'account_approve' | 'account_deny', email: string): string {
    const base64Email = btoa(email.toLowerCase());
    return `${type}_${base64Email}`;
  }

  /**
   * Decode an account approval/denial code to get the email
   * Returns null if invalid format
   */
  decodeAccountCode(code: string): { type: 'approve' | 'deny'; email: string } | null {
    try {
      if (code.startsWith('account_approve_')) {
        const base64Email = code.replace('account_approve_', '');
        const email = atob(base64Email);
        return { type: 'approve', email };
      } else if (code.startsWith('account_deny_')) {
        const base64Email = code.replace('account_deny_', '');
        const email = atob(base64Email);
        return { type: 'deny', email };
      }
      return null;
    } catch (error) {
      console.error('Error decoding account code:', error);
      return null;
    }
  }
}
