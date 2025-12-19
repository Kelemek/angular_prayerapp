import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

interface VerifiedSession {
  email: string;
  verifiedAt: number;
  expiresAt: number;
}

const VERIFIED_SESSIONS_KEY = 'prayer_app_verified_sessions';

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  private isEnabledSubject = new BehaviorSubject<boolean>(false);
  private expiryMinutesSubject = new BehaviorSubject<number>(15);
  
  isEnabled$ = this.isEnabledSubject.asObservable();
  expiryMinutes$ = this.expiryMinutesSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    console.log('VerificationService - Constructor called');
    // Delay the check slightly to ensure Supabase client is ready
    setTimeout(() => this.checkIfEnabled(), 100);
  }

  private async checkIfEnabled(): Promise<void> {
    try {
      console.log('VerificationService - Checking if verification is enabled...');
      
      // Match React version: use .eq('id', 1) instead of .limit(1)
      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select('require_email_verification, verification_code_expiry_minutes')
        .eq('id', 1)
        .maybeSingle();
      
      if (error) {
        console.error('VerificationService - Error fetching settings:', error);
      }
      
      console.log('VerificationService - Query result:', { data, error });
      
      const isEnabled = data?.require_email_verification === true;
      console.log('VerificationService - Setting isEnabled to:', isEnabled);
      
      this.isEnabledSubject.next(isEnabled);
      if (data?.verification_code_expiry_minutes) {
        this.expiryMinutesSubject.next(data.verification_code_expiry_minutes);
      }
    } catch (err) {
      console.error('Error checking verification setting:', err);
      this.isEnabledSubject.next(false);
    }
  }
  
  // Public method to manually refresh the verification status
  async refreshStatus(): Promise<void> {
    await this.checkIfEnabled();
  }

  isRecentlyVerified(email: string): boolean {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const sessionsData = localStorage.getItem(VERIFIED_SESSIONS_KEY);
      if (!sessionsData) return false;

      const sessions: VerifiedSession[] = JSON.parse(sessionsData);
      const session = sessions.find(s => s.email === normalizedEmail);
      
      if (!session || !session.expiresAt || typeof session.expiresAt !== 'number') {
        return false;
      }

      const now = Date.now();
      if (now > session.expiresAt) {
        this.cleanupExpiredSessions();
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error checking verification session:', err);
      return false;
    }
  }

  saveVerifiedSession(email: string): void {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const sessionsData = localStorage.getItem(VERIFIED_SESSIONS_KEY);
      let sessions: VerifiedSession[] = sessionsData ? JSON.parse(sessionsData) : [];
      
      sessions = sessions.filter(s => s.email !== normalizedEmail);
      
      const now = Date.now();
      const expiryMinutes = this.expiryMinutesSubject.value;
      sessions.push({
        email: normalizedEmail,
        verifiedAt: now,
        expiresAt: now + (expiryMinutes * 60 * 1000)
      });
      
      localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.error('Error saving verification session:', err);
    }
  }

  private cleanupExpiredSessions(): void {
    try {
      const sessionsData = localStorage.getItem(VERIFIED_SESSIONS_KEY);
      if (!sessionsData) return;

      const sessions: VerifiedSession[] = JSON.parse(sessionsData);
      const now = Date.now();
      const activeSessions = sessions.filter(s => s.expiresAt > now);
      
      if (activeSessions.length !== sessions.length) {
        localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(activeSessions));
      }
    } catch (err) {
      console.error('Error cleaning up sessions:', err);
    }
  }

  async requestCode(
    email: string,
    actionType: string,
    actionData: any
  ): Promise<{ codeId: string; expiresAt: string } | null> {
    if (!this.isEnabledSubject.value) {
      return null;
    }

    if (this.isRecentlyVerified(email)) {
      return null;
    }

    try {
      const { data, error: functionError } = await this.supabase.client.functions.invoke(
        'send-verification-code',
        {
          body: {
            email: email.toLowerCase().trim(),
            actionType,
            actionData
          }
        }
      );

      if (functionError) {
        throw new Error(functionError.message || 'Failed to send verification code');
      }

      if (data?.error) {
        const errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        const details = data.details ? ` - ${data.details}` : '';
        throw new Error(`${errorMsg}${details}`);
      }

      if (!data.success || !data.codeId || !data.expiresAt) {
        throw new Error('Invalid response from verification service');
      }

      return {
        codeId: data.codeId,
        expiresAt: data.expiresAt
      };
    } catch (error) {
      console.error('Error requesting verification code:', error);
      throw error;
    }
  }

  async verifyCode(
    email: string,
    codeId: string,
    code: string
  ): Promise<{ success: boolean; actionData: any }> {
    try {
      const { data, error: functionError } = await this.supabase.client.functions.invoke(
        'verify-code',
        {
          body: {
            email: email.toLowerCase().trim(),
            codeId,
            code
          }
        }
      );

      if (functionError) {
        throw new Error(functionError.message || 'Failed to verify code');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data.success) {
        throw new Error('Verification failed');
      }

      this.saveVerifiedSession(email);

      return {
        success: true,
        actionData: data.actionData
      };
    } catch (error) {
      console.error('Error verifying code:', error);
      throw error;
    }
  }

  async getCodeLength(): Promise<number> {
    try {
      const { data } = await this.supabase.client
        .from('admin_settings')
        .select('verification_code_length')
        .eq('id', 1)
        .maybeSingle();

      return data?.verification_code_length || 6;
    } catch (err) {
      console.error('Error fetching code length:', err);
      return 6;
    }
  }
}
