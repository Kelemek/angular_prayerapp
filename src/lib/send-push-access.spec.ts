import { describe, expect, it } from "vitest";
import {
  adminPushRecipientEmails,
  decidePushAccess,
} from "../../supabase/functions/send-push-notification/access";

describe("send-push access", () => {
  it("lets the service role and an admin choose recipients", () => {
    expect(decidePushAccess("service_role", true)).toBe("raw");
    expect(decidePushAccess("admin", false)).toBe("raw");
  });

  it("limits a subscriber to admin devices and refuses a broadcast", () => {
    expect(decidePushAccess("subscriber", false)).toBe("admin_recipients");
    expect(decidePushAccess("subscriber", true)).toBe("deny");
  });

  it("refuses a logged-out caller", () => {
    expect(decidePushAccess("anonymous", false)).toBe("deny");
    expect(decidePushAccess("anonymous", true)).toBe("deny");
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