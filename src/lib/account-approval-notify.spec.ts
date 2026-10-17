import { describe, expect, it } from "vitest";
import {
  accountApprovalClientBody,
  callerOwnsApprovalRequest,
  parseAccountApprovalEnqueue,
  planAccountApprovalPush,
} from "../../supabase/functions/notify-account-approval/plan";

describe("account approval notify", () => {
  it("sends push from the enqueue result and hides addresses from the client", () => {
    const parsed = parseAccountApprovalEnqueue({
      queued: 2,
      pushEmails: ["admin@example.com"],
      pushBody: "Ada Lovelace (ada@example.com)",
    });
    expect(planAccountApprovalPush(parsed)).toEqual({
      emails: ["admin@example.com"],
      title: "Account approval request",
      body: "Ada Lovelace (ada@example.com)",
      data: { type: "account_approval_request", target: "admin" },
    });
    expect(accountApprovalClientBody(parsed)).toEqual({ queued: 2 });
  });

  it("skips push when the enqueue found no pending request", () => {
    const parsed = parseAccountApprovalEnqueue({
      queued: 0,
      pushEmails: [],
      pushBody: "",
    });
    expect(planAccountApprovalPush(parsed)).toBeNull();
    expect(accountApprovalClientBody(parsed)).toEqual({ queued: 0 });
  });

  it("treats a missing enqueue payload as nothing to send", () => {
    expect(planAccountApprovalPush(parseAccountApprovalEnqueue(null))).toBeNull();
  });

  it("allows only the signed-in person to notify about their own request", () => {
    expect(callerOwnsApprovalRequest("Ada@Example.com", "ada@example.com")).toBe(
      true
    );
    expect(callerOwnsApprovalRequest("other@example.com", "ada@example.com")).toBe(
      false
    );
    expect(callerOwnsApprovalRequest(null, "ada@example.com")).toBe(false);
    expect(callerOwnsApprovalRequest("  ", "ada@example.com")).toBe(false);
  });
});
