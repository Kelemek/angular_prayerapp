import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { LoginMfaPanelComponent } from "./login-mfa-panel.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("LoginMfaPanelComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<LoginMfaPanelComponent>;
  let component: LoginMfaPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginMfaPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginMfaPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("email", "user@example.com");
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("focusCodeInput focuses the code field", async () => {
    const focusMock = vi.fn();
    component["codeField"] = { nativeElement: { focus: focusMock } };

    component.focusCodeInput();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(focusMock).toHaveBeenCalled();
  });

  it("renders the recipient email", () => {
    expect(fixture.nativeElement.textContent).toContain("user@example.com");
  });

  it("emits mfaCodeInputChange when the code field changes", () => {
    const emitted: string[] = [];
    component.mfaCodeInputChange.subscribe((value) => emitted.push(value));

    const input = fixture.nativeElement.querySelector(
      "#mfa-code-input"
    ) as HTMLInputElement;
    input.value = "1234";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();

    expect(emitted).toEqual(["1234"]);
  });

  it("emits resend when Resend Code is clicked", () => {
    const resendSpy = vi.fn();
    component.resend.subscribe(resendSpy);

    const button = Array.from(
      fixture.nativeElement.querySelectorAll("button")
    ).find((el: Element) => el.textContent?.includes("Resend Code")) as HTMLButtonElement;
    button.click();

    expect(resendSpy).toHaveBeenCalledTimes(1);
  });

  it("emits reset when Try a different email is clicked", () => {
    const resetSpy = vi.fn();
    component.reset.subscribe(resetSpy);

    const button = Array.from(
      fixture.nativeElement.querySelectorAll("button")
    ).find((el: Element) =>
      el.textContent?.includes("Try a different email")
    ) as HTMLButtonElement;
    button.click();

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it("hides the code input while loading", () => {
    fixture.componentRef.setInput("loading", true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector("#mfa-code-input")).toBeNull();
    expect(fixture.nativeElement.textContent).toContain("Verifying code...");
  });

  it("hides instructions when showInstructions is false", () => {
    fixture.componentRef.setInput("showInstructions", false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(
      "Here's what to do:"
    );
  });
});
