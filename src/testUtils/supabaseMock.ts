/* Single-file supabase mock implementation used by tests.
   - Provides a small chainable supabase-like API: from(...).select().eq(...).maybeSingle()
   - Implements insert/update/delete that operate on `__testData` (fromData) so tests can inspect state
   - Provides a lightweight channel with on/subscribe and an internal __trigger for test-driven events
   - Makes `from` and `channel` spyable under Vitest by wrapping with `vi.fn()` if available
*/

type Row = Record<string, any>;

export function createSupabaseMock(
  opts: {
    fromData?: Record<string, Row[]>;
    authSession?: any;
    functionsInvoke?: (name: string, args?: any) => Promise<any>;
  } = {},
) {
  const fromData: Record<string, Row[]> = opts.fromData || {};
  const maybeVi = (globalThis as any).vi;

  class Query {
    table: string;
    selectOpts: any = null;
    // pending operation when insert/update/delete called before select
    pendingOp: { type: "insert" | "update" | "delete"; payload?: any } | null =
      null;
    filters: Array<(r: Row) => boolean> = [];
    orderBy: { col: string; asc?: boolean } | null = null;
    rangeStart: number | null = null;
    rangeEnd: number | null = null;
    limitN: number | null = null;

    constructor(table: string) {
      this.table = table;
    }

    select(_cols?: string | string[], opts?: any) {
      this.selectOpts = opts || null;
      // If there is a pending mutation op, execute it and return a lightweight result object
      if (this.pendingOp) {
        const res = this._executePendingOp();
        const wrapped = {
          async single() {
            return { data: res.data.length ? res.data[0] : null, error: null };
          },
          async maybeSingle() {
            return { data: res.data.length ? res.data[0] : null, error: null };
          },
          then(cb: any) {
            return cb({ data: res.data, error: null });
          },
        };
        return wrapped;
      }

      return this;
    }
    eq(column: string, value: any) {
      this.filters.push((r: Row) => r[column] === value);
      return this;
    }
    in(column: string, values: any[]) {
      this.filters.push((r: Row) => values.includes(r[column]));
      return this;
    }
    gte(column: string, value: any) {
      this.filters.push((r: Row) => r[column] >= value);
      return this;
    }
    order(col: string, opts?: { ascending?: boolean }) {
      this.orderBy = { col, asc: opts?.ascending };
      return this;
    }
    limit(n: number) {
      this.limitN = n;
      return this;
    }
    range(start: number, end: number) {
      this.rangeStart = start;
      this.rangeEnd = end;
      return this;
    }

    _computeMatched() {
      const all = (fromData[this.table] || []).slice();
      let matched = all.filter((r) => this.filters.every((f) => f(r)));
      if (this.orderBy) {
        matched.sort((a: Row, b: Row) => {
          const col = this.orderBy!.col;
          if (a[col] === b[col]) return 0;
          const asc =
            this.orderBy!.asc === undefined ? true : this.orderBy!.asc;
          return (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1);
        });
      }
      if (this.rangeStart != null && this.rangeEnd != null)
        matched = matched.slice(this.rangeStart, this.rangeEnd + 1);
      else if (this.limitN != null) matched = matched.slice(0, this.limitN);
      return matched;
    }

    async maybeSingle() {
      // If there's a pending op and maybeSingle requested directly, execute it
      if (this.pendingOp) {
        const res = this._executePendingOp();
        return { data: res.data.length ? res.data[0] : null, error: null };
      }
      const matched = this._computeMatched();
      if (this.selectOpts && this.selectOpts.head)
        return { count: matched.length };
      return { data: matched.length ? matched[0] : null, error: null };
    }

    async single() {
      if (this.pendingOp) {
        const res = this._executePendingOp();
        return { data: res.data.length ? res.data[0] : null, error: null };
      }
      const matched = this._computeMatched();
      if (matched.length === 1) return { data: matched[0], error: null };
      return { data: null, error: { message: "Not single" } };
    }

    then(cb: any) {
      // If there is a pending operation, execute it when awaited
      if (this.pendingOp) {
        const res = this._executePendingOp();
        return cb({ data: res.data, error: null });
      }
      const matched = this._computeMatched();
      if (this.selectOpts && this.selectOpts.head)
        return cb({ count: matched.length });
      return cb({ data: matched, error: null });
    }

    // Mutations: mark pending and return this so callers can chain .eq/.select/etc
    insert(row: Row | Row[]) {
      this.pendingOp = { type: "insert", payload: row };
      return this;
    }
    update(patch: Partial<Row>) {
      this.pendingOp = { type: "update", payload: patch };
      return this;
    }
    delete() {
      this.pendingOp = { type: "delete" };
      return this;
    }

    _executePendingOp() {
      if (!this.pendingOp) return { data: [], error: null };
      const op = this.pendingOp;
      // Reset pending op so subsequent calls don't re-run
      this.pendingOp = null;

      if (op.type === "insert") {
        const row = op.payload;
        const arr = Array.isArray(row) ? row : [row];
        fromData[this.table] = (fromData[this.table] || []).concat(
          arr.map((r: Row) => ({ ...r })),
        );
        return { data: arr, error: null };
      }

      if (op.type === "update") {
        const patch = op.payload as Partial<Row>;
        const all = fromData[this.table] || [];
        const matched = all.filter((r) => this.filters.every((f) => f(r)));
        matched.forEach((r) => Object.assign(r, patch));
        return { data: matched.map((r) => ({ ...r })), error: null };
      }

      if (op.type === "delete") {
        const all = fromData[this.table] || [];
        const matched = all.filter((r) => this.filters.every((f) => f(r)));
        fromData[this.table] = all.filter(
          (r) => !this.filters.every((f) => f(r)),
        );
        return { data: matched, error: null };
      }

      return { data: [], error: null };
    }
  }

  // Channel implementation used in tests
  function createChannel(name: string) {
    const handlers: Array<{
      event: string;
      filter?: any;
      cb: (p: any) => void;
    }> = [];
    const ch: any = {
      on(event: string, filterOrCb: any, maybeCb?: any) {
        if (typeof filterOrCb === "function") {
          handlers.push({ event, cb: filterOrCb });
        } else {
          handlers.push({ event, filter: filterOrCb, cb: maybeCb });
        }
        return ch;
      },
      subscribe() {
        return ch;
      },
      __trigger(event: string, payload: any) {
        handlers.forEach((h) => {
          if (h.event !== event) return;
          // If a filter object was provided, we ignore it for now and always call
          // (tests only assert handler was called with payload)
          try {
            h.cb(payload);
          } catch (e) {
            /* swallow */
          }
        });
      },
    };
    // If Vitest is running, make channel factory spyable by returning a function-like object
    return ch;
  }

  const sup: any = {
    __testData: fromData,
    from(table: string) {
      return new Query(table);
    },
    channel(name: string) {
      return createChannel(name);
    },
    removeChannel(_ch?: any) {
      return sup;
    },
    auth: {
      async getSession() {
        return { data: { session: opts.authSession ?? null }, error: null };
      },
      // Minimal onAuthStateChange implementation for tests.
      // Returns an object with `data.subscription.unsubscribe()` so callers can
      // destructure `{ data: { subscription } }` without runtime errors.
      onAuthStateChange(cb: any) {
        // Provide a simple subscription object with an unsubscribe no-op.
        const subscription = {
          unsubscribe() {
            /* no-op in tests */
          },
        };
        // Optionally, tests can call the callback directly by retrieving the mock
        // supabase instance and invoking cb as needed. For default behavior we do
        // not invoke the callback here to avoid unexpected side-effects.
        return { data: { subscription }, error: null };
      },
    },
    functions: {
      async invoke(name: string, args?: any) {
        if (opts.functionsInvoke) return opts.functionsInvoke(name, args);
        return { data: null, error: null };
      },
    },
  };

  // Make `from` and `channel` spyable under Vitest (vi.fn)
  if (maybeVi && typeof maybeVi.fn === "function") {
    const origFrom = sup.from.bind(sup);
    const spyFrom = maybeVi.fn((table: string) => origFrom(table));
    sup.from = spyFrom;

    const origChannel = sup.channel.bind(sup);
    const spyChannel = maybeVi.fn((name: string) => origChannel(name));
    sup.channel = spyChannel;
  }

  return sup;
}

export default createSupabaseMock;
