import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { LoginEmailFormComponent } from "./login-email-form.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("LoginEmailFormComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<LoginEmailFormComponent>;
  let component: LoginEmailFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginEmailFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginEmailFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("shows the verification helper copy", () => {
    expect(fixture.nativeElement.textContent).toContain(
      "We'll send you a secure verification code"
    );
  });

  it("shows an error banner when error is set", () => {
    fixture.componentRef.setInput("error", "Invalid email");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Invalid email");
  });

  it("disables submit when canSubmit is false", () => {
    fixture.componentRef.setInput("canSubmit", false);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("emits emailChange when the email field changes", () => {
    const emitted: string[] = [];
    component.emailChange.subscribe((value) => emitted.push(value));

    const input = fixture.nativeElement.querySelector(
      "#email"
    ) as HTMLInputElement;
    input.value = "user@example.com";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();

    expect(emitted).toEqual(["user@example.com"]);
  });

  it("emits submitForm when the form is submitted", () => {
    const submitSpy = vi.fn();
    component.submitForm.subscribe(submitSpy);
    fixture.componentRef.setInput("canSubmit", true);
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(new Event("submit"));
    fixture.detectChanges();

    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it("shows loading state on the submit button", () => {
    fixture.componentRef.setInput("loading", true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Sending code...");
  });
});
