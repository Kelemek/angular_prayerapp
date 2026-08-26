import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ModalShellComponent } from "./modal-shell.component";

describe("ModalShellComponent", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ModalShellComponent>> | null = null;

  beforeEach(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.querySelectorAll(".safe-area-viewport").forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.overflow = "";
        el.style.touchAction = "";
      }
    });

    TestBed.configureTestingModule({
      imports: [ModalShellComponent],
    });
    fixture = null;
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
      fixture = null;
    }
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.querySelectorAll(".safe-area-viewport").forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.overflow = "";
        el.style.touchAction = "";
      }
    });
  });

  it("should create", () => {
    fixture = TestBed.createComponent(ModalShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("onBackdropClick emits close when clicking overlay", () => {
    fixture = TestBed.createComponent(ModalShellComponent);
    const component = fixture.componentInstance;
    const spy = vi.spyOn(component.close, "emit");
    const overlay = document.createElement("div");

    component.onBackdropClick({
      target: overlay,
      currentTarget: overlay,
    } as unknown as MouseEvent);

    expect(spy).toHaveBeenCalled();
  });

  it("onBackdropClick does not emit close when clicking inner panel", () => {
    fixture = TestBed.createComponent(ModalShellComponent);
    const component = fixture.componentInstance;
    const spy = vi.spyOn(component.close, "emit");
    const overlay = document.createElement("div");
    const panel = document.createElement("div");

    component.onBackdropClick({
      target: panel,
      currentTarget: overlay,
    } as unknown as MouseEvent);

    expect(spy).not.toHaveBeenCalled();
  });

  it("onBackdropClick does not emit close when closeOnBackdrop is false", () => {
    fixture = TestBed.createComponent(ModalShellComponent);
    const component = fixture.componentInstance;
    component.closeOnBackdrop = false;
    const spy = vi.spyOn(component.close, "emit");
    const overlay = document.createElement("div");

    component.onBackdropClick({
      target: overlay,
      currentTarget: overlay,
    } as unknown as MouseEvent);

    expect(spy).not.toHaveBeenCalled();
  });

  it("locks body and safe-area-viewport scroll on init", () => {
    fixture = TestBed.createComponent(ModalShellComponent);
    const component = fixture.componentInstance;
    const viewport = document.createElement("div");
    viewport.className = "safe-area-viewport";
    document.body.appendChild(viewport);

    component.ngOnInit();

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(viewport.style.overflow).toBe("hidden");
    expect(viewport.style.touchAction).toBe("none");

    viewport.remove();
  });

  it("restores overflow on destroy when no safe-area-viewport", () => {
    fixture = TestBed.createComponent(ModalShellComponent);
    const component = fixture.componentInstance;
    document.querySelectorAll(".safe-area-viewport").forEach((el) => el.remove());
    document.documentElement.style.overflow = "auto";

    component.ngOnInit();
    expect(document.documentElement.style.overflow).toBe("hidden");

    component.ngOnDestroy();
    expect(document.documentElement.style.overflow).toBe("auto");
  });

  it("onBodyFocusIn does not scrollIntoView when a button inside the modal body is focused", () => {
    fixture = TestBed.createComponent(ModalShellComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const scroller = fixture.nativeElement.querySelector(
      ".modal-shell-body"
    ) as HTMLElement;
    const button = document.createElement("button");
    scroller.appendChild(button);
    button.scrollIntoView = vi.fn();

    component.onBodyFocusIn({ target: button } as FocusEvent);

    expect(button.scrollIntoView).not.toHaveBeenCalled();
  });

  it("onBodyFocusIn scrolls only the modal body for focused inputs", async () => {
    fixture = TestBed.createComponent(ModalShellComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const scroller = fixture.nativeElement.querySelector(
      ".modal-shell-body"
    ) as HTMLElement;
    const input = document.createElement("input");
    scroller.appendChild(input);
    Object.defineProperty(scroller, "scrollTop", {
      writable: true,
      value: 0,
    });
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 200,
      left: 0,
      right: 300,
      width: 300,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
      top: 250,
      bottom: 280,
      left: 0,
      right: 100,
      width: 100,
      height: 30,
      x: 0,
      y: 250,
      toJSON: () => ({}),
    } as DOMRect);
    input.scrollIntoView = vi.fn();

    component.onBodyFocusIn({ target: input } as FocusEvent);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(input.scrollIntoView).not.toHaveBeenCalled();
    expect(scroller.scrollTop).toBeGreaterThan(0);
  });

  it("onOverlayTouchMove prevents default outside modal body", () => {
    fixture = TestBed.createComponent(ModalShellComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const scroller = fixture.nativeElement.querySelector(".modal-shell-body");
    const outside = document.createElement("div");
    const event = {
      target: outside,
      preventDefault: vi.fn(),
    } as unknown as TouchEvent;

    fixture.componentInstance.onOverlayTouchMove(event);
    expect(event.preventDefault).toHaveBeenCalled();

    const insideEvent = {
      target: scroller,
      preventDefault: vi.fn(),
    } as unknown as TouchEvent;
    fixture.componentInstance.onOverlayTouchMove(insideEvent);
    expect(insideEvent.preventDefault).not.toHaveBeenCalled();
  });
});
