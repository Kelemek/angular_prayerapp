import { isKeyboardPracticeMode } from './memorization/memorizationKeyboardPractice';
import {
  memorizeStickyHeaderVisibleTop,
  memorizeWordModeVisibleBottom,
} from './memorization/memorizationScrollIntoPractice';
import { isMemorizeAndroidWebHost } from './memorization/memorizationViewportPlatform';
import {
  MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX,
  MEMORIZE_EXTRA_GAP_ABOVE_WORD_CHOICES_PX,
  MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS,
} from './memorization-practice-session-ui';
import { runPracticeSessionStopPassageAudio } from './memorization-practice-session-listen-run';
import type { MemorizationPracticeSessionFacade } from './memorization-practice-session-facade';

export function runPracticeSessionResolvePracticeInputEl(host: MemorizationPracticeSessionFacade): HTMLInputElement | null {

    const fromRef = host.practiceInputRef?.nativeElement ?? null;
    if (fromRef?.isConnected) return fromRef;
    // ViewChild can lag one tick after @if creates the input; query by id so iOS
    // can still focus inside the same user-gesture turn (required to open the keyboard).
    return host.document.getElementById(host.practiceInputId) as HTMLInputElement | null;
  
}

export function runPracticeSessionFocusPracticeInput(host: MemorizationPracticeSessionFacade): boolean {

    const input = runPracticeSessionResolvePracticeInputEl(host);
    if (!input || input.disabled) return false;
    // Some WebKit builds ignore focus on a fully clipped field until it can receive
    // a soft click; click() after focus helps open the software keyboard.
    try {
      input.focus({ preventScroll: true });
    } catch {
      try {
        input.focus();
      } catch {
        return false;
      }
    }
    try {
      input.click();
    } catch {
      // ignore
    }
    return host.document.activeElement === input;
  
}

export function runPracticeSessionScheduleKeyboardPracticeFocus(host: MemorizationPracticeSessionFacade): void {

    if (!isKeyboardPracticeMode(host.practiceModeRef)) return;

    const focusWhenReady = (): boolean => {
      if (!host.isOpen || host.awaitingRoundAdvance) return false;
      const canFocus =
        (host.phase === 'practicing' && isKeyboardPracticeMode(host.practiceMode)) ||
        host.resumeKeyboardPrimeActive;
      if (!canFocus) return false;
      runPracticeSessionEnsureTypeModeCaptureAttached(host);
      runPracticeSessionEnsureHintCaptureAttached(host);
      const focused = runPracticeSessionFocusPracticeInput(host);
      if (host.practiceMode === 'firstLetters' && host.phase === 'practicing') {
        runPracticeSessionScrollActiveFirstLetterCueIntoView(host);
      }
      // Keep the focused verse blank on screen once practicing UI is ready.
      if (host.phase === 'practicing') {
        runPracticeSessionScrollCurrentBlankIntoView(host);
      }
      // Scroll must not steal focus from the practice input (keyboard would dismiss).
      if (focused && host.document.activeElement !== runPracticeSessionResolvePracticeInputEl(host)) {
        runPracticeSessionFocusPracticeInput(host);
      }
      return focused;
    };

    host.cdr.markForCheck();
    try {
      host.cdr.detectChanges();
    } catch {
      // jsdom / test environments may not support full CD
    }
    if (focusWhenReady()) return;
    // Fallback if the input was not in the DOM yet (still try ASAP for mobile keyboards).
    requestAnimationFrame(() => {
      if (focusWhenReady()) return;
      requestAnimationFrame(() => {
        focusWhenReady();
      });
    });
  
}

export function runPracticeSessionRestorePracticeInputFocusAfterHint(host: MemorizationPracticeSessionFacade): void {

    requestAnimationFrame(() => {
      if (host.awaitingRoundAdvanceRef || host.phase !== 'practicing') return;
      if (!isKeyboardPracticeMode(host.practiceModeRef)) return;
      runPracticeSessionFocusPracticeInput(host);
    });
  
}

