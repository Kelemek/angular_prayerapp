export interface AccountApprovalEnqueueResult {
  queued: number;
  pushEmails: string[];
  pushBody: string;
}

export interface AccountApprovalPush {
  emails: string[];
  title: string;
  body: string;
  data: { type: "account_approval_request"; target: "admin" };
}

export function parseAccountApprovalEnqueue(
  data: unknown
): AccountApprovalEnqueueResult {
  if (!data || typeof data !== "object") {
    return { queued: 0, pushEmails: [], pushBody: "" };
  }
  const row = data as Record<string, unknown>;
  const queued = Number(row["queued"]);
  const pushEmails = Array.isArray(row["pushEmails"])
    ? row["pushEmails"].filter(
        (email): email is string =>
          typeof email === "string" && email.trim().length > 0
      )
    : [];
  const pushBody = typeof row["pushBody"] === "string" ? row["pushBody"].trim() : "";
  return {
    queued: Number.isFinite(queued) ? queued : 0,
    pushEmails,
    pushBody,
  };
}

/** Push payload for the generic sender. Null when there is nobody to notify. */
export function planAccountApprovalPush(
  result: AccountApprovalEnqueueResult
): AccountApprovalPush | null {
  if (!result.pushEmails.length || !result.pushBody) return null;
  return {
    emails: result.pushEmails,
    title: "Account approval request",
    body: result.pushBody,
    data: { type: "account_approval_request", target: "admin" },
  };
}

/** The signed-in person may notify admins only about their own request. */
export function callerOwnsApprovalRequest(
  callerEmail: string | null | undefined,
  requestedEmail: string
): boolean {
  const caller = callerEmail?.trim().toLowerCase() ?? "";
  const requested = requestedEmail.trim().toLowerCase();
  return caller.length > 0 && caller === requested;
}

/** What the browser receives. Admin addresses stay on the server. */
export function accountApprovalClientBody(
  result: AccountApprovalEnqueueResult
): { queued: number } {
  return { queued: result.queued };
}
