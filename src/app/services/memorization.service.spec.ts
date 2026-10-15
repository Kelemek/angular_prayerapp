import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';
import { BehaviorSubject } from 'rxjs';
import { MemorizationService } from './memorization.service';

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'row-1',
    user_email: 'user@test.com',
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd',
    translation: 'esv',
    kind: 'verse',
    bible_books_scope: null,
    date_added: '2026-01-01T00:00:00Z',
    last_practiced_at: null,
    practice_sessions: [],
    in_progress_practice: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('MemorizationService', () => {
  let service: MemorizationService;
  let supabase: {
    client: {
      from: ReturnType<typeof vi.fn>;
      auth: { getUser: ReturnType<typeof vi.fn> };
    };
  };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let userSession: {
    userSession$: BehaviorSubject<{ email: string } | null>;
    getCurrentSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();
    supabase = {
      client: {
        from: vi.fn(),
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'user@test.com' } } }),
        },
      },
    };
    wireGatedSupabaseMock(supabase);
    toast = { success: vi.fn(), error: vi.fn() };
    userSession = {
      userSession$: new BehaviorSubject<{ email: string } | null>({ email: 'user@test.com' }),
      getCurrentSession: vi.fn(() => ({ email: 'user@test.com' })),
    };
    service = new MemorizationService(supabase as never, toast, userSession as never);
  });

  it('getPreferredTranslation defaults to esv', () => {
    expect(service.getPreferredTranslation()).toBe('esv');
  });

  it('setPreferredTranslation persists valid translation to localStorage', () => {
    service.setPreferredTranslation('niv');
    expect(localStorage.getItem('prayer_app_preferred_bible_translation')).toBe('niv');
    expect(service.getPreferredTranslation()).toBe('niv');
  });

  it('getPreferredTranslation ignores invalid stored value', () => {
    localStorage.setItem('prayer_app_preferred_bible_translation', 'invalid');
    expect(service.getPreferredTranslation()).toBe('esv');
  });

  it('addVerse rejects duplicate reference+translation', async () => {
    (service as unknown as { itemsSubject: { next: (v: unknown[]) => void } }).itemsSubject.next([
      {
        id: 'existing',
        reference: 'John 3:16',
        text: 'verse',
        translation: 'esv',
        dateAdded: 1,
        lastPracticedAt: null,
        practiceSessions: [],
        kind: 'verse',
      },
    ]);

    const result = await service.addVerse('John 3:16', 'esv');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('duplicate');
  });

  it('addVerse rejects empty reference', async () => {
    expect(await service.addVerse('  ')).toEqual({ ok: false, reason: 'empty_reference' });
  });

  it('addVerse returns no_user when not signed in', async () => {
    userSession.getCurrentSession.mockReturnValue(null);
    supabase.client.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await service.addVerse('John 3:16');
    expect(result).toEqual({ ok: false, reason: 'no_user' });
  });

  it('addVerse succeeds and prepends item', async () => {
    const row = makeRow({ id: 'new-1', reference: 'John 3:16', text: '' });
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    supabase.client.from = vi.fn().mockReturnValue({ insert });

    const result = await service.addVerse('John 3:16', 'esv');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ reference: 'John 3:16', text: '', translation: 'esv' })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.reference).toBe('John 3:16');
      expect(service.items[0].id).toBe('new-1');
    }
  });

  it('addVerse returns db_error on insert failure', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    supabase.client.from = vi.fn().mockReturnValue({ insert });

    const result = await service.addVerse('Romans 8:28');
    expect(result).toEqual({ ok: false, reason: 'db_error' });
  });

  it('addBibleBooks rejects duplicate scope', async () => {
    (service as unknown as { itemsSubject: { next: (v: unknown[]) => void } }).itemsSubject.next([
      {
        id: 'bb',
        reference: 'Bible Books',
        text: 'Genesis',
        translation: 'esv',
        dateAdded: 1,
        lastPracticedAt: null,
        practiceSessions: [],
        kind: 'bibleBooks',
        bibleBooksScope: 'all',
      },
    ]);
    const result = await service.addBibleBooks('all');
    expect(result).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('addBibleBooks succeeds', async () => {
    const row = makeRow({
      id: 'bb-1',
      reference: 'Bible Books (OT)',
      text: 'Genesis Exodus',
      kind: 'bibleBooks',
      bible_books_scope: 'ot',
    });
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    supabase.client.from = vi.fn().mockReturnValue({ insert });

    const result = await service.addBibleBooks('ot');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.item.kind).toBe('bibleBooks');
  });

  it('loadItems maps rows to MemorizedItem', async () => {
    const row = makeRow();
    const order = vi.fn().mockResolvedValue({ data: [row], error: null });
    const ilike = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ ilike });
    supabase.client.from = vi.fn().mockReturnValue({ select });

    service = new MemorizationService(supabase as never, toast, userSession as never);
    await service.loadItems();

    expect(service.items).toHaveLength(1);
    expect(service.items[0].reference).toBe('Psalm 23:1');
    expect(service.items[0].translation).toBe('esv');
  });

  it('loadItems shows toast on error', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'db' } });
    const ilike = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ ilike });
    supabase.client.from = vi.fn().mockReturnValue({ select });

    await service.loadItems();
    expect(toast.error).toHaveBeenCalledWith('Failed to load memorization list');
  });

  it('loadItems clears items when no user email', async () => {
    userSession.getCurrentSession.mockReturnValue(null);
    supabase.client.auth.getUser.mockResolvedValue({ data: { user: null } });
    (service as unknown as { itemsSubject: { next: (v: unknown[]) => void } }).itemsSubject.next([
      { id: 'old' } as never,
    ]);

    await service.loadItems();
    expect(service.items).toEqual([]);
  });

  it('removeItem removes from list on success', async () => {
    (service as unknown as { itemsSubject: { next: (v: unknown[]) => void } }).itemsSubject.next([
      { id: 'a', reference: 'A' } as never,
      { id: 'b', reference: 'B' } as never,
    ]);
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    supabase.client.from = vi.fn().mockReturnValue({ delete: del });

    const ok = await service.removeItem('a');
    expect(ok).toBe(true);
    expect(service.items.map((i) => i.id)).toEqual(['b']);
  });

  it('removeItem returns false and toasts on error', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const del = vi.fn().mockReturnValue({ eq });
    supabase.client.from = vi.fn().mockReturnValue({ delete: del });

    const ok = await service.removeItem('missing');
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Failed to remove item');
  });

  it('updatePracticeStats updates item and returns it', async () => {
    const existing = {
      id: 'v1',
      reference: 'John 3:16',
      text: 'text',
      translation: 'esv' as const,
      dateAdded: 1,
      lastPracticedAt: null,
      practiceSessions: [],
    };
    (service as unknown as { itemsSubject: { next: (v: unknown[]) => void } }).itemsSubject.next([existing]);

    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    supabase.client.from = vi.fn().mockReturnValue({ update });

    const updated = await service.updatePracticeStats('v1', {
      wrongAttempts: 2,
      correctKeystrokes: 5,
      completed: true,
    });
    expect(updated?.practiceSessions).toHaveLength(1);
    expect(updated?.practiceSessions[0].completed).toBe(true);
    expect(service.items[0].practiceSessions).toHaveLength(1);
  });

  it('updatePracticeStats returns null for missing item or db error', async () => {
    expect(await service.updatePracticeStats('nope', { wrongAttempts: 0, correctKeystrokes: 0, completed: false })).toBeNull();

    (service as unknown as { itemsSubject: { next: (v: unknown[]) => void } }).itemsSubject.next([
      { id: 'v1', reference: 'R', text: 't', translation: 'esv', dateAdded: 1, lastPracticedAt: null, practiceSessions: [] },
    ]);
    const eq = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const update = vi.fn().mockReturnValue({ eq });
    supabase.client.from = vi.fn().mockReturnValue({ update });
    expect(
      await service.updatePracticeStats('v1', { wrongAttempts: 0, correctKeystrokes: 0, completed: true })
    ).toBeNull();
  });

  it('saveInProgress updates local state on success', async () => {
    (service as unknown as { itemsSubject: { next: (v: unknown[]) => void } }).itemsSubject.next([
      { id: 'v1', reference: 'R', text: 't', translation: 'esv', dateAdded: 1, lastPracticedAt: null, practiceSessions: [], inProgressPractice: null },
    ]);
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    supabase.client.from = vi.fn().mockReturnValue({ update });

    await service.saveInProgress('v1', {
      sessionSeed: 'seed',
      wrongAttempts: 1,
      correctKeystrokes: 2,
      phase: { kind: 'inRound', roundIndex: 0 },
    });
    expect(service.items[0].inProgressPractice?.sessionSeed).toBe('seed');
  });

  it('clearInProgress nulls in-progress practice', async () => {
    (service as unknown as { itemsSubject: { next: (v: unknown[]) => void } }).itemsSubject.next([
      {
        id: 'v1',
        reference: 'R',
        text: 't',
        translation: 'esv',
        dateAdded: 1,
        lastPracticedAt: null,
        practiceSessions: [],
        inProgressPractice: { sessionSeed: 's', wrongAttempts: 0, correctKeystrokes: 0, updatedAt: 1, phase: { kind: 'inRound', roundIndex: 0 } },
      },
    ]);
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    supabase.client.from = vi.fn().mockReturnValue({ update });

    await service.clearInProgress('v1');
    expect(service.items[0].inProgressPractice).toBeNull();
  });

  it('clears items when session logs out', () => {
    (service as unknown as { itemsSubject: { next: (v: unknown[]) => void } }).itemsSubject.next([
      { id: 'x' } as never,
    ]);
    userSession.userSession$.next(null);
    expect(service.items).toEqual([]);
  });
});
