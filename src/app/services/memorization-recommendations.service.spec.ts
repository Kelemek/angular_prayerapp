import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemorizationRecommendationsService } from './memorization-recommendations.service';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';

const CAT_ID = 'cat-general';

function makeCategoryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: CAT_ID,
    name: 'General',
    display_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'rec-1',
    reference: 'John 3:16',
    translation: 'esv',
    category_id: CAT_ID,
    display_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('MemorizationRecommendationsService', () => {
  let service: MemorizationRecommendationsService;
  let fromMock: ReturnType<typeof vi.fn>;
  let rpcMock: ReturnType<typeof vi.fn>;
  let cache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    fromMock = vi.fn();
    rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    cache = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      invalidate: vi.fn(),
    };
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({ order }),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    });
    const supabase = wireGatedSupabaseMock({
      client: { from: fromMock, rpc: rpcMock },
    });
    service = new MemorizationRecommendationsService(supabase as any, cache as any);
    await Promise.resolve();
    await Promise.resolve();
    fromMock.mockClear();
    rpcMock.mockClear();
    cache.get.mockClear();
    cache.set.mockClear();
    cache.invalidate.mockClear();
  });

  function mockLoadTables(
    categories: ReturnType<typeof makeCategoryRow>[],
    items: ReturnType<typeof makeRow>[]
  ): void {
    fromMock.mockImplementation((table: string) => {
      if (table === 'memorization_recommendation_categories') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: categories, error: null }),
          }),
          insert: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: items, error: null }),
        }),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
    });
  }

  function mockDeferredLoad(
    categories: ReturnType<typeof makeCategoryRow>[],
    items: ReturnType<typeof makeRow>[]
  ): { resolve: () => void; promise: Promise<void> } {
    let resolve!: () => void;
    const gate = new Promise<void>((r) => {
      resolve = r;
    });
    fromMock.mockImplementation((table: string) => {
      const data =
        table === 'memorization_recommendation_categories' ? categories : items;
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockImplementation(async () => {
            await gate;
            return { data, error: null };
          }),
        }),
      };
    });
    return { resolve: () => resolve(), promise: gate };
  }

  it('load maps categories and items into grouped snapshot and caches both', async () => {
    mockLoadTables(
      [makeCategoryRow()],
      [
        makeRow({ id: 'a', reference: 'Romans 8:28', display_order: 0 }),
        makeRow({ id: 'b', reference: 'John 3:16', display_order: 1 }),
      ]
    );

    const groups = await service.load(true);

    expect(groups).toHaveLength(1);
    expect(groups[0].category.name).toBe('General');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].items[0].reference).toBe('Romans 8:28');
    expect(groups[0].items[0].categoryId).toBe(CAT_ID);
    expect(cache.invalidate).toHaveBeenCalledWith('memorizationRecommendations');
    expect(cache.set).toHaveBeenCalledWith(
      'memorizationRecommendations',
      expect.objectContaining({
        categories: expect.any(Array),
        items: expect.any(Array),
      })
    );
    expect(service.groupedSnapshot).toEqual(groups);
  });

  it('ignores stale load results when a newer load finishes first', async () => {
    const stale = mockDeferredLoad(
      [makeCategoryRow({ name: 'Stale' })],
      [makeRow({ id: 'stale', reference: 'Stale 1:1' })]
    );
    const stalePromise = service.load(true);

    mockLoadTables(
      [makeCategoryRow({ name: 'Fresh' })],
      [makeRow({ id: 'fresh', reference: 'Fresh 1:1' })]
    );
    const freshGroups = await service.load(true);
    expect(freshGroups[0].category.name).toBe('Fresh');
    expect(service.snapshot[0].reference).toBe('Fresh 1:1');

    stale.resolve();
    await stalePromise;

    expect(service.snapshot[0].reference).toBe('Fresh 1:1');
    expect(service.categoriesSnapshot[0].name).toBe('Fresh');
  });

  it('keeps prior data when force load fails', async () => {
    mockLoadTables(
      [makeCategoryRow()],
      [makeRow({ reference: 'John 3:16' })]
    );
    await service.load(true);
    expect(service.snapshot).toHaveLength(1);
    cache.invalidate.mockClear();

    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'network' },
        }),
      }),
    }));

    const groups = await service.load(true);
    expect(groups[0].items[0].reference).toBe('John 3:16');
    expect(service.snapshot).toHaveLength(1);
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it('invalidateCache uses the same logical key as get/set', () => {
    service.invalidateCache();
    expect(cache.invalidate).toHaveBeenCalledWith('memorizationRecommendations');
  });

  it('addRecommendation requires categoryId', async () => {
    const result = await service.addRecommendation('John 3:16', '  ');
    expect(result).toEqual({ ok: false, reason: 'missing_category' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('addRecommendation inserts with category_id and reloads', async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: makeRow({ id: 'new', reference: 'Psalm 23:1', display_order: 0 }),
      error: null,
    });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
    const insert = vi.fn().mockReturnValue({ select: insertSelect });

    fromMock.mockImplementation((table: string) => {
      if (table === 'memorization_recommendations') {
        return {
          insert,
          select: vi.fn().mockReturnValue({
            order: vi
              .fn()
              .mockResolvedValue({
                data: [makeRow({ id: 'new', reference: 'Psalm 23:1' })],
                error: null,
              }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [makeCategoryRow()], error: null }),
        }),
      };
    });

    const result = await service.addRecommendation('Psalm 23:1', CAT_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.reference).toBe('Psalm 23:1');
      expect(result.item.categoryId).toBe(CAT_ID);
    }
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'Psalm 23:1',
        category_id: CAT_ID,
      })
    );
    expect(cache.invalidate).toHaveBeenCalled();
  });

  it('addRecommendation persists non-ESV translation in insert payload', async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: makeRow({ id: 'new', reference: 'John 3:16', translation: 'niv' }),
      error: null,
    });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
    const insert = vi.fn().mockReturnValue({ select: insertSelect });

    fromMock.mockImplementation((table: string) => {
      if (table === 'memorization_recommendations') {
        return {
          insert,
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [makeCategoryRow()], error: null }),
        }),
      };
    });

    const result = await service.addRecommendation('John 3:16', CAT_ID, 'niv');
    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'John 3:16',
        translation: 'niv',
        category_id: CAT_ID,
      })
    );
  });

  it('addRecommendation returns duplicate on unique violation', async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate' },
    });
    fromMock.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: insertSingle }),
      }),
    });

    const result = await service.addRecommendation('John 3:16', CAT_ID);
    expect(result).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('addRecommendation rejects empty reference', async () => {
    const result = await service.addRecommendation('   ', CAT_ID);
    expect(result).toEqual({ ok: false, reason: 'empty_reference' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('addCategory inserts and reloads', async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: makeCategoryRow({ id: 'cat-2', name: 'Comfort', display_order: 1 }),
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === 'memorization_recommendation_categories') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: insertSingle }),
          }),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                makeCategoryRow(),
                makeCategoryRow({ id: 'cat-2', name: 'Comfort', display_order: 1 }),
              ],
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const result = await service.addCategory('Comfort');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.category.name).toBe('Comfort');
    }
  });

  it('addCategory keeps local category when reload fails after insert', async () => {
    mockLoadTables([makeCategoryRow()], []);
    await service.load(true);

    const insertSingle = vi.fn().mockResolvedValue({
      data: makeCategoryRow({ id: 'cat-2', name: 'Comfort', display_order: 1 }),
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === 'memorization_recommendation_categories') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: insertSingle }),
          }),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'network' },
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'network' },
          }),
        }),
      };
    });

    const result = await service.addCategory('Comfort');
    expect(result.ok).toBe(true);
    expect(service.categoriesSnapshot.map((c) => c.name)).toEqual([
      'General',
      'Comfort',
    ]);
  });

  it('removeRecommendation keeps local removal when reload fails after delete', async () => {
    mockLoadTables([makeCategoryRow()], [makeRow({ id: 'rec-1' })]);
    await service.load(true);

    const delEq = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === 'memorization_recommendations') {
        return {
          delete: vi.fn().mockReturnValue({ eq: delEq }),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'network' },
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'network' },
          }),
        }),
      };
    });

    const ok = await service.removeRecommendation('rec-1');
    expect(ok).toBe(true);
    expect(service.snapshot).toHaveLength(0);
  });

  it('deleteCategory blocks when category still has verses', async () => {
    mockLoadTables(
      [makeCategoryRow()],
      [makeRow({ category_id: CAT_ID })]
    );
    await service.load(true);
    fromMock.mockClear();

    const result = await service.deleteCategory(CAT_ID);
    expect(result).toEqual({ ok: false, reason: 'not_empty' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('deleteCategory removes empty category', async () => {
    mockLoadTables([makeCategoryRow()], []);
    await service.load(true);

    const delEq = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === 'memorization_recommendation_categories') {
        return {
          delete: vi.fn().mockReturnValue({ eq: delEq }),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const result = await service.deleteCategory(CAT_ID);
    expect(result).toEqual({ ok: true });
    expect(delEq).toHaveBeenCalledWith('id', CAT_ID);
  });

  it('reorderCategories applies order via atomic RPC then reloads', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    mockLoadTables(
      [
        makeCategoryRow({ id: 'b', display_order: 0 }),
        makeCategoryRow({ id: 'a', display_order: 1 }),
      ],
      []
    );

    const ok = await service.reorderCategories(['b', 'a']);
    expect(ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith(
      'reorder_memorization_recommendation_categories',
      { p_ordered_ids: ['b', 'a'] }
    );
  });

  it('groupedSnapshot clones items so UI mutations do not touch service cache', async () => {
    mockLoadTables(
      [makeCategoryRow()],
      [makeRow({ id: 'rec-1', category_id: CAT_ID })]
    );
    await service.load(true);

    const groupItem = service.groupedSnapshot[0].items[0];
    groupItem.categoryId = 'mutated';
    expect(service.snapshot[0].categoryId).toBe(CAT_ID);
  });

  it('persistVersePlacements applies placements via atomic RPC then reloads', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    mockLoadTables(
      [
        makeCategoryRow(),
        makeCategoryRow({ id: 'cat-2', name: 'Comfort', display_order: 1 }),
      ],
      [makeRow({ id: 'rec-1', category_id: 'cat-2', display_order: 0 })]
    );

    const ok = await service.persistVersePlacements([
      { id: 'rec-1', categoryId: 'cat-2', displayOrder: 0 },
    ]);
    expect(ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith(
      'apply_memorization_recommendation_placements',
      {
        p_placements: [
          {
            id: 'rec-1',
            category_id: 'cat-2',
            display_order: 0,
          },
        ],
      }
    );
    expect(service.snapshot[0].categoryId).toBe('cat-2');
  });

  it('persistVersePlacements keeps local placement when reload fails after RPC success', async () => {
    mockLoadTables(
      [makeCategoryRow(), makeCategoryRow({ id: 'cat-2', name: 'Comfort', display_order: 1 })],
      [makeRow({ id: 'rec-1', category_id: CAT_ID, display_order: 0 })]
    );
    await service.load(true);

    rpcMock.mockResolvedValue({ data: null, error: null });
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'network' },
        }),
      }),
    }));

    const ok = await service.persistVersePlacements([
      { id: 'rec-1', categoryId: 'cat-2', displayOrder: 0 },
    ]);
    expect(ok).toBe(true);
    expect(service.snapshot[0].categoryId).toBe('cat-2');
    expect(service.groupedSnapshot.find((g) => g.category.id === 'cat-2')?.items).toHaveLength(
      1
    );
  });

  it('reorder updates display_order for each verse id via RPC', async () => {
    mockLoadTables(
      [makeCategoryRow()],
      [
        makeRow({ id: 'a', display_order: 0 }),
        makeRow({ id: 'b', display_order: 1 }),
      ]
    );
    await service.load(true);

    rpcMock.mockResolvedValue({ data: null, error: null });
    mockLoadTables(
      [makeCategoryRow()],
      [
        makeRow({ id: 'b', display_order: 0 }),
        makeRow({ id: 'a', display_order: 1 }),
      ]
    );

    const ok = await service.reorder(['b', 'a']);
    expect(ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith(
      'apply_memorization_recommendation_placements',
      {
        p_placements: [
          { id: 'b', category_id: CAT_ID, display_order: 0 },
          { id: 'a', category_id: CAT_ID, display_order: 1 },
        ],
      }
    );
  });

  it('removeRecommendation deletes by id', async () => {
    const delEq = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === 'memorization_recommendations') {
        return {
          delete: vi.fn().mockReturnValue({ eq: delEq }),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [makeCategoryRow()], error: null }),
        }),
      };
    });

    const ok = await service.removeRecommendation('rec-1');
    expect(ok).toBe(true);
    expect(delEq).toHaveBeenCalledWith('id', 'rec-1');
  });
});
