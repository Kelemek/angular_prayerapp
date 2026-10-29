import { describe, expect, it } from "vitest";
import {
  adminPushRecipientEmails,
  allAdminRecipientEmails,
  decidePushAccess,
  isPushServiceRoleCaller,
} from "../../supabase/functions/send-push-notification/access";
import type { PushRequest } from "../../supabase/functions/send-push-notification/payload";

const badgeOnly: PushRequest = { kind: "badge_only", platform: "both" };

function alert(sendToAll: boolean): PushRequest {
  return {
    kind: "alert",
    emails: ["a@example.com"],
    sendToAll,
    title: "T",
    body: "B",
    data: {},
    platform: "both",
  };
}

function tokenWithRole(role: string): string {
  const payload = btoa(JSON.stringify({ role }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `Bearer header.${payload}.sig`;
}

describe("send-push access", () => {
  it("treats the configured non-JWT secret key as the service role", () => {
    const secret = "sb_secret_reminder_push";
    expect(isPushServiceRoleCaller(`Bearer ${secret}`, null, secret)).toBe(true);
    expect(isPushServiceRoleCaller(tokenWithRole("anon"), secret, secret)).toBe(true);
    expect(isPushServiceRoleCaller(tokenWithRole("service_role"), null, secret)).toBe(true);
  });

  it("does not treat the anon key or a missing header as the service role", () => {
    const secret = "sb_secret_reminder_push";
    expect(isPushServiceRoleCaller(tokenWithRole("anon"), "anon-key", secret)).toBe(false);
    expect(isPushServiceRoleCaller(null, null, secret)).toBe(false);
  });

  it("lets the service role and an admin choose recipients", () => {
    expect(decidePushAccess("service_role", alert(true))).toBe("raw");
    expect(decidePushAccess("admin", alert(false))).toBe("raw");
  });

  it("limits a subscriber to admin devices and refuses a broadcast", () => {
    expect(decidePushAccess("subscriber", alert(false))).toBe("admin_recipients");
    expect(decidePushAccess("subscriber", alert(true))).toBe("deny");
  });

  it("refuses a logged-out caller", () => {
    expect(decidePushAccess("anonymous", alert(false))).toBe("deny");
    expect(decidePushAccess("anonymous", alert(true))).toBe("deny");
  });

  it("lets only admins and the service role refresh every admin badge", () => {
    expect(decidePushAccess("admin", badgeOnly)).toBe("all_admins");
    expect(decidePushAccess("service_role", badgeOnly)).toBe("all_admins");
    expect(decidePushAccess("subscriber", badgeOnly)).toBe("deny");
    expect(decidePushAccess("anonymous", badgeOnly)).toBe("deny");
  });

  it("refreshes badges for every unblocked admin, even with admin push off", () => {
    expect(
      allAdminRecipientEmails([
        { email: "On@example.com", receive_admin_push: true },
        { email: "off@example.com", receive_admin_push: false },
        { email: "blocked@example.com", is_blocked: true },
        { email: "  " },
      ])
    ).toEqual(["On@example.com", "off@example.com"]);
  });

  it("keeps only requested admins who receive admin push", () => {
    expect(
      adminPushRecipientEmails(
        ["Admin@example.com", "member@example.com", "quiet@example.com"],
        [
          {
            email: "admin@example.com",
            receive_admin_push: true,
            is_blocked: false,
          },
          {
            email: "quiet@example.com",
            receive_admin_push: false,
            is_blocked: false,
          },
          {
            email: "blocked@example.com",
            receive_admin_push: true,
            is_blocked: true,
          },
        ]
      )
    ).toEqual(["admin@example.com"]);
  });
});