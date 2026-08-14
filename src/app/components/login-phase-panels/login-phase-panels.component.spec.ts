import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { LoginPhasePanelsComponent } from "./login-phase-panels.component";
import type { LoginPageShell } from "../../lib/login-page-shell";

const componentDir = dirname(fileURLToPath(import.meta.url));
const childDirs = [
  componentDir,
  join(componentDir, "../login-mfa-panel"),
  join(componentDir, "../login-email-form"),
  join(componentDir, "../login-registration-form"),
  join(componentDir, "../login-account-status"),
];

function readComponentResource(url: string): string {
  for (const base of childDirs) {
    const path = join(base, url);
    if (existsSync(path)) {
      return readFileSync(path, "utf-8");
    }
  }
  throw new Error(`Component resource not found: ${url}`);
}

const mockShell = (): LoginPageShell =>
  ({
    handlers: {
      setEmail: vi.fn(),
      setMfaCodeInput: vi.fn(),
      setFirstName: vi.fn(),
      setLastName: vi.fn(),
      setAffiliationReason: vi.fn(),
      onMfaCodeInput: vi.fn(),
      sanitizeMfaCode: vi.fn(),
      submitEmail: vi.fn(),
      resendMfa: vi.fn(),
      resetLogin: vi.fn(),
      saveRegistration: vi.fn(),
    },
    isValidEmail: () => true,
  }) as unknown as LoginPageShell;

describe("LoginPhasePanelsComponent (template)", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<LoginPhasePanelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPhasePanelsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPhasePanelsComponent);
    fixture.componentRef.setInput("shell", mockShell());
    fixture.componentRef.setInput("phase", { kind: "email" });
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("renders email form for email phase", () => {
    expect(fixture.nativeElement.querySelector("app-login-email-form")).toBeTruthy();
  });

  it("renders MFA panel for mfa phase", () => {
    fixture.componentRef.setInput("phase", { kind: "mfa" });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector("app-login-mfa-panel")).toBeTruthy();
  });

  it("renders registration form for registration phase", () => {
    fixture.componentRef.setInput("phase", {
      kind: "registration",
      requiresApproval: true,
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector("app-login-registration-form")
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      "Admin Approval Required"
    );
  });

  it("renders pending approval status", () => {
    fixture.componentRef.setInput("phase", { kind: "pending_approval" });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector("app-login-account-status")
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      "Account Approval Request Submitted"
    );
  });

  it("renders blocked status", () => {
    fixture.componentRef.setInput("phase", { kind: "blocked" });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Account Access Restricted"
    );
  });

  it("focusMfaInput delegates to the MFA panel", () => {
    fixture.componentRef.setInput("phase", { kind: "mfa" });
    fixture.detectChanges();
    const focusSpy = vi.spyOn(
      fixture.componentInstance.mfaPanel!,
      "focusCodeInput"
    );

    fixture.componentInstance.focusMfaInput();

    expect(focusSpy).toHaveBeenCalled();
  });

  it("wires MFA resend to shell handler", () => {
    const shell = mockShell();
    fixture.componentRef.setInput("shell", shell);
    fixture.componentRef.setInput("phase", { kind: "mfa" });
    fixture.detectChanges();

    const button = Array.from(
      fixture.nativeElement.querySelectorAll("button")
    ).find((el: Element) => el.textContent?.includes("Resend Code")) as HTMLButtonElement;
    button.click();

    expect(shell.handlers.resendMfa).toHaveBeenCalledTimes(1);
  });

  it("wires registration save to shell handler", () => {
    const shell = mockShell();
    fixture.componentRef.setInput("shell", shell);
    fixture.componentRef.setInput("phase", {
      kind: "registration",
      requiresApproval: false,
    });
    fixture.componentRef.setInput("firstName", "Jane");
    fixture.componentRef.setInput("lastName", "Doe");
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      "button"
    ) as HTMLButtonElement;
    button.click();

    expect(shell.handlers.saveRegistration).toHaveBeenCalledTimes(1);
  });
});
