import { describe, expect, it } from "vitest";
import { PRODUCTION_APP_ORIGIN } from "./production-app-origin";
import {
  TEST_ACCOUNT_LOGIN_NOTIFY_ORIGIN,
  shouldNotifyTestAccountLogin,
} from "../../supabase/functions/shared/test-account-login-notify";

describe("shouldNotifyTestAccountLogin", () => {
  it("sends only for the production site", () => {
    expect(TEST_ACCOUNT_LOGIN_NOTIFY_ORIGIN).toBe(PRODUCTION_APP_ORIGIN);
    expect(
      shouldNotifyTestAccountLogin("https://cpprayer.cp-church.org", null)
    ).toBe(true);
    expect(
      shouldNotifyTestAccountLogin(
        null,
        "https://cpprayer.cp-church.org/login"
      )
    ).toBe(true);
  });

  it("skips local, other hosts, and a missing origin", () => {
    expect(shouldNotifyTestAccountLogin("http://localhost:4200", null)).toBe(
      false
    );
    expect(
      shouldNotifyTestAccountLogin("https://preview.example.com", null)
    ).toBe(false);
    expect(shouldNotifyTestAccountLogin(null, null)).toBe(false);
    expect(shouldNotifyTestAccountLogin("null", null)).toBe(false);
  });
});
