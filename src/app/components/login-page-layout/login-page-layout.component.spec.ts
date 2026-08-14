import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { LoginPageLayoutComponent } from "./login-page-layout.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

@Component({
  standalone: true,
  imports: [LoginPageLayoutComponent],
  template: `
    <app-login-page-layout>
      <p data-testid="projected">Login content</p>
    </app-login-page-layout>
  `,
})
class LoginPageLayoutHostComponent {}

describe("LoginPageLayoutComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<LoginPageLayoutHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageLayoutHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageLayoutHostComponent);
    fixture.detectChanges();
  });

  it("projects child content inside the centered column", () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="projected"]')?.textContent).toBe(
      "Login content"
    );
    expect(el.querySelector(".max-w-md")).toBeTruthy();
  });
});
