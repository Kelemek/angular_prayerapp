import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import type {
  MemorizationReciteOpenAiUsage,
  MemorizationReciteSettings,
  MemorizationReciteUsageSummary,
} from '../types/memorization';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

const CACHE_KEY = 'memorization_recite_enabled';
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedFlag {
  value: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class MemorizationReciteSettingsService {
  private settingsSubject = new BehaviorSubject<MemorizationReciteSettings>({ enabled: false });
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private supabase: SupabaseService,
    private userSession: UserSessionService
  ) {
    this.seedFromLocalStorage();
  }

  getReciteEnabled$(): Observable<boolean> {
    this.ensureLoaded();
    return this.settingsSubject.pipe(map((s) => s.enabled));
  }

  getSettings$(): Observable<MemorizationReciteSettings> {
    this.ensureLoaded();
    return this.settingsSubject.asObservable();
  }

  async getSettings(): Promise<MemorizationReciteSettings> {
    await this.ensureLoadedAsync();
    return this.settingsSubject.value;
  }

  /** Always reads `admin_settings` (used when opening practice so stale cache cannot hide Recite). */
  async getSettingsFromServer(): Promise<MemorizationReciteSettings> {
    await this.reloadFromSupabase();
    return this.settingsSubject.value;
  }

  invalidateCache(): void {
    this.loaded = false;
    this.loadPromise = null;
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
    this.ensureLoaded();
  }

  async loadUsageSummary(
    start: Date,
    end: Date
  ): Promise<MemorizationReciteUsageSummary> {
    const adminEmail = await this.getAdminCallerEmail();
    const { data, error } = await this.supabase.client.rpc(
      'get_memorization_recite_usage_summary',
      {
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_email: adminEmail,
      }
    );

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      attemptCount: Number(row?.attempt_count ?? 0),
      billableAudioSeconds: Number(row?.billable_audio_seconds ?? 0),
      estimatedCostUsd: Number(row?.estimated_cost_usd ?? 0),
    };
  }

  async fetchOpenAiOrgUsage(): Promise<MemorizationReciteOpenAiUsage> {
    const apikey = this.supabase.getSupabaseKey();
    const session = await this.supabase.client.auth.getSession();
    const userEmail = await this.getAdminCallerEmail();
    let mfaEmail: string | null = null;
    try {
      mfaEmail = localStorage.getItem('mfa_authenticated_email')?.toLowerCase().trim() ?? null;
    } catch {
      // ignore
    }
    const useMfaAuth = !!mfaEmail && userEmail === mfaEmail;
    const token = useMfaAuth ? null : session.data.session?.access_token ?? null;
    const url = new URL(`${this.supabase.getSupabaseUrl()}/functions/v1/get-openai-org-usage`);
    if (userEmail) {
      url.searchParams.set('user_email', userEmail);
    }
    const response = await fetch(url.toString(), {
      headers: {
        apikey,
        Authorization: `Bearer ${token ?? apikey}`,
      },
    });
    const payload = (await response.json()) as {
      configured?: boolean;
      period_days?: number;
      total_usd?: number;
      error?: string;
      admin_key_required?: boolean;
      api_key_id_required?: boolean;
      costs_api_failed?: boolean;
    };

    if (payload.admin_key_required) {
      return { configured: false, adminKeyRequired: true };
    }

    if (payload.api_key_id_required) {
      return { configured: false, apiKeyIdRequired: true };
    }

    if (payload.error) {
      return {
        configured: !!payload.configured,
        periodDays: payload.period_days,
        totalUsd: payload.total_usd,
        error: payload.error,
      };
    }

    if (!response.ok) {
      return { configured: false, error: payload.error ?? 'Could not load OpenAI usage' };
    }

    return {
      configured: !!payload.configured,
      periodDays: payload.period_days,
      totalUsd: payload.total_usd,
    };
  }

  private async getAdminCallerEmail(): Promise<string | null> {
    try {
      const mfaEmail = localStorage.getItem('mfa_authenticated_email')?.toLowerCase().trim();
      if (mfaEmail) {
        return mfaEmail;
      }
      const approvalEmail = localStorage.getItem('approvalAdminEmail')?.toLowerCase().trim();
      if (approvalEmail) {
        return approvalEmail;
      }
    } catch {
      // ignore
    }

    const session = this.userSession.getCurrentSession();
    if (session?.email) {
      return session.email.toLowerCase().trim();
    }

    const { data } = await this.supabase.client.auth.getUser();
    const jwtEmail = data.user?.email?.toLowerCase().trim();
    if (jwtEmail) {
      return jwtEmail;
    }

    return null;
  }

  private seedFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed: CachedFlag = JSON.parse(raw);
      if (typeof parsed.value === 'boolean' && typeof parsed.timestamp === 'number') {
        // Only seed enabled=true from cache. A stale cached false hides Recite in browsers
        // that have not refetched since the admin toggle (common in Safari/Firefox).
        if (parsed.value && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          this.settingsSubject.next({ enabled: true });
        }
      }
    } catch {
      // ignore
    }
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    if (this.loadPromise) return;
    this.loadPromise = this.reloadFromSupabase().finally(() => {
      this.loadPromise = null;
    });
  }

  private async ensureLoadedAsync(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }
    this.loadPromise = this.reloadFromSupabase().finally(() => {
      this.loadPromise = null;
    });
    await this.loadPromise;
  }

  private async reloadFromSupabase(): Promise<void> {
    const enabled = await this.fetchEnabledFromServer();
    if (enabled === null) {
      // Do not trust a stale localStorage seed when the server flag cannot be read.
      this.settingsSubject.next({ enabled: false });
      this.loaded = true;
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        // ignore
      }
      return;
    }

    this.settingsSubject.next({ enabled });
    this.loaded = true;

    if (enabled) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ value: true, timestamp: Date.now() } satisfies CachedFlag)
        );
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        // ignore
      }
    }
  }

  private async fetchEnabledFromServer(): Promise<boolean | null> {
    try {
      const { data, error } = await this.supabase.directQuery<
        { memorization_recite_enabled: boolean }[]
      >('admin_settings', {
        select: 'memorization_recite_enabled',
        eq: { id: 1 },
        limit: 1,
      });

      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) return !!row.memorization_recite_enabled;
      }

      if (error) {
        console.warn('[MemorizationReciteSettings] directQuery failed, retrying client', error);
      }

      const { data: clientData, error: clientError } = await this.supabase.client
        .from('admin_settings')
        .select('memorization_recite_enabled')
        .eq('id', 1)
        .maybeSingle();

      if (clientError) {
        console.warn('[MemorizationReciteSettings] Failed to load flag', clientError);
        return null;
      }

      return !!clientData?.memorization_recite_enabled;
    } catch (e) {
      console.warn('[MemorizationReciteSettings] Error loading flag', e);
      return null;
    }
  }
}
