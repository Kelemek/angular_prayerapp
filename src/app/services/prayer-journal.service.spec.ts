import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BehaviorSubject } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { resetPrayerJournalFeedForTests } from '../lib/prayer-journal-feed';
import {
  PrayerJournalService,
  resetPrayerJournalServiceForTests,
} from './prayer-journal.service';

const SQL_LIKE = "'); drop table x;--";

interface QueryState {
  upserts: { row: Record<string, unknown>; options: unknown }[];
  filters: { op: string; column: string; value: unknown }[];
  single: { data: { content: string } | null; error: null };
  list: { data: { prayer_kind: string; prayer_id: string }[]; error: null };
  mode: 'select' | 'delete';
}

function createHarness(email: string | null = 'a@b.com') {
  const session$ = new BehaviorSubject<{ email: string } | null>(
    email ? { email } : null
  );
  const state: QueryState = {
    upserts: [],
    filters: [],
    single: { data: null, error: null },
    list: { data: [], error: null },
    mode: 'select',
  };
  const query: Record<string, unknown> = {};
  const chain = () => query;
  query['select'] = () => {
    state.mode = 'select';
    return chain();
  };
  query['eq'] = (column: string, value: unknown) => {
    state.filters.push({ op: 'eq', column, value });
    return chain();
  };
  query['in'] = (column: string, value: unknown) => {
    state.filters.push({ op: 'in', column, value });
    return chain();
  };
  query['upsert'] = (row: Record<string, unknown>, options: unknown) => {
    state.upserts.push({ row, options });
    return Promise.resolve({ error: null });
  };
  query['delete'] = () => {
    state.mode = 'delete';
    return chain();
  };
  query['maybeSingle'] = () => Promise.resolve(state.single);
  let releaseSelect: () => void = () => undefined;
  const selectGate = new Promise<void>((resolve) => {
    releaseSelect = resolve;
  });
  let selectStarted: () => void = () => undefined;
  const selectStartedGate = new Promise<void>((resolve) => {
    selectStarted = resolve;
  });
  let hangSelect = false;
  query['then'] = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown
  ) => {
    const result = state.mode === 'delete' ? { error: null } : state.list;
    if (hangSelect && state.mode === 'select') {
      hangSelect = false;
      selectStarted();
      return selectGate.then(() => result).then(resolve, reject);
    }
    return Promise.resolve(result).then(resolve, reject);
  };

  let releaseDb: () => void = () => undefined;
  const dbGate = new Promise<void>((resolve) => {
    releaseDb = resolve;
  });
  let dbCalls = 0;
  let hangNextDb = false;
  const supabase = {
    db: async () => {
      dbCalls += 1;
      if (hangNextDb) {
        hangNextDb = false;
        await dbGate;
      }
      return {
        from: () => query,
        auth: {
          getSession: async () => ({
            data: { session: { user: { id: 'user-1' } } },
          }),
        },
      };
    },
  };
  const userSession = {
    userSession$: session$,
    getUserEmail: () => session$.value?.email ?? null,
  };
  const service = new PrayerJournalService(supabase as never, userSession as never);
  return {
    service,
    state,
    session$,
    releaseDb,
    armHang: () => {
      hangNextDb = true;
    },
    armHangSelect: () => {
      hangSelect = true;
    },
    releaseSelect,
    selectStarted: selectStartedGate,
  };
}

describe('PrayerJournalService', () => {
  afterEach(() => {
    resetPrayerJournalServiceForTests();
    resetPrayerJournalFeedForTests();
  });

  it('round-trips SQL-like text as a bound column value', async () => {
    const { service, state } = createHarness();
    const saved = await service.save('community', 'prayer-1', SQL_LIKE);
    expect(saved).toBe(true);
    expect(state.upserts).toHaveLength(1);
    const payload = state.upserts[0];
    expect(payload?.row).toEqual({
      user_id: 'user-1',
      prayer_kind: 'community',
      prayer_id: 'prayer-1',
      content: SQL_LIKE,
    });
    expect(payload?.options).toEqual({
      onConflict: 'user_id,prayer_kind,prayer_id',
    });
    expect(JSON.stringify(payload)).not.toMatch(/insert\s+into/i);
    state.single = { data: { content: SQL_LIKE }, error: null };
    await expect(service.getNote('community', 'prayer-1')).resolves.toBe(SQL_LIKE);
  });

  it('loads note presence for a feed in one in-list query', async () => {
    const { service, state } = createHarness();
    state.list = {
      data: [{ prayer_kind: 'community', prayer_id: 'b' }],
      error: null,
    };
    await service.loadPresence([
      { kind: 'community', prayerId: 'a' },
      { kind: 'community', prayerId: 'b' },
      { kind: 'personal', prayerId: 'c' },
    ]);
    const inFilters = state.filters.filter((filter) => filter.op === 'in');
    expect(inFilters.find((filter) => filter.column === 'prayer_id')?.value).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(inFilters.find((filter) => filter.column === 'prayer_kind')?.value).toEqual([
      'community',
      'personal',
    ]);
    expect(service.hasNote('community', 'b')).toBe(true);
    expect(service.hasNote('community', 'a')).toBe(false);
    expect(service.hasNote('personal', 'c')).toBe(false);
  });

  it('keeps a note saved while a presence query is still in flight', async () => {
    const { service, state, armHangSelect, releaseSelect, selectStarted } = createHarness();
    state.list = { data: [], error: null };
    armHangSelect();
    const pending = service.loadPresence([
      { kind: 'community', prayerId: 'prayer-1' },
    ]);
    await selectStarted;
    await service.save('community', 'prayer-1', 'kept');
    releaseSelect();
    await pending;
    expect(service.hasNote('community', 'prayer-1')).toBe(true);
  });

  it('drops an in-flight presence result after logout', async () => {
    const { service, state, session$, releaseDb, armHang } = createHarness();
    state.list = {
      data: [{ prayer_kind: 'community', prayer_id: 'prayer-1' }],
      error: null,
    };
    armHang();
    const pending = service.loadPresence([
      { kind: 'community', prayerId: 'prayer-1' },
    ]);
    session$.next(null);
    releaseDb();
    await pending;
    expect(service.hasNote('community', 'prayer-1')).toBe(false);
  });

  it('passes note text only as query-builder values', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app/services/prayer-journal.service.ts'),
      'utf8'
    );
    expect(source).toContain('.upsert(');
    expect(source).not.toMatch(/\$\{[^}]*content/);
    expect(source).not.toMatch(/execute\s*\(\s*['"`]/i);
  });
});
