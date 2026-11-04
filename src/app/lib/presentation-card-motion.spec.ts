import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRESENTATION_CARD_SLIDE_MS,
  PresentationCardMotion,
  gestureAxis,
  neighborIndex,
  presentationCardMotionFrame,
  type CardDeckPosition,
} from "./presentation-card-motion";

const deck = (overrides: Partial<CardDeckPosition> = {}): CardDeckPosition => ({
  index: 0,
  count: 3,
  loop: true,
  ...overrides,
});

function queuedFrames() {
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    queue.push(cb);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    queue[id - 1] = () => {};
  });
  return {
    flush() {
      const batch = queue.splice(0, queue.length);
      for (const cb of batch) cb(0);
    },
  };
}

describe("neighborIndex", () => {
  it("wraps next and previous when loop is on", () => {
    expect(neighborIndex(deck({ index: 2 }), "next")).toBe(0);
    expect(neighborIndex(deck({ index: 0 }), "previous")).toBe(2);
  });

  it("stops at the ends when loop is off", () => {
    expect(neighborIndex(deck({ index: 2, loop: false }), "next")).toBeNull();
    expect(neighborIndex(deck({ index: 0, loop: false }), "previous")).toBeNull();
    expect(neighborIndex(deck({ index: 0, loop: false }), "next")).toBe(1);
  });
});

describe("gestureAxis", () => {
  it("treats a taller move as vertical", () => {
    expect(gestureAxis(-80, 140)).toBe("vertical");
    expect(gestureAxis(-80, 10)).toBe("horizontal");
    expect(gestureAxis(2, 3)).toBe("undecided");
  });
});

describe("presentationCardMotionFrame", () => {
  const position = deck({ index: 1, loop: false });

  it("parks the next card on the right, then sends the current card left", () => {
    const parked = presentationCardMotionFrame(
      { phase: "slide", direction: "next", incomingIndex: 2, engaged: false },
      position,
    );
    expect(parked.currentTransform).toBe("translate3d(0,0,0)");
    expect(parked.incomingTransform).toBe("translate3d(100%,0,0)");
    expect(parked.incomingIndex).toBe(2);
    expect(parked.transition).toBe("none");

    const moving = presentationCardMotionFrame(
      { phase: "slide", direction: "next", incomingIndex: 2, engaged: true },
      position,
    );
    expect(moving.currentTransform).toBe("translate3d(-100%,0,0)");
    expect(moving.incomingTransform).toBe("translate3d(0,0,0)");
    expect(moving.transition).toBe("eased");
  });

  it("reverses the slide for previous", () => {
    const parked = presentationCardMotionFrame(
      { phase: "slide", direction: "previous", incomingIndex: 0, engaged: false },
      position,
    );
    expect(parked.incomingTransform).toBe("translate3d(-100%,0,0)");

    const moving = presentationCardMotionFrame(
      { phase: "slide", direction: "previous", incomingIndex: 0, engaged: true },
      position,
    );
    expect(moving.currentTransform).toBe("translate3d(100%,0,0)");
    expect(moving.incomingTransform).toBe("translate3d(0,0,0)");
  });

  it("follows the finger and peeks the card from the opposite side", () => {
    const left = presentationCardMotionFrame(
      { phase: "drag", dx: -40, axis: "horizontal" },
      position,
    );
    expect(left.currentTransform).toBe("translate3d(-40px,0,0)");
    expect(left.incomingTransform).toBe("translate3d(calc(100% + -40px),0,0)");
    expect(left.incomingIndex).toBe(2);
    expect(left.transition).toBe("none");

    const right = presentationCardMotionFrame(
      { phase: "drag", dx: 40, axis: "horizontal" },
      position,
    );
    expect(right.currentTransform).toBe("translate3d(40px,0,0)");
    expect(right.incomingTransform).toBe("translate3d(calc(-100% + 40px),0,0)");
    expect(right.incomingIndex).toBe(0);
  });

  it("does not peek a card past a non-looping end", () => {
    const blocked = presentationCardMotionFrame(
      { phase: "drag", dx: 30, axis: "horizontal" },
      deck({ index: 0, loop: false }),
    );
    expect(blocked.currentTransform).toBe("translate3d(30px,0,0)");
    expect(blocked.incomingIndex).toBeNull();
    expect(blocked.incomingTransform).toBeNull();
  });
});

describe("PresentationCardMotion", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("ignores a second slide until the first commits", () => {
    vi.useFakeTimers();
    const frames = queuedFrames();
    const commits: number[] = [];
    const motion = new PresentationCardMotion({
      onFrame: () => {},
      prefersReducedMotion: () => false,
    });

    expect(motion.beginSlide("next", 1, () => commits.push(1))).toBe("started");
    expect(motion.beginSlide("next", 2, () => commits.push(2))).toBe("ignored");
    frames.flush();
    frames.flush();
    expect(motion.frame(deck()).currentTransform).toBe("translate3d(-100%,0,0)");

    vi.advanceTimersByTime(PRESENTATION_CARD_SLIDE_MS);
    expect(commits).toEqual([1]);
    expect(motion.state.phase).toBe("rest");
    expect(motion.beginSlide("next", 2, () => commits.push(2))).toBe("started");
  });

  it("changes nothing visually when reduced motion is requested", () => {
    const motion = new PresentationCardMotion({
      onFrame: () => {},
      prefersReducedMotion: () => true,
    });
    expect(motion.beginSlide("next", 1, () => {})).toBe("instant");
    expect(motion.frame(deck())).toEqual({
      currentTransform: "translate3d(0,0,0)",
      incomingTransform: null,
      incomingIndex: null,
      transition: "none",
    });
    expect(motion.updateDrag(-80, 0)).toBe("undecided");
    expect(motion.state.phase).toBe("rest");
  });

  it("snaps a short drag back and does not commit", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const motion = new PresentationCardMotion({
      onFrame: () => {},
      prefersReducedMotion: () => false,
    });
    motion.updateDrag(-20, 0);
    expect(motion.snapBack(done)).toBe(true);
    expect(motion.isAnimating()).toBe(true);
    expect(motion.frame(deck({ index: 1 })).currentTransform).toBe(
      "translate3d(0,0,0)",
    );
    vi.advanceTimersByTime(PRESENTATION_CARD_SLIDE_MS);
    expect(done).toHaveBeenCalledOnce();
    expect(motion.state.phase).toBe("rest");
  });

  it("finishes a finger drag as a slide without parking back at center", () => {
    vi.useFakeTimers();
    const motion = new PresentationCardMotion({
      onFrame: () => {},
      prefersReducedMotion: () => false,
    });
    motion.updateDrag(-70, 0);
    expect(motion.beginSlide("next", 1, () => {})).toBe("started");
    expect(motion.frame(deck()).currentTransform).toBe("translate3d(-100%,0,0)");
    expect(motion.frame(deck()).transition).toBe("eased");
  });

  it("reads prefers-reduced-motion from matchMedia when no override is set", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const motion = new PresentationCardMotion({ onFrame: () => {} });
    expect(motion.prefersReducedMotion()).toBe(true);
    expect(motion.beginSlide("previous", 2, () => {})).toBe("instant");
  });
});
