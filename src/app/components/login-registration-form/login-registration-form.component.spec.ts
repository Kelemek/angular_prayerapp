import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { LoginRegistrationFormComponent } from "./login-registration-form.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("LoginRegistrationFormComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<LoginRegistrationFormComponent>;
  let component: LoginRegistrationFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginRegistrationFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginRegistrationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("canSave requires names and affiliation when approval is required", () => {
    fixture.componentRef.setInput("firstName", "A");
    fixture.componentRef.setInput("lastName", "B");
    fixture.componentRef.setInput("requiresApproval", true);
    fixture.componentRef.setInput("affiliationReason", "");
    fixture.detectChanges();
    expect(component.canSave).toBe(false);

    fixture.componentRef.setInput("affiliationReason", "Visitor");
    fixture.detectChanges();
    expect(component.canSave).toBe(true);
  });

  it("shows the approval banner when requiresApproval is true", () => {
    fixture.componentRef.setInput("requiresApproval", true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Admin Approval Required"
    );
    expect(fixture.nativeElement.querySelector("#affiliation-reason")).toBeTruthy();
  });

  it("disables save until required fields are filled", () => {
    const button = fixture.nativeElement.querySelector(
      "button"
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fixture.componentRef.setInput("firstName", "Jane");
    fixture.componentRef.setInput("lastName", "Doe");
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
  });

  it("emits save when Complete Registration is clicked", () => {
    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);
    fixture.componentRef.setInput("firstName", "Jane");
    fixture.componentRef.setInput("lastName", "Doe");
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      "button"
    ) as HTMLButtonElement;
    button.click();

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
