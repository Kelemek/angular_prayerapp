export const PRESENTATION_CARD_SLIDE_MS = 320;
export const PRESENTATION_SWIPE_AXIS_SLOP_PX = 8;

export type SlideDirection = "next" | "previous";
export type GestureAxis = "undecided" | "horizontal" | "vertical";
export type ManualSlideOutcome = "started" | "ignored" | "instant";

export interface CardDeckPosition {
  index: number;
  count: number;
  loop: boolean;
}

export type CardMotionState =
  | { phase: "rest" }
  | { phase: "drag"; dx: number; axis: GestureAxis }
  | {
      phase: "slide";
      direction: SlideDirection;
      incomingIndex: number;
      engaged: boolean;
    }
  | { phase: "snap-back"; peek: SlideDirection | null };

export type CardLayerTransition = "eased" | "none";

export interface CardMotionView {
  currentTransform: string;
  incomingTransform: string | null;
  incomingIndex: number | null;
  transition: CardLayerTransition;
}

export interface PresentationCardMotionHooks {
  onFrame: () => void;
  prefersReducedMotion?: () => boolean;
}

export function neighborIndex(
  deck: CardDeckPosition,
  direction: SlideDirection,
): number | null {
  if (deck.count <= 0) return null;
  if (direction === "next") {
    if (deck.loop) return (deck.index + 1) % deck.count;
    return deck.index < deck.count - 1 ? deck.index + 1 : null;
  }
  if (!deck.loop && deck.index === 0) return null;
  if (deck.loop && deck.index === 0) return deck.count - 1;
  return deck.index - 1;
}

export function gestureAxis(dx: number, dy: number): GestureAxis {
  if (
    Math.abs(dx) < PRESENTATION_SWIPE_AXIS_SLOP_PX &&
    Math.abs(dy) < PRESENTATION_SWIPE_AXIS_SLOP_PX
  ) {
    return "undecided";
  }
  return Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
}

