export type PlanningCenterLookupBody = {
  email: string;
  resumeToken: string | null;
};

export type PlanningCenterLookupMode =
  | { kind: 'login'; email: string; resumeToken: string }
  | { kind: 'church'; email: string }
  | { kind: 'invalid'; status: 400 | 401 };

export function parsePlanningCenterLookupBody(
  raw: unknown,
): PlanningCenterLookupBody | { kind: 'invalid'; status: 400 } {
  if (!raw || typeof raw !== 'object') {
    return { kind: 'invalid', status: 400 };
  }
  const emailRaw = (raw as { email?: unknown }).email;
  const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
  if (!email) {
    return { kind: 'invalid', status: 400 };
  }
  const tokenRaw = (raw as { auth_resume_token?: unknown }).auth_resume_token;
  const resumeToken =
    typeof tokenRaw === 'string' && tokenRaw.trim() ? tokenRaw.trim() : null;
  return { email, resumeToken };
}

export function decidePlanningCenterLookupMode(
  body: PlanningCenterLookupBody,
): PlanningCenterLookupMode {
  if (body.resumeToken) {
    return { kind: 'login', email: body.email, resumeToken: body.resumeToken };
  }
  return { kind: 'church', email: body.email };
}

export function loginLookupBooleanResult(matched: boolean): {
  count: 0 | 1;
  people: [];
} {
  return { count: matched ? 1 : 0, people: [] };
}

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 10;

export function createLoginLookupRateLimiter(
  windowMs = RATE_WINDOW_MS,
  max = RATE_MAX,
): {
  isLimited: (key: string) => boolean;
  record: (key: string) => void;
} {
  const recent = new Map<string, number[]>();
  return {
    isLimited(key: string): boolean {
      const now = Date.now();
      const times = (recent.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.set(key, times);
      return times.length >= max;
    },
    record(key: string): void {
      const times = recent.get(key) ?? [];
      times.push(Date.now());
      recent.set(key, times);
    },
  };
}
