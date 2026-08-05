import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { CacheService } from './cache.service';
import { BadgeService } from './badge.service';
import { UserSessionService } from './user-session.service';
import { PrayerItemReminderService } from './prayer-item-reminder.service';
import { PrayerPrompt } from '../components/prompt-card/prompt-card.component';

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  public promptsSubject = new BehaviorSubject<PrayerPrompt[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private errorSubject = new BehaviorSubject<string | null>(null);
  /** Bumps on session email change so late count hydrates are ignored. */
  private countsHydrateGeneration = 0;

  public prompts$ = this.promptsSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  isPromptsLoading(): boolean {
    return this.loadingSubject.value;
  }

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cache: CacheService,
    private badgeService: BadgeService,
    private userSessionService: UserSessionService,
    private prayerItemReminderService: PrayerItemReminderService
  ) {
    this.loadPrompts();
    this.userSessionService.userSession$
      .pipe(
        distinctUntilChanged((prev, curr) => prev?.email === curr?.email)
      )
      .subscribe((session) => {
        void this.onUserSessionEmailChange(session?.email ?? null);
      });
  }

  /**
   * Load prompts from database with caching, then attach the current user's Pray For counts.
   */
  async loadPrompts(forceRefresh = false): Promise<void> {
    try {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      if (forceRefresh) {
        this.cache.invalidate('prompts');
      }

      // Try to get from cache first (base prompts without user-specific counts)
      let sortedPrompts = this.cache.get<PrayerPrompt[]>('prompts');

      if (!sortedPrompts) {
        // Fetch prayer types for ordering
        const { data: typesData, error: typesError } = await this.supabase.client
          .from('prayer_types')
          .select('name, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (typesError) throw typesError;

        // Create a set of active type names for filtering
        const activeTypeNames = new Set((typesData || []).map((t: any) => t.name));

        // Create a map of type name to display_order
        const typeOrderMap = new Map(typesData?.map((t: any) => [t.name, t.display_order]) || []);

        // Fetch all prompts
        const { data, error } = await this.supabase.client
          .from('prayer_prompts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter to only include prompts with active types, then sort by type's display_order
        sortedPrompts = (data || [])
          .filter((p: any) => activeTypeNames.has(p.type))
          .sort((a: any, b: any) => {
            const orderA = typeOrderMap.get(a.type) ?? 999;
            const orderB = typeOrderMap.get(b.type) ?? 999;
            return orderA - orderB;
          })
          .map((p: any) => ({
            id: p.id,
            title: p.title,
            type: p.type,
            description: p.description,
            created_at: p.created_at,
            updated_at: p.updated_at,
          }));

        // Cache the results without user-specific counts
        this.cache.set('prompts', sortedPrompts);
      }

      await this.publishPromptsWithFreshCounts(sortedPrompts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prompts';
      console.error('Failed to load prompts:', err);
      this.errorSubject.next(errorMessage);
      this.toast.error('Failed to load prompts');
    } finally {
      this.loadingSubject.next(false);
      
      // Refresh badge counts to ensure badges show up for new prompts
      this.badgeService.refreshBadgeCounts();
    }
  }

  /**
   * Attach counts and publish. Uses UserSession email (not lingering Supabase auth) so a late
   * load after logout cannot restore another user's private tallies. Retries once if generation
   * changes mid-flight.
   */
  private async publishPromptsWithFreshCounts(base: PrayerPrompt[]): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const generation = this.countsHydrateGeneration;
      const sessionEmail = this.userSessionService.getUserEmail();
      const withCounts = sessionEmail
        ? await this.attachPrayedForCounts(base, sessionEmail)
        : base.map((p) => ({ ...p, prayed_for_count: 0 }));
      if (generation === this.countsHydrateGeneration) {
        this.promptsSubject.next(withCounts);
        return;
      }
    }

    // Still racing with session changes — publish list structure without applying a stale tally.
    // Prefer existing in-memory counts for matching ids; otherwise 0.
    const prevById = new Map(
      this.promptsSubject.value.map((p) => [p.id, p.prayed_for_count ?? 0] as const)
    );
    this.promptsSubject.next(
      base.map((p) => ({
        ...p,
        prayed_for_count: prevById.get(p.id) ?? 0,
      }))
    );
  }

  /**
   * Attach Pray For counts for the given user email (default 0 when missing).
   * Uses UserSession email only (or an explicit override) — never a lingering Supabase
   * auth session after logout, matching publishPromptsWithFreshCounts.
   */
  async attachPrayedForCounts(
    prompts: PrayerPrompt[],
    emailOverride?: string | null
  ): Promise<PrayerPrompt[]> {
    if (!prompts.length) {
      return prompts;
    }

    const userEmail =
      emailOverride !== undefined
        ? emailOverride?.trim().toLowerCase() || null
        : this.userSessionService.getUserEmail()?.trim().toLowerCase() || null;

    if (!userEmail) {
      return prompts.map((p) => ({ ...p, prayed_for_count: 0 }));
    }

    const countsMap = await this.getPromptPrayedForCountsBatch(
      prompts.map((p) => p.id),
      userEmail
    );

    return prompts.map((p) => ({
      ...p,
      prayed_for_count: countsMap[p.id] ?? 0,
    }));
  }

  /**
   * Batch-load Pray For counts for the given prompt ids and user email via RPC
   * (works for JWT and MFA; never relies on open table SELECT for anon).
   */
  async getPromptPrayedForCountsBatch(
    promptIds: string[],
    userEmail: string
  ): Promise<Record<string, number>> {
    try {
      if (promptIds.length === 0) {
        return {};
      }

      const email = userEmail.trim().toLowerCase();
      if (!email) {
        return {};
      }

      const { data, error } = await this.supabase.client.rpc(
        'get_prompt_prayed_for_counts',
        {
          p_prompt_ids: promptIds,
          p_user_email: email,
        }
      );

      if (error) throw error;

      const countsMap: Record<string, number> = {};
      (data || []).forEach((row: { prompt_id: string; prayed_for_count: number }) => {
        countsMap[row.prompt_id] = row.prayed_for_count ?? 0;
      });
      return countsMap;
    } catch (error) {
      console.error('Error fetching prompt prayed-for counts:', error);
      return {};
    }
  }

  /**
   * Clear or re-hydrate per-user counts when the logged-in email changes (logout / switch).
   * Uses the session email argument so counts hydrate even when Supabase auth is not ready yet.
   */
  private async onUserSessionEmailChange(email: string | null): Promise<void> {
    const generation = ++this.countsHydrateGeneration;
    const current = this.promptsSubject.value;
    if (!current.length) {
      return;
    }

    const cleared = current.map((p) => ({ ...p, prayed_for_count: 0 }));
    this.promptsSubject.next(cleared);

    if (!email) {
      return;
    }

    const withCounts = await this.attachPrayedForCounts(cleared, email);
    if (generation !== this.countsHydrateGeneration) {
      return;
    }
    this.promptsSubject.next(withCounts);
  }

  /**
   * Increment the current user's Pray For count for a prompt via RPC.
   * Updates in-memory prompts list only (no full refetch).
   */
  async incrementPromptPrayedFor(promptId: string): Promise<number | null> {
    try {
      const userEmail =
        this.userSessionService.getUserEmail()?.trim().toLowerCase() || null;
      if (!userEmail) {
        return null;
      }

      const generationAtStart = this.countsHydrateGeneration;

      const { data: newCount, error } = await this.supabase.client.rpc(
        'increment_prompt_prayed_for_count',
        {
          p_prompt_id: promptId,
          p_user_email: userEmail,
        }
      );

      if (error) throw error;
      const count = typeof newCount === 'number' && newCount > 0 ? newCount : null;
      if (count === null) return null;

      const stillLoggedIn =
        this.userSessionService.getUserEmail()?.trim().toLowerCase() === userEmail;
      if (!stillLoggedIn || generationAtStart !== this.countsHydrateGeneration) {
        return null;
      }

      // Invalidate in-flight hydrates so a late attach cannot overwrite this newer tally.
      this.countsHydrateGeneration += 1;

      const updated = this.promptsSubject.value.map((p) =>
        p.id === promptId ? { ...p, prayed_for_count: count } : p
      );
      this.promptsSubject.next(updated);

      return count;
    } catch (err) {
      console.error('[PromptService] incrementPromptPrayedFor failed', err);
      return null;
    }
  }

  /**
   * Add a new prompt
   */
  async addPrompt(prompt: Omit<PrayerPrompt, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .insert({
          title: prompt.title,
          type: prompt.type,
          description: prompt.description
        });

      if (error) throw error;

      this.toast.success('Prompt added successfully');
      await this.loadPrompts();
      return true;
    } catch (error) {
      console.error('Error adding prompt:', error);
      this.toast.error('Failed to add prompt');
      return false;
    }
  }

  /**
   * Update a prompt
   */
  async updatePrompt(id: string, updates: Partial<PrayerPrompt>): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      this.toast.success('Prompt updated successfully');
      await this.loadPrompts();
      return true;
    } catch (error) {
      console.error('Error updating prompt:', error);
      this.toast.error('Failed to update prompt');
      return false;
    }
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.prayerItemReminderService.dropRemindersForPrayer(id, 'prompt');
      this.toast.success('Prompt deleted successfully');
      await this.loadPrompts();
      return true;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      this.toast.error('Failed to delete prompt');
      return false;
    }
  }

  /**
   * Filter prompts by type
   */
  filterByType(type: string | null): PrayerPrompt[] {
    const allPrompts = this.promptsSubject.value;
    if (!type) return allPrompts;
    return allPrompts.filter(p => p.type === type);
  }
}
