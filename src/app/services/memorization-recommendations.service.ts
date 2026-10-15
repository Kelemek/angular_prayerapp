import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';
import {
  isBibleTranslation,
  type BibleTranslation,
  type MemorizationRecommendation,
  type MemorizationRecommendationCategory,
  type MemorizationRecommendationCategoryGroup,
  type MemorizationRecommendationCategoryRow,
  type MemorizationRecommendationRow,
} from '../types/memorization';

const CACHE_KEY = 'memorizationRecommendations';

export type AddRecommendationOutcome =
  | { ok: true; item: MemorizationRecommendation }
  | {
      ok: false;
      reason:
        | 'empty_reference'
        | 'missing_category'
        | 'duplicate'
        | 'db_error'
        | 'invalid_passage';
    };

export type AddCategoryOutcome =
  | { ok: true; category: MemorizationRecommendationCategory }
  | { ok: false; reason: 'empty_name' | 'duplicate' | 'db_error' };

export type DeleteCategoryOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_empty' | 'db_error' };

@Injectable({
  providedIn: 'root',
})
export class MemorizationRecommendationsService {
  private readonly itemsSubject = new BehaviorSubject<MemorizationRecommendation[]>([]);
  private readonly categoriesSubject = new BehaviorSubject<
    MemorizationRecommendationCategory[]
  >([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  /** Monotonic token so overlapping load() results cannot overwrite newer state. */
  private loadGeneration = 0;

  readonly items$ = this.itemsSubject.asObservable();
  readonly categories$ = this.categoriesSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private cache: CacheService
  ) {
    void this.load();
  }

  get snapshot(): MemorizationRecommendation[] {
    return this.itemsSubject.value;
  }

  get categoriesSnapshot(): MemorizationRecommendationCategory[] {
    return this.categoriesSubject.value;
  }

  get groupedSnapshot(): MemorizationRecommendationCategoryGroup[] {
    return groupByCategory(this.categoriesSubject.value, this.itemsSubject.value);
  }

  invalidateCache(): void {
    this.cache.invalidate(CACHE_KEY);
  }

  async load(force = false): Promise<MemorizationRecommendationCategoryGroup[]> {
    if (!force) {
      const cached = this.cache.get<{
        categories: MemorizationRecommendationCategory[];
        items: MemorizationRecommendation[];
      }>(CACHE_KEY);
      if (cached) {
        this.categoriesSubject.next(cached.categories);
        this.itemsSubject.next(cached.items);
        return groupByCategory(cached.categories, cached.items);
      }
    }

    const generation = ++this.loadGeneration;
    this.loadingSubject.next(true);

    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        (await this.supabase.db())
          .from('memorization_recommendation_categories')
          .select('*')
          .order('display_order', { ascending: true }),
        (await this.supabase.db())
          .from('memorization_recommendations')
          .select('*')
          .order('display_order', { ascending: true }),
      ]);

      if (generation !== this.loadGeneration) {
        return this.groupedSnapshot;
      }

      if (categoriesRes.error) throw categoriesRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const categories =
        (categoriesRes.data as MemorizationRecommendationCategoryRow[] | null)?.map(
          mapCategoryRow
        ) ?? [];
      const items =
        (itemsRes.data as MemorizationRecommendationRow[] | null)?.map(mapItemRow) ??
        [];

