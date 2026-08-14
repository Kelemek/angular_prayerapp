import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { LoginHeaderComponent } from "./login-header.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("LoginHeaderComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<LoginHeaderComponent>;
  let component: LoginHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("shows the default heart icon when logo is disabled", () => {
    expect(fixture.nativeElement.querySelector("svg")).toBeTruthy();
    expect(fixture.nativeElement.querySelector("img")).toBeNull();
  });

  it("shows the church logo when useLogo and logoUrl are set", () => {
    fixture.componentRef.setInput("useLogo", true);
    fixture.componentRef.setInput("logoUrl", "https://example.com/logo.png");
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector("img") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/logo.png");
    expect(fixture.nativeElement.querySelector("svg")).toBeNull();
  });

  it("shows site-login copy when requireSiteLogin is true", () => {
    fixture.componentRef.setInput("requireSiteLogin", true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Sign in to join our community"
    );
  });

  it("links to the info page", () => {
    const link = fixture.nativeElement.querySelector(
      'a[href="/info"]'
    ) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain("Learn more about this app");
  });
});
