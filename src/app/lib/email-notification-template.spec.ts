import { describe, expect, it } from "vitest";
import { adminNotificationPushBody } from "./email-notification-admin-push";
import {
  filterManualBroadcastRecipientEmails,
  normalizeTestAccountEmail,
} from "./email-notification-broadcast";
import {
  buildAdminPortalLink,
  buildAppHomeLink,
  buildSubscriberAppLink,
  resolveEmailBaseUrl,
} from "./email-notification-links";
import {
  applyEmailTemplateVariables,
  renderEmailFromTemplate,
  stringifyEmailTemplateVariables,
} from "./email-notification-template";
import type { AdminNotificationPayload } from "./email-notification-types";

describe("email-notification-template", () => {
  it("applyEmailTemplateVariables replaces placeholders and empty values", () => {
    expect(
      applyEmailTemplateVariables("Hello {{ name }} and {{missing}}", {
        name: "X",
        missing: "",
      })
    ).toBe("Hello X and ");
  });

  it("stringifyEmailTemplateVariables converts null and undefined to empty strings", () => {
    expect(
      stringifyEmailTemplateVariables({ a: "1", b: null, c: undefined })
    ).toEqual({ a: "1", b: "", c: "" });
  });

  it("renderEmailFromTemplate applies text vars to subject/body and html vars to html", () => {
    const out = renderEmailFromTemplate(
      {
        id: "1",
        template_key: "k",
        name: "n",
        subject: "Hi {{name}}",
        html_body: "<p>{{body}}</p>",
        text_body: "Text {{body}}",
        created_at: "",
        updated_at: "",
      },
      { name: "Ada", body: "plain" },
      { name: "Ada", body: "<b>html</b>" }
    );
    expect(out).toEqual({
      subject: "Hi Ada",
      body: "Text plain",
      html: "<p><b>html</b></p>",
    });
  });
});

describe("email-notification-links", () => {
  it("resolveEmailBaseUrl prefers a non-localhost http origin", () => {
    expect(
      resolveEmailBaseUrl({
        origin: "https://prayer.example.com",
        appUrl: "https://fallback.example.com",
      })
    ).toBe("https://prayer.example.com");
  });

  it("resolveEmailBaseUrl uses appUrl for localhost origins", () => {
    expect(
      resolveEmailBaseUrl({
        origin: "http://localhost:4200",
        appUrl: "https://app.example.com/",
      })
    ).toBe("https://app.example.com");
  });

  it("buildSubscriberAppLink encodes current vs answered filters", () => {
    expect(buildSubscriberAppLink("https://app.example.com", "current")).toBe(
      "https://app.example.com/?filter=current"
    );
    expect(buildSubscriberAppLink("", "answered")).toBe("/?filter=answered");
  });

  it("buildAppHomeLink and buildAdminPortalLink strip a trailing slash", () => {
    expect(buildAppHomeLink("https://app.example.com/")).toBe(
      "https://app.example.com/"
    );
    expect(buildAdminPortalLink("https://app.example.com/")).toBe(
      "https://app.example.com/admin"
    );
  });
});

describe("email-notification-broadcast", () => {
  it("normalizeTestAccountEmail trims and lowercases", () => {
    expect(normalizeTestAccountEmail("  Tester@Example.com ")).toBe(
      "tester@example.com"
    );
    expect(normalizeTestAccountEmail("   ")).toBeNull();
  });

  it("filterManualBroadcastRecipientEmails drops blanks and the test account", () => {
    expect(
      filterManualBroadcastRecipientEmails(
        ["a@x.com", "  ", "tester@example.com", "b@x.com"],
        "tester@example.com"
      )
    ).toEqual(["a@x.com", "b@x.com"]);
  });
});

describe("email-notification-admin-push", () => {
  it("builds a push body for each admin notification type", () => {
    const prayer: AdminNotificationPayload = {
      type: "prayer",
      title: "T",
      requester: "Ada",
    };
    const update: AdminNotificationPayload = {
      type: "update",
      title: "T",
      author: "Lin",
    };
    const deletion: AdminNotificationPayload = { type: "deletion", title: "T" };
    expect(adminNotificationPushBody(prayer)).toBe(
      "New prayer request from Ada."
    );
    expect(adminNotificationPushBody(update)).toBe("New update from Lin.");
    expect(adminNotificationPushBody(deletion)).toBe("Deletion request for T.");
  });
});
