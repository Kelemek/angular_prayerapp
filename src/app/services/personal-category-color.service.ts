import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';
import { UserSessionService } from './user-session.service';
import { ToastService } from './toast.service';
import {
  getPersonalCategoryColor,
  normalizePersonalCategoryHexColor,
  sanitizePersonalCategoryName,
} from '../../utils/personalCategoryColor';

export type PersonalCategoryColorMap = Record<string, string>;

@Injectable({
  providedIn: 'root',
})
export class PersonalCategoryColorService {
  private readonly colorsSubject = new BehaviorSubject<PersonalCategoryColorMap>(
    {}
  );

  readonly colors$ = this.colorsSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private cache: CacheService,
    private userSessionService: UserSessionService,
    private toast: ToastService
  ) {
    this.userSessionService.userSession$
      .pipe(
        distinctUntilChanged((prev, curr) => prev?.email === curr?.email)
      )
      .subscribe((session) => {
        if (!session?.email) {
          this.invalidate();
          return;
        }
        this.invalidate();
        void this.loadColors(true);
      });
  }

  getColorsSnapshot(): PersonalCategoryColorMap {
    return this.colorsSubject.value;
  }

  getColor(
    category: string | null | undefined,
    map?: PersonalCategoryColorMap
  ): string {
    return getPersonalCategoryColor(
      category,
      map ?? this.colorsSubject.value
    );
  }

  async loadColors(forceRefresh = false): Promise<PersonalCategoryColorMap> {
    const userEmail = await this.userSessionService.resolveUserEmail();
    if (!userEmail) {
      this.colorsSubject.next({});
      return {};
    }

    const loadForEmail = userEmail.toLowerCase().trim();

    const cached = this.cache.get<PersonalCategoryColorMap>(
      'personalCategoryColors'
    );
    if (cached && !forceRefresh) {
      this.colorsSubject.next(cached);
      return cached;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('personal_prayer_category_colors')
        .select('category, color')
        .ilike('user_email', userEmail);

      if (error) {
        throw error;
      }

      const currentEmail = await this.userSessionService.resolveUserEmail();
      if (
        !currentEmail ||
        currentEmail.toLowerCase().trim() !== loadForEmail
      ) {
        return this.colorsSubject.value;
      }

      const map: PersonalCategoryColorMap = {};
      for (const row of data ?? []) {
        const category = sanitizePersonalCategoryName(row.category);
        const color = normalizePersonalCategoryHexColor(row.color);
        if (category && color) {
          map[category] = color;
        }
      }

      this.cache.set('personalCategoryColors', map);
      this.colorsSubject.next(map);
      return map;
    } catch (err) {
      console.error('[PersonalCategoryColorService] Failed to load colors:', err);
      if (cached) {
        this.colorsSubject.next(cached);
        return cached;
      }
      return {};
    }
  }

  async setColor(category: string, color: string): Promise<boolean> {
    const sanitizedCategory = sanitizePersonalCategoryName(category);
    const normalizedColor = normalizePersonalCategoryHexColor(color);
    if (!sanitizedCategory || !normalizedColor) {
      return false;
    }

    const userEmail = await this.userSessionService.resolveUserEmail();
    if (!userEmail) {
      this.toast.error('User email not available');
      return false;
    }

    const setForEmail = userEmail.toLowerCase().trim();

    try {
      const { error } = await this.supabase.client
        .from('personal_prayer_category_colors')
        .upsert(
          {
            user_email: userEmail,
            category: sanitizedCategory,
            color: normalizedColor,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_email,category' }
        );

      if (error) {
        throw error;
      }

      const currentEmail = await this.userSessionService.resolveUserEmail();
      if (
        !currentEmail ||
        currentEmail.toLowerCase().trim() !== setForEmail
      ) {
        return true;
      }

      const updated = {
        ...this.colorsSubject.value,
        [sanitizedCategory]: normalizedColor,
      };
      this.colorsSubject.next(updated);
      this.cache.set('personalCategoryColors', updated);
      return true;
    } catch (err) {
      console.error('[PersonalCategoryColorService] Failed to set color:', err);
      this.toast.error(this.formatSetColorError(err));
      return false;
    }
  }

  invalidate(): void {
    this.colorsSubject.next({});
    this.cache.invalidate('personalCategoryColors');
  }

  private formatSetColorError(err: unknown): string {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : '';

    if (
      message.includes('personal_prayer_category_colors') &&
      (message.includes('does not exist') || message.includes('Could not find'))
    ) {
      return 'Category colors need a database update. Apply the latest Supabase migration.';
    }

    if (message.includes('foreign key constraint')) {
      return 'Could not save category color for this account email.';
    }

    if (message.includes('row-level security') || message.includes('permission denied')) {
      return 'Permission denied saving category color. Try signing in again.';
    }

    return message ? `Failed to save category color: ${message}` : 'Failed to save category color';
  }
}
