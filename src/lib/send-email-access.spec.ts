import { describe, expect, it } from "vitest";
import {
  adminNoticeMessage,
  decideSendEmailAccess,
  jwtRole,
} from "../../supabase/functions/send-email/access";

function tokenWithRole(role: string): string {
  const payload = btoa(JSON.stringify({ role }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.sig`;
}

describe("send-email access", () => {
  it("reads the role claim from a bearer token", () => {
    expect(jwtRole(tokenWithRole("service_role"))).toBe("service_role");
    expect(jwtRole(tokenWithRole("authenticated"))).toBe("authenticated");
    expect(jwtRole("not-a-jwt")).toBeNull();
  });

  it("lets the service role and an admin send a composed message", () => {
    expect(decideSendEmailAccess({ kind: "service_role" }, undefined)).toBe(
      "raw"
    );
    expect(decideSendEmailAccess({ kind: "admin" }, "send_to_all_subscribers")).toBe(
      "raw"
    );
  });

  it("refuses a composed message from a subscriber or a logged-out caller", () => {
    expect(decideSendEmailAccess({ kind: "subscriber" }, undefined)).toBe(
      "deny"
    );
    expect(decideSendEmailAccess({ kind: "anonymous" }, "send_to_all_subscribers")).toBe(
      "deny"
    );
  });

  it("lets a subscriber send only the fixed admin notice", () => {
    expect(
      decideSendEmailAccess({ kind: "subscriber" }, "notify_admins")
    ).toBe("notify_admins");
    expect(decideSendEmailAccess({ kind: "anonymous" }, "notify_admins")).toBe(
      "deny"
    );
  });

  it("builds the admin notice from structured fields and escapes html", () => {
    const message = adminNoticeMessage(
      {
        type: "prayer",
        title: "<script>",
        description: "please pray",
        requester: "Ada",
      },
      "https://cpprayer.cp-church.org/admin"
    );
    expect(message?.templateKey).toBe("admin_notification_prayer");
    expect(message?.htmlVariables.prayerTitle).toBe("&lt;script&gt;");
    expect(message?.textVariables.prayerTitle).toBe("<script>");
  });

  it("picks the update and deletion templates", () => {
    expect(
      adminNoticeMessage(
        { type: "update", title: "Note", content: "Today", author: "Ada" },
        "https://cpprayer.cp-church.org/admin"
      )?.templateKey
    ).toBe("admin_notification_update");
    expect(
      adminNoticeMessage(
        { type: "deletion", title: "Note", requester: "Ada", reason: "Done" },
        "https://cpprayer.cp-church.org/admin"
      )?.subjectFallback
    ).toBe("Deletion Request: Note");
    expect(
      adminNoticeMessage(
        { type: "other", title: "Note" },
        "https://cpprayer.cp-church.org/admin"
      )
    ).toBeNull();
  });

  it("rejects a notice whose link is not the admin portal", () => {
    expect(
      adminNoticeMessage(
        { type: "prayer", title: "Title" },
        "https://cpprayer.cp-church.org/phish"
      )
    ).toBeNull();
    expect(
      adminNoticeMessage(
        { type: "prayer", title: "Title" },
        "https://evil.example/admin"
      )
    ).toBeNull();
    expect(
      adminNoticeMessage(
        { type: "prayer", title: "Title" },
        "https://cpprayer.cp-church.org.evil.example/admin"
      )
    ).toBeNull();
    expect(
      adminNoticeMessage(
        { type: "prayer", title: "Title" },
        "http://localhost:4200/admin"
      )?.templateKey
    ).toBe("admin_notification_prayer");
  });
});