export function runPracticeSessionStartHintInterval(host: MemorizationPracticeSessionFacade): void {

    runPracticeSessionClearHintInterval(host);
    if (!host.hintActive || host.practiceMode === 'reorder') return;
    host.hintIntervalId = setInterval(() => {
      host.hintPeekCount = Math.min(host.hintPeekCount + 1, host.unrevealedHiddenSorted.length);
      host.cdr.markForCheck();
    }, MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS);
  
}

export function runPracticeSessionSchedulePracticeEffects(host: MemorizationPracticeSessionFacade): void {

    if (host.awaitingRoundAdvance || host.phase !== 'intro') {
      runPracticeSessionStopPassageAudio(host);
    }

    if (!host.listenInteractionAllowed) {
      host.listenPanelOpen = false;
    }

    if (
      host.phase === 'practicing' &&
      !host.awaitingRoundAdvance &&
      host.currentTargetIndex !== null &&
      !host.hintActive &&
      isKeyboardPracticeMode(host.practiceMode)
    ) {
      runPracticeSessionScheduleKeyboardPracticeFocus(host);
    }

    if (
      host.phase === 'practicing' &&
      !host.awaitingRoundAdvance &&
      host.currentTargetIndex !== null &&
      host.practiceMode === 'word'
    ) {
      // Defer until the word-choice footer has laid out (row wrap can change height).
      runPracticeSessionScheduleScrollToBlank(host, { force: true });
    }

    if (
      host.phase === 'practicing' &&
      !host.awaitingRoundAdvance &&
      host.currentTargetIndex !== null &&
      host.practiceMode !== 'word' &&
      host.hasTypedInRound
    ) {
      runPracticeSessionScrollCurrentBlankIntoView(host);
    }

    if (host.phase === 'done' && host.practiceScrollRef?.nativeElement) {
      host.practiceScrollRef.nativeElement.scrollTop = 0;
    }

    if (host.practiceMode === 'firstLetters' && host.phase === 'practicing' && !host.awaitingRoundAdvance) {
      runPracticeSessionScrollActiveFirstLetterCueIntoView(host);
    }
  
}

export function runPracticeSessionScheduleScrollToBlank(host: MemorizationPracticeSessionFacade, options?: { force?: boolean }): void {

    if (!options?.force && !host.hasTypedInRound) return;
    if (host.scrollBlankTimer) clearTimeout(host.scrollBlankTimer);
    const delayMs = isMemorizeAndroidWebHost() ? 120 : 80;
    host.scrollBlankTimer = setTimeout(() => {
      host.scrollBlankTimer = null;
      if (host.practiceMode === 'firstLetters') {
        host.scrollActiveFirstLetterCueIntoView();
      }
      host.scrollCurrentBlankIntoView();
    }, delayMs);
  
}

export function runPracticeSessionScrollCurrentBlankIntoView(host: MemorizationPracticeSessionFacade): void {

    requestAnimationFrame(() => {
      const root =
        host.practiceWordsWordRef?.nativeElement ?? host.practiceWordsTypeRef?.nativeElement;
      const scrollEl = host.practiceScrollRef?.nativeElement;
      if (!root || !scrollEl) return;
      const el = root.querySelector<HTMLElement>('[data-memorize-current-blank="true"]');
      if (!el) return;
      if (isMemorizeAndroidWebHost() && Date.now() < host.androidScrollClampUntil) {
        scrollEl.scrollTop = 0;
        return;
      }

      // One instant adjustment (no nearest + smooth combo — that reads as a bounce).
      const applyVisibleNudge = () => {
        const vv = window.visualViewport;
        const edgeMargin = 12;
        const isWordMode = host.practiceModeRef === 'word';
        const isFirstLetters = host.practiceModeRef === 'firstLetters';
        const scrollRect = scrollEl.getBoundingClientRect();
        let viewTop = scrollRect.top + edgeMargin;
        let viewBottom = scrollRect.bottom - edgeMargin;

        if (isWordMode) {
          const wordChoices = host.document.querySelector<HTMLElement>(
            '[data-testid="memorize-word-choices"]'
          );
          const wordChoicesTop = wordChoices?.getBoundingClientRect().top ?? null;
          viewBottom = memorizeWordModeVisibleBottom(
            scrollRect.bottom,
            wordChoicesTop,
            edgeMargin,
            MEMORIZE_EXTRA_GAP_ABOVE_WORD_CHOICES_PX
          );
        } else {
          const stickyHeader = isFirstLetters
            ? host.document.querySelector<HTMLElement>(
                '[data-testid="memorize-practice-round-header"]'
              )
            : null;
          const stickyBottom = stickyHeader?.getBoundingClientRect().bottom ?? null;
          if (vv) {
            viewTop = memorizeStickyHeaderVisibleTop(vv.offsetTop, stickyBottom, edgeMargin);
            viewBottom =
              vv.offsetTop + vv.height - edgeMargin - MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX;
          } else {
            viewTop = memorizeStickyHeaderVisibleTop(scrollRect.top, stickyBottom, edgeMargin);
          }
        }

        const rect = el.getBoundingClientRect();
        let delta = 0;
        if (rect.bottom > viewBottom) delta += rect.bottom - viewBottom;
        if (rect.top < viewTop) delta -= viewTop - rect.top;
        if (Math.abs(delta) < 0.5) return;
        const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        scrollEl.scrollTop = Math.max(0, Math.min(scrollEl.scrollTop + delta, maxScroll));
      };

      applyVisibleNudge();
      // Re-measure once after layout/keyboard inset settles (still instant, no animation).
      requestAnimationFrame(applyVisibleNudge);
    });
  
}