      this.invalidateCache();
      this.cache.set(CACHE_KEY, { categories, items });
      this.categoriesSubject.next(categories);
      this.itemsSubject.next(items);
      return groupByCategory(categories, items);
    } catch (err) {
      console.error('Failed to load memorization recommendations:', err);
      // Keep prior in-memory (and cache) state so a failed force refresh does not wipe the UI.
      return this.groupedSnapshot;
    } finally {
      if (generation === this.loadGeneration) {
        this.loadingSubject.next(false);
      }
    }
  }

  async addCategory(name: string): Promise<AddCategoryOutcome> {
    const normalized = name.trim();
    if (!normalized) return { ok: false, reason: 'empty_name' };

    const nextOrder =
      this.categoriesSubject.value.reduce(
        (max, c) => Math.max(max, c.displayOrder),
        -1
      ) + 1;

    const { data, error } = await (await this.supabase.db())
      .from('memorization_recommendation_categories')
      .insert({ name: normalized, display_order: nextOrder })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return { ok: false, reason: 'duplicate' };
      console.error('Failed to add recommendation category:', error);
      return { ok: false, reason: 'db_error' };
    }

    const category = mapCategoryRow(data as MemorizationRecommendationCategoryRow);
    this.categoriesSubject.next(
      [...this.categoriesSubject.value, category].sort(
        (a, b) => a.displayOrder - b.displayOrder
      )
    );
    this.commitLocalSnapshot();
    await this.load(true);
    return { ok: true, category };
  }

  async renameCategory(id: string, name: string): Promise<AddCategoryOutcome> {
    const normalized = name.trim();
    if (!normalized) return { ok: false, reason: 'empty_name' };

    const { data, error } = await (await this.supabase.db())
      .from('memorization_recommendation_categories')
      .update({ name: normalized })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return { ok: false, reason: 'duplicate' };
      console.error('Failed to rename recommendation category:', error);
      return { ok: false, reason: 'db_error' };
    }

    const category = mapCategoryRow(data as MemorizationRecommendationCategoryRow);
    this.categoriesSubject.next(
      this.categoriesSubject.value.map((c) => (c.id === id ? category : c))
    );
    this.commitLocalSnapshot();
    await this.load(true);
    return { ok: true, category };
  }

  async deleteCategory(id: string): Promise<DeleteCategoryOutcome> {
    const hasVerses = this.itemsSubject.value.some((i) => i.categoryId === id);
    if (hasVerses) return { ok: false, reason: 'not_empty' };

    const { error } = await (await this.supabase.db())
      .from('memorization_recommendation_categories')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') return { ok: false, reason: 'not_empty' };
      console.error('Failed to delete recommendation category:', error);
      return { ok: false, reason: 'db_error' };
    }

    this.categoriesSubject.next(
      this.categoriesSubject.value.filter((c) => c.id !== id)
    );
    this.commitLocalSnapshot();
    await this.load(true);
    return { ok: true };
  }

  async reorderCategories(idsInOrder: string[]): Promise<boolean> {
    if (idsInOrder.length === 0) return true;
    try {
      const { error } = await (await this.supabase.rpc(
        'reorder_memorization_recommendation_categories',
        { p_ordered_ids: idsInOrder }
      ));
      if (error) throw error;

      // Keep UI/service in sync even if the follow-up reload fails.
      this.applyCategoryOrderLocally(idsInOrder);
      this.commitLocalSnapshot();
      await this.load(true);
      return true;
    } catch (err) {
      console.error('Failed to reorder recommendation categories:', err);
      return false;
    }
  }

  async addRecommendation(
    reference: string,
    categoryId: string,
    translation: BibleTranslation = 'esv'
  ): Promise<AddRecommendationOutcome> {
    const normalizedRef = reference.trim();
    if (!normalizedRef) return { ok: false, reason: 'empty_reference' };
    if (!categoryId.trim()) return { ok: false, reason: 'missing_category' };
    if (!isBibleTranslation(translation)) {
      return { ok: false, reason: 'db_error' };
    }

    const nextOrder =
      this.itemsSubject.value
        .filter((i) => i.categoryId === categoryId)
        .reduce((max, item) => Math.max(max, item.displayOrder), -1) + 1;

    const { data, error } = await (await this.supabase.db())
      .from('memorization_recommendations')
      .insert({
        reference: normalizedRef,
        translation,
        category_id: categoryId,
        display_order: nextOrder,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return { ok: false, reason: 'duplicate' };
      console.error('Failed to add memorization recommendation:', error);
      return { ok: false, reason: 'db_error' };
    }

    const item = mapItemRow(data as MemorizationRecommendationRow);
    this.itemsSubject.next([...this.itemsSubject.value, item]);
    this.commitLocalSnapshot();
    await this.load(true);
    return { ok: true, item };
  }

  async removeRecommendation(id: string): Promise<boolean> {
    const { error } = await (await this.supabase.db())
      .from('memorization_recommendations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to remove memorization recommendation:', error);
      return false;
    }

    this.itemsSubject.next(this.itemsSubject.value.filter((i) => i.id !== id));
    this.commitLocalSnapshot();
    await this.load(true);
    return true;
  }

  async reorder(idsInOrder: string[]): Promise<boolean> {
    const categoryIdById = new Map(
      this.itemsSubject.value.map((item) => [item.id, item.categoryId])
    );
    const placements: { id: string; categoryId: string; displayOrder: number }[] =
      [];
    for (let displayOrder = 0; displayOrder < idsInOrder.length; displayOrder++) {
      const id = idsInOrder[displayOrder];
      const categoryId = categoryIdById.get(id);
      if (!categoryId) {
        console.error('Failed to reorder: unknown recommendation id', id);
        return false;
      }
      placements.push({ id, categoryId, displayOrder });
    }
    return this.persistVersePlacements(placements);
  }

  /**
   * Persist category membership and display_order for the given verses
   * (same-category reorder or move between categories) in one DB transaction.
   */
  async persistVersePlacements(
    placements: { id: string; categoryId: string; displayOrder: number }[]
  ): Promise<boolean> {
    if (placements.length === 0) return true;
    try {
      const { error } = await (await this.supabase.rpc(
        'apply_memorization_recommendation_placements',
        {
          p_placements: placements.map((p) => ({
            id: p.id,
            category_id: p.categoryId,
            display_order: p.displayOrder,
          })),
        }
      ));
      if (error) throw error;

      // Apply locally before reload so a failed load(true) cannot leave stale
      // subjects that syncFromService would treat as the source of truth.
      this.applyPlacementsLocally(placements);
      this.commitLocalSnapshot();
      await this.load(true);
      return true;
    } catch (err) {
      console.error('Failed to update memorization recommendation placement:', err);
      return false;
    }
  }

  /** Persist current subjects so a failed force reload does not leave cache empty/stale. */
  private commitLocalSnapshot(): void {
    this.cache.set(CACHE_KEY, {
      categories: this.categoriesSubject.value,
      items: this.itemsSubject.value,
    });
  }

  private applyPlacementsLocally(
    placements: { id: string; categoryId: string; displayOrder: number }[]
  ): void {
    const byId = new Map(placements.map((p) => [p.id, p]));
    this.itemsSubject.next(
      this.itemsSubject.value.map((item) => {
        const placement = byId.get(item.id);
        if (!placement) return item;
        return {
          ...item,
          categoryId: placement.categoryId,
          displayOrder: placement.displayOrder,
        };
      })
    );
  }

  private applyCategoryOrderLocally(idsInOrder: string[]): void {
    const orderById = new Map(idsInOrder.map((id, index) => [id, index]));
    this.categoriesSubject.next(
      [...this.categoriesSubject.value]
        .map((category) => ({
          ...category,
          displayOrder: orderById.get(category.id) ?? category.displayOrder,
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder)
    );
  }
}

function mapCategoryRow(
  row: MemorizationRecommendationCategoryRow
): MemorizationRecommendationCategory {
  return {
    id: row.id,
    name: row.name,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItemRow(row: MemorizationRecommendationRow): MemorizationRecommendation {
  const translation = isBibleTranslation(row.translation) ? row.translation : 'esv';
  return {
    id: row.id,
    reference: row.reference,
    translation,
    categoryId: row.category_id,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function groupByCategory(
  categories: MemorizationRecommendationCategory[],
  items: MemorizationRecommendation[]
): MemorizationRecommendationCategoryGroup[] {
  return categories.map((category) => ({
    category: { ...category },
    items: items
      .filter((i) => i.categoryId === category.id)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((i) => ({ ...i })),
  }));
}
