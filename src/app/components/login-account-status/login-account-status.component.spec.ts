import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { LoginAccountStatusComponent } from "./login-account-status.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("LoginAccountStatusComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<LoginAccountStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginAccountStatusComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginAccountStatusComponent);
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("shows pending approval messaging", () => {
    fixture.componentRef.setInput("status", "pending_approval");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Account Approval Request Submitted"
    );
  });

  it("shows blocked messaging", () => {
    fixture.componentRef.setInput("status", "blocked");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Account Access Restricted"
    );
  });
});