export function runPracticeSessionScrollActiveFirstLetterCueIntoView(host: MemorizationPracticeSessionFacade): void {

    const root = host.firstLetterCuesViewportRef?.nativeElement;
    if (!root) return;
    const slot =
      host.currentTargetIndex !== null
        ? host.typableIndices.indexOf(host.currentTargetIndex)
        : -1;
    const target =
      slot >= 0 ? root.querySelector<HTMLElement>(`[data-memorize-cue-slot="${slot}"]`) : null;
    if (!target) {
      root.scrollTop = 0;
      return;
    }
    // Scroll only the cue strip — scrollIntoView can also move #practiceScroll and bounce.
    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetCenter = targetRect.top + targetRect.height / 2;
    const rootCenter = rootRect.top + rootRect.height / 2;
    const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
    root.scrollTop = Math.max(0, Math.min(root.scrollTop + (targetCenter - rootCenter), maxScroll));
  
}

export function runPracticeSessionAttachViewportListeners(host: MemorizationPracticeSessionFacade): void {

    if (host.viewportListenersAttached || typeof window === 'undefined') return;
    host.viewportListenersAttached = true;
    const vv = window.visualViewport;
    if (!vv) return;
    const coalesceAndroid = isMemorizeAndroidWebHost();
    let insetRaf = 0;
    const applyInset = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      host.keyboardInsetPx = inset;
      host.cdr.markForCheck();
    };
    const updateInset = () => {
      if (!coalesceAndroid) {
        applyInset();
        return;
      }
      if (insetRaf) return;
      insetRaf = window.requestAnimationFrame(() => {
        insetRaf = 0;
        applyInset();
      });
    };
    applyInset();
    vv.addEventListener('resize', updateInset);
    vv.addEventListener('scroll', updateInset);
  
}

export function runPracticeSessionAttachPracticeListeners(host: MemorizationPracticeSessionFacade): void {

    runPracticeSessionAttachAndroidScrollClamp(host);
    runPracticeSessionAttachTypeModeCapture(host);
    runPracticeSessionAttachHintCapture(host);
    runPracticeSessionAttachFirstLetterResizeObserver(host);
  
}

export function runPracticeSessionAttachAndroidScrollClamp(host: MemorizationPracticeSessionFacade): void {

    if (!host.memorizeAndroidHost || host.androidScrollListener) return;
    const scrollEl = host.practiceScrollRef?.nativeElement;
    if (!scrollEl) return;
    host.androidScrollListener = () => {
      if (Date.now() < host.androidScrollClampUntil) {
        scrollEl.scrollTop = 0;
      }
    };
    scrollEl.addEventListener('scroll', host.androidScrollListener, { passive: false });
  
}

