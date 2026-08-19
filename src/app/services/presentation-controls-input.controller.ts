import { Injectable } from "@angular/core";

export interface PresentationControlsInputHost {
  showControls: boolean;
  initialPeriodElapsed: boolean;
  onNextSlide(): void;
  onPreviousSlide(): void;
  onTogglePlay(): void;
  onExitPresentation(): void;
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
  private touchEnd: number | null = null;
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
    this.touchStart = event.touches[0].clientX;

    const now = Date.now();
    if (now - this.lastTap < this.doubleTapThreshold) {
      host.showControls = !host.showControls;
      this.lastTap = 0;
    } else {
      this.lastTap = now;
    }
  }

  onTouchMove(event: TouchEvent): void {
    this.touchEnd = event.touches[0].clientX;
  }

  onTouchEnd(host: PresentationControlsInputHost): void {
    if (!this.touchStart || !this.touchEnd) {
      return;
    }

    const distance = this.touchStart - this.touchEnd;
    const isLeftSwipe = distance > this.minSwipeDistance;
    const isRightSwipe = distance < -this.minSwipeDistance;

    if (isLeftSwipe) {
      host.onNextSlide();
    } else if (isRightSwipe) {
      host.onPreviousSlide();
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
