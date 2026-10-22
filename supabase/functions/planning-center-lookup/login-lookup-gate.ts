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

export function trustedClientAddress(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim() ?? '';
  if (cf) {
    return cf;
  }
  const hops = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((hop) => hop.trim())
    .filter((hop) => hop.length > 0);
  const last = hops.length > 0 ? hops[hops.length - 1] : '';
  if (last) {
    return last;
  }
  const realIp = req.headers.get('x-real-ip')?.trim() ?? '';
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}
