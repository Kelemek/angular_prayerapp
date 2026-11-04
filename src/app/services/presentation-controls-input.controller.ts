import { Injectable } from "@angular/core";
import { gestureAxis, type GestureAxis } from "../lib/presentation-card-motion";

export interface PresentationControlsInputHost {
  showControls: boolean;
  initialPeriodElapsed: boolean;
  onNextSlide(): void;
  onPreviousSlide(): void;
  onTogglePlay(): void;
  onExitPresentation(): void;
  onTouchGestureStart?(): void;
  onTouchDrag?(dx: number, dy: number): void;
  onTouchSwipeCancel?(): void;
  acceptsTouchGesture?(): boolean;
}

/** Skip presentation shortcuts while the user is typing in a form control or rich text editor. */
export function shouldIgnorePresentationKeyboardEvent(
  event: KeyboardEvent
): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (
    target.isContentEditable ||
    target.closest('[contenteditable=""], [contenteditable="true"], .ProseMirror')
  ) {
    return true;
  }

  const field = target.closest("textarea, select, input");
  if (!field) {
    return false;
  }

  if (field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    return true;
  }

  if (field instanceof HTMLInputElement) {
    const type = (field.type || "text").toLowerCase();
    return !["button", "submit", "reset", "image", "hidden"].includes(type);
  }

  return false;
}

@Injectable()
export class PresentationControlsInputController {
  private touchStart: number | null = null;
  private touchStartY: number | null = null;
  private touchEnd: number | null = null;
  private touchEndY: number | null = null;
  private lockedGesture: GestureAxis | null = null;
  private suppressGesture = false;
  private lastTap = 0;
  private readonly minSwipeDistance = 50;
  private readonly doubleTapThreshold = 300;
  private initialTimerHandle: ReturnType<typeof setTimeout> | undefined;

  setupAutoHide(host: PresentationControlsInputHost): void {
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (!isMobile) {
      this.initialTimerHandle = setTimeout(() => {
        host.initialPeriodElapsed = true;
        host.showControls = false;
      }, 5000);
    } else {
      host.initialPeriodElapsed = true;
    }
  }

  cancelInitialAutoHideTimer(): void {
    if (this.initialTimerHandle) {
      clearTimeout(this.initialTimerHandle);
      this.initialTimerHandle = undefined;
    }
  }

  handleMouseMove(event: MouseEvent, host: PresentationControlsInputHost): void {
    if (!host.initialPeriodElapsed) {
      return;
    }

    const windowHeight = window.innerHeight;
    const mouseY = event.clientY;

    if (mouseY > windowHeight * 0.8) {
      host.showControls = true;
    } else if (mouseY < windowHeight * 0.75) {
      host.showControls = false;
    }
  }

  onTouchStart(event: TouchEvent, host: PresentationControlsInputHost): void {
    this.touchEnd = null;
    this.touchEndY = null;
    this.lockedGesture = null;
    if (host.acceptsTouchGesture && !host.acceptsTouchGesture()) {
      this.suppressGesture = true;
      this.touchStart = null;
      this.touchStartY = null;
      return;
    }
    this.suppressGesture = false;
    host.onTouchGestureStart?.();
    this.touchStart = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY ?? 0;

    const now = Date.now();
    if (now - this.lastTap < this.doubleTapThreshold) {
      host.showControls = !host.showControls;
      this.lastTap = 0;
    } else {
      this.lastTap = now;
    }
  }

  onTouchMove(event: TouchEvent, host?: PresentationControlsInputHost): void {
    const touch = event.touches[0];
    if (
      this.suppressGesture ||
      !touch ||
      this.touchStart === null ||
      this.touchStartY === null
    ) {
      return;
    }
    this.touchEnd = touch.clientX;
    this.touchEndY = touch.clientY ?? this.touchStartY;
    const dx = this.touchEnd - this.touchStart;
    const dy = this.touchEndY - this.touchStartY;
    if (this.lockedGesture !== "horizontal" && this.lockedGesture !== "vertical") {
      const axis = gestureAxis(dx, dy);
      if (axis === "undecided") return;
      this.lockedGesture = axis;
    }
    if (this.lockedGesture === "horizontal") {
      host?.onTouchDrag?.(dx, dy);
    }
  }

  onTouchEnd(host: PresentationControlsInputHost): void {
    if (this.suppressGesture) {
      this.suppressGesture = false;
      return;
    }
    if (this.touchStart === null || this.touchEnd === null) {
      return;
    }

    if (this.lockedGesture !== "horizontal") {
      host.onTouchSwipeCancel?.();
      return;
    }

    const distance = this.touchStart - this.touchEnd;
    const isLeftSwipe = distance > this.minSwipeDistance;
    const isRightSwipe = distance < -this.minSwipeDistance;

    if (isLeftSwipe) {
      host.onNextSlide();
    } else if (isRightSwipe) {
      host.onPreviousSlide();
    } else {
      host.onTouchSwipeCancel?.();
    }
  }

  handleKeyboard(event: KeyboardEvent, host: PresentationControlsInputHost): void {
    if (shouldIgnorePresentationKeyboardEvent(event)) {
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        host.onPreviousSlide();
        break;
      case "ArrowRight":
      case " ":
        event.preventDefault();
        host.onNextSlide();
        break;
      case "Escape":
        event.preventDefault();
        host.onExitPresentation();
        break;
      case "p":
      case "P":
        event.preventDefault();
        host.onTogglePlay();
        break;
    }
  }

  destroy(): void {
    this.cancelInitialAutoHideTimer();
  }
}