export function runPracticeSessionAttachTypeModeCapture(host: MemorizationPracticeSessionFacade): void {

    runPracticeSessionEnsureTypeModeCaptureAttached(host);
  
}

export function runPracticeSessionEnsureTypeModeCaptureAttached(host: MemorizationPracticeSessionFacade): void {

    if (host.typeCaptureListenersAttached) return;
    const el = host.practiceWordsTypeRef?.nativeElement;
    if (!el || !isKeyboardPracticeMode(host.practiceMode)) return;
    const onTouchStartCaptureVerse = (e: TouchEvent) => {
      if (host.awaitingRoundAdvanceRef) return;
      const input = host.practiceInputRef?.nativeElement;
      if (!input) return;
      if (document.activeElement === input) e.preventDefault();
    };
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      runPracticeSessionKeepPracticeInputOnPointerCapture(host, e);
    };
    el.addEventListener('touchstart', onTouchStartCaptureVerse, { capture: true, passive: false });
    el.addEventListener('pointerdown', onPointerDownCapture, { capture: true });
    host.typeCaptureListenersAttached = true;
  
}

export function runPracticeSessionAttachHintCapture(host: MemorizationPracticeSessionFacade): void {

    runPracticeSessionEnsureHintCaptureAttached(host);
  
}

export function runPracticeSessionEnsureHintCaptureAttached(host: MemorizationPracticeSessionFacade): void {

    if (host.hintCaptureListenersAttached) return;
    const el = host.hintButtonRef?.nativeElement;
    if (!el) return;
    const handler = (e: PointerEvent | TouchEvent) => runPracticeSessionKeepPracticeInputOnPointerCapture(host, e);
    el.addEventListener('touchstart', handler as EventListener, { capture: true, passive: false });
    el.addEventListener('pointerdown', handler as EventListener, { capture: true });
    host.hintCaptureListenersAttached = true;
  
}

export function runPracticeSessionKeepPracticeInputOnPointerCapture(host: MemorizationPracticeSessionFacade, e: PointerEvent | TouchEvent): void {

    if (host.awaitingRoundAdvanceRef) return;
    if (!isKeyboardPracticeMode(host.practiceModeRef)) return;
    const t = e.target;
    if (t instanceof Element && t.closest('[data-testid="memorize-hint-button"]')) return;
    const input = host.practiceInputRef?.nativeElement;
    if (!input) return;
    if (document.activeElement === input) {
      e.preventDefault();
      return;
    }
    input.focus({ preventScroll: true });
  
}

export function runPracticeSessionAttachFirstLetterResizeObserver(host: MemorizationPracticeSessionFacade): void {

    if (typeof ResizeObserver === 'undefined') return;
    if (host.practiceMode !== 'firstLetters' || host.phase !== 'practicing' || host.awaitingRoundAdvance) {
      return;
    }
    const root = host.firstLetterCuesViewportRef?.nativeElement;
    if (!root) return;
    host.resizeObserver?.disconnect();
    let raf = 0;
    host.resizeObserver = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!root.isConnected) return;
        runPracticeSessionScrollActiveFirstLetterCueIntoView(host);
        runPracticeSessionScrollCurrentBlankIntoView(host);
      });
    });
    host.resizeObserver.observe(root);
  
}

export function runPracticeSessionDetachAllListeners(host: MemorizationPracticeSessionFacade): void {

    runPracticeSessionClearHintInterval(host);
    if (host.scrollBlankTimer) {
      clearTimeout(host.scrollBlankTimer);
      host.scrollBlankTimer = null;
    }
    const scrollEl = host.practiceScrollRef?.nativeElement;
    if (scrollEl && host.androidScrollListener) {
      scrollEl.removeEventListener('scroll', host.androidScrollListener);
      host.androidScrollListener = null;
    }
    host.resizeObserver?.disconnect();
    host.resizeObserver = null;
    host.typeCaptureListenersAttached = false;
    host.hintCaptureListenersAttached = false;
  
}

export function runPracticeSessionClearHintInterval(host: MemorizationPracticeSessionFacade): void {

    if (host.hintIntervalId) {
      clearInterval(host.hintIntervalId);
      host.hintIntervalId = null;
    }
  
}