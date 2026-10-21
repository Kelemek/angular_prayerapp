import { describe, expect, it, vi } from "vitest";
import { navigateLoginDestination } from "./login-internal-navigation";

describe("navigateLoginDestination", () => {
  it("uses navigateByUrl so query strings are preserved", async () => {
    const navigateByUrl = vi.fn(async () => true);
    const router = { navigateByUrl } as unknown as import("@angular/router").Router;

    await navigateLoginDestination(router, "/?filter=groups&groupId=abc");

    expect(navigateByUrl).toHaveBeenCalledWith("/?filter=groups&groupId=abc");
  });
});