export function presentationCardMotionFrame(
  state: CardMotionState,
  deck: CardDeckPosition,
): CardMotionView {
  switch (state.phase) {
    case "rest":
      return restFrame();
    case "drag":
      return dragFrame(state.dx, state.axis, deck);
    case "slide":
      return slideFrame(state);
    case "snap-back":
      return snapFrame(state.peek, deck);
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

function restFrame(): CardMotionView {
  return {
    currentTransform: "translate3d(0,0,0)",
    incomingTransform: null,
    incomingIndex: null,
    transition: "none",
  };
}

function dragFrame(
  dx: number,
  axis: GestureAxis,
  deck: CardDeckPosition,
): CardMotionView {
  if (axis !== "horizontal" || dx === 0) return restFrame();
  const direction: SlideDirection = dx < 0 ? "next" : "previous";
  const incomingIndex = neighborIndex(deck, direction);
  return {
    currentTransform: `translate3d(${dx}px,0,0)`,
    incomingTransform:
      incomingIndex === null
        ? null
        : `translate3d(calc(${direction === "next" ? "100%" : "-100%"} + ${dx}px),0,0)`,
    incomingIndex,
    transition: "none",
  };
}

function slideFrame(
  state: Extract<CardMotionState, { phase: "slide" }>,
): CardMotionView {
  const nextward = state.direction === "next";
  if (!state.engaged) {
    return {
      currentTransform: "translate3d(0,0,0)",
      incomingTransform: nextward
        ? "translate3d(100%,0,0)"
        : "translate3d(-100%,0,0)",
      incomingIndex: state.incomingIndex,
      transition: "none",
    };
  }
  return {
    currentTransform: nextward
      ? "translate3d(-100%,0,0)"
      : "translate3d(100%,0,0)",
    incomingTransform: "translate3d(0,0,0)",
    incomingIndex: state.incomingIndex,
    transition: "eased",
  };
}

function snapFrame(
  peek: SlideDirection | null,
  deck: CardDeckPosition,
): CardMotionView {
  if (peek === null) {
    return { ...restFrame(), transition: "eased" };
  }
  return {
    currentTransform: "translate3d(0,0,0)",
    incomingTransform:
      peek === "next" ? "translate3d(100%,0,0)" : "translate3d(-100%,0,0)",
    incomingIndex: neighborIndex(deck, peek),
    transition: "eased",
  };
}

function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export class PresentationCardMotion {
  state: CardMotionState = { phase: "rest" };
  private playInterrupted = false;
  private lockedAxis: GestureAxis | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private frameHandle: number | null = null;
  private destroyed = false;

  constructor(private readonly hooks: PresentationCardMotionHooks) {}

  frame(deck: CardDeckPosition): CardMotionView {
    return presentationCardMotionFrame(this.state, deck);
  }

  prefersReducedMotion(): boolean {
    return this.hooks.prefersReducedMotion?.() ?? systemPrefersReducedMotion();
  }

  isAnimating(): boolean {
    return this.state.phase === "slide" || this.state.phase === "snap-back";
  }

  interruptPlay(): void {
    this.playInterrupted = true;
  }

  hasPlayInterrupt(): boolean {
    return this.playInterrupted;
  }

  takePlayInterrupt(): boolean {
    const interrupted = this.playInterrupted;
    this.playInterrupted = false;
    return interrupted;
  }

  beginGesture(): void {
    if (this.destroyed || this.isAnimating()) return;
    this.lockedAxis = null;
  }

  updateDrag(dx: number, dy: number): GestureAxis {
    if (this.destroyed || this.isAnimating() || this.prefersReducedMotion()) {
      return this.lockedAxis ?? "undecided";
    }
    const axis =
      this.lockedAxis === "horizontal" || this.lockedAxis === "vertical"
        ? this.lockedAxis
        : gestureAxis(dx, dy);
    if (axis === "vertical") {
      this.lockedAxis = "vertical";
      this.state = { phase: "rest" };
      return "vertical";
    }
    if (axis === "undecided") {
      this.state = { phase: "drag", dx: 0, axis: "undecided" };
      return "undecided";
    }
    this.lockedAxis = "horizontal";
    this.state = { phase: "drag", dx, axis: "horizontal" };
    return "horizontal";
  }

  beginSlide(
    direction: SlideDirection,
    incomingIndex: number,
    onCommit: () => void,
  ): ManualSlideOutcome {
    if (this.destroyed || this.isAnimating()) return "ignored";
    if (this.prefersReducedMotion()) {
      this.state = { phase: "rest" };
      this.lockedAxis = null;
      return "instant";
    }
    const fromDrag =
      this.state.phase === "drag" && this.state.axis === "horizontal";
    this.clearHandles();
    this.state = {
      phase: "slide",
      direction,
      incomingIndex,
      engaged: fromDrag,
    };
    if (fromDrag) {
      this.armCommit(onCommit);
      return "started";
    }
    this.parkThenEngage(onCommit);
    return "started";
  }

  private parkThenEngage(onCommit: () => void): void {
    this.frameHandle = requestAnimationFrame(() => {
      this.frameHandle = requestAnimationFrame(() => {
        this.frameHandle = null;
        if (this.destroyed || this.state.phase !== "slide" || this.state.engaged) {
          return;
        }
        this.engageSlide(onCommit);
      });
    });
  }

  private engageSlide(onCommit: () => void): void {
    if (this.state.phase !== "slide") return;
    this.state = { ...this.state, engaged: true };
    this.hooks.onFrame();
    this.armCommit(onCommit);
  }

  snapBack(onDone: () => void): boolean {
    if (
      this.destroyed ||
      this.state.phase !== "drag" ||
      this.state.axis !== "horizontal" ||
      this.state.dx === 0
    ) {
      if (this.state.phase === "drag") this.state = { phase: "rest" };
      this.lockedAxis = null;
      return false;
    }
    const peek: SlideDirection | null =
      this.state.dx < 0 ? "next" : this.state.dx > 0 ? "previous" : null;
    this.clearHandles();
    this.state = { phase: "snap-back", peek };
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.destroyed) return;
      this.lockedAxis = null;
      this.state = { phase: "rest" };
      onDone();
      this.hooks.onFrame();
    }, PRESENTATION_CARD_SLIDE_MS);
    return true;
  }

  targetsMissingIndex(count: number): boolean {
    return (
      this.state.phase === "slide" &&
      (this.state.incomingIndex < 0 || this.state.incomingIndex >= count)
    );
  }

  cancelToRest(): boolean {
    const active =
      this.isAnimating() ||
      this.state.phase === "drag" ||
      this.playInterrupted ||
      this.timer !== null ||
      this.frameHandle !== null;
    this.clearHandles();
    this.lockedAxis = null;
    this.playInterrupted = false;
    this.state = { phase: "rest" };
    return active;
  }

  destroy(): void {
    this.destroyed = true;
    this.clearHandles();
    this.lockedAxis = null;
    this.state = { phase: "rest" };
  }

  private armCommit(onCommit: () => void): void {
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.destroyed || this.state.phase !== "slide") return;
      this.lockedAxis = null;
      this.state = { phase: "rest" };
      onCommit();
      this.hooks.onFrame();
    }, PRESENTATION_CARD_SLIDE_MS);
  }

  private clearHandles(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
  }
}
