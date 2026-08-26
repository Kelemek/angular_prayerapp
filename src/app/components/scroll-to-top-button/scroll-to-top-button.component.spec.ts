import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ScrollToTopButtonComponent } from "./scroll-to-top-button.component";

describe("ScrollToTopButtonComponent", () => {
  let fixture: ComponentFixture<ScrollToTopButtonComponent>;
  let viewport: HTMLDivElement;

  beforeEach(async () => {
    viewport = document.createElement("div");
    viewport.className = "safe-area-viewport";
    Object.defineProperty(viewport, "scrollTop", {
      value: 0,
      writable: true,
      configurable: true,
    });
    viewport.scrollTo = (options?: ScrollToOptions | number) => {
      if (typeof options === "number") {
        viewport.scrollTop = options;
        return;
      }
      if (options?.top != null) {
        viewport.scrollTop = options.top;
      }
    };

    await TestBed.configureTestingModule({
      imports: [ScrollToTopButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScrollToTopButtonComponent);
    fixture.componentRef.setInput("scrollElement", viewport);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("stays hidden until the scroll container passes the threshold", () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="scroll-to-top-button"]')
    ).toBeNull();

    viewport.scrollTop = 400;
    viewport.dispatchEvent(new Event("scroll"));
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="scroll-to-top-button"]')
    ).toBeTruthy();
  });

  it("scrolls the bound element to top when clicked", () => {
    viewport.scrollTop = 500;
    viewport.dispatchEvent(new Event("scroll"));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="scroll-to-top-button"]'
    ) as HTMLButtonElement;
    button.click();

    expect(viewport.scrollTop).toBe(0);
  });

  it("hides again when scroll returns above the threshold", () => {
    viewport.scrollTop = 500;
    viewport.dispatchEvent(new Event("scroll"));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="scroll-to-top-button"]')
    ).toBeTruthy();

    viewport.scrollTop = 100;
    viewport.dispatchEvent(new Event("scroll"));
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="scroll-to-top-button"]')
    ).toBeNull();
  });
});
