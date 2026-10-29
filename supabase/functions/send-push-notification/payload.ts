export const BADGE_REFRESH_TYPE = 'badge_refresh';
export const ADMIN_PUSH_TARGET = 'admin';

export type Platform = 'ios' | 'android' | 'both';

export type PushRequest =
  | {
    kind: 'alert';
    emails?: string[];
    sendToAll: boolean;
    title: string;
    body: string;
    data: Record<string, string>;
    platform: Platform;
  }
  | {
    /** No text: sets every admin icon to its server-computed total. Recipients are resolved server-side. */
    kind: 'badge_only';
    platform: Platform;
  };

/** FCM HTTP v1 requires all data values to be strings. */
function stringifyData(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

function parsePlatform(value: unknown): Platform {
  return value === 'ios' || value === 'android' ? value : 'both';
}

export function parsePushRequest(raw: unknown): PushRequest | { error: string } {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const platform = parsePlatform(input.platform);

  if (input.badgeOnly === true) {
    return { kind: 'badge_only', platform };
  }

  if (typeof input.title !== 'string' || !input.title || typeof input.body !== 'string' || !input.body) {
    return { error: 'title and body are required' };
  }
  const emails = Array.isArray(input.emails)
    ? input.emails.filter((e): e is string => typeof e === 'string')
    : undefined;
  const sendToAll = input.sendToAll === true;
  if (!emails && !sendToAll) {
    return { error: 'emails or sendToAll is required' };
  }
  return {
    kind: 'alert',
    emails,
    sendToAll,
    title: input.title,
    body: input.body,
    data: stringifyData(input.data),
    platform,
  };
}

export type ApnsRequest = {
  headers: { 'apns-push-type': 'alert'; 'apns-priority': '10' | '5' };
  body: Record<string, unknown>;
};

/**
 * A badge-only push still uses push type `alert`: Apple's background type must not set the
 * badge, and it is throttled to a few per hour. With no alert or sound nothing is shown.
 */
export function buildApnsRequest(request: PushRequest, badge: number | null): ApnsRequest {
  switch (request.kind) {
    case 'alert': {
      const aps: Record<string, unknown> = {
        alert: { title: request.title, body: request.body },
        sound: 'default',
      };
      if (badge !== null) aps.badge = badge;
      return {
        headers: { 'apns-push-type': 'alert', 'apns-priority': '10' },
        body: { aps, ...request.data },
      };
    }
    case 'badge_only':
      return {
        headers: { 'apns-push-type': 'alert', 'apns-priority': '5' },
        body: { aps: { badge: requireBadge(badge) }, ...badgeOnlyData() },
      };
    default: {
      const unreachable: never = request;
      throw new Error(`Unhandled push request: ${JSON.stringify(unreachable)}`);
    }
  }
}

/**
 * Android badge-only is data-only so nothing is shown. Launchers derive counts from visible
 * notifications, so the app itself rewrites the icon when this arrives in the foreground.
 */
export function buildFcmMessage(
  token: string,
  request: PushRequest,
  badge: number | null,
): Record<string, unknown> {
  switch (request.kind) {
    case 'alert':
      return {
        token,
        notification: { title: request.title, body: request.body },
        data: Object.keys(request.data).length ? request.data : undefined,
        android: {
          priority: 'high',
          notification: badge === null
            ? { channelId: 'prayers' }
            : { channelId: 'prayers', notification_count: badge },
        },
      };
    case 'badge_only':
      return {
        token,
        data: { ...badgeOnlyData(), badge: String(requireBadge(badge)) },
        android: { priority: 'normal' },
      };
    default: {
      const unreachable: never = request;
      throw new Error(`Unhandled push request: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** Callers skip badge-only sends for recipients with no known total. */
function requireBadge(badge: number | null): number {
  if (badge === null) throw new Error('badge-only push needs a known badge');
  return badge;
}

function badgeOnlyData(): Record<string, string> {
  return { type: BADGE_REFRESH_TYPE, target: ADMIN_PUSH_TARGET };
}

/** Rows for push_notification_log. Badge-only rows have no text and are tagged by `data.type`. */
export function logContent(request: PushRequest): {
  title: string | null;
  body: string | null;
  data: Record<string, string> | undefined;
} {
  switch (request.kind) {
    case 'alert':
      return {
        title: request.title,
        body: request.body,
        data: Object.keys(request.data).length ? request.data : undefined,
      };
    case 'badge_only':
      return { title: null, body: null, data: badgeOnlyData() };
    default: {
      const unreachable: never = request;
      throw new Error(`Unhandled push request: ${JSON.stringify(unreachable)}`);
    }
  }
}
