import {
  applyMemorizeListenPlaybackRateToMediaElement,
  MEMORIZE_LISTEN_REPEAT_GAP_MS,
  type MemorizeListenSpeed,
  toMemorizeWebSpeechUtteranceRate,
  writeMemorizeListenSpeedToStorage,
} from './memorization/memorizeListenSpeedStorage';
import { getMemorizationListenUtteranceText } from './memorization/memorizationListenUtteranceText';
import { isMemorizeIosWebHost } from './memorization/memorizationViewportPlatform';
import type { MemorizationPracticeSessionFacadeBase } from './memorization-practice-session-facade-base';

export function runPracticeSessionPassageAudioPlay(host: MemorizationPracticeSessionFacadeBase): void {

    const el = host.passageAudioRef?.nativeElement;
    if (el) applyMemorizeListenPlaybackRateToMediaElement(el, host.listenPlaybackRateRef);
    host.passageAudioPlaying = true;
    host.cdr.markForCheck();
  
}

export function runPracticeSessionPassageAudioPause(host: MemorizationPracticeSessionFacadeBase): void {

    host.passageAudioPlaying = false;
    host.cdr.markForCheck();
  
}

export function runPracticeSessionPassageAudioEnded(host: MemorizationPracticeSessionFacadeBase): void {

    host.passageAudioPlaying = false;
    runPracticeSessionBumpListenUi(host);
    if (!host.repeatListenOnRef) return;
    runPracticeSessionClearListenRepeatGapTimer(host);
    host.listenRepeatGapTimer = setTimeout(() => {
      host.listenRepeatGapTimer = null;
      if (!host.repeatListenOnRef) return;
      const el = host.passageAudioRef?.nativeElement;
      if (!el) return;
      el.currentTime = 0;
      applyMemorizeListenPlaybackRateToMediaElement(el, host.listenPlaybackRateRef);
      void el.play().catch(() => {
        host.passageAudioPlaying = false;
        runPracticeSessionBumpListenUi(host);
        host.cdr.markForCheck();
      });
    }, MEMORIZE_LISTEN_REPEAT_GAP_MS);
  
}

export function runPracticeSessionPassageAudioError(host: MemorizationPracticeSessionFacadeBase): void {

    host.passageAudioPlaying = false;
    host.cdr.markForCheck();
  
}

export function runPracticeSessionOpenListenPanel(host: MemorizationPracticeSessionFacadeBase): void {

    host.listenPanelOpen = true;
    runPracticeSessionBumpListenUi(host);
    host.cdr.markForCheck();
  
}

export function runPracticeSessionCloseListenPanel(host: MemorizationPracticeSessionFacadeBase): void {

    host.listenPanelOpen = false;
    host.cdr.markForCheck();
  
}

export function runPracticeSessionSelectListenSpeed(host: MemorizationPracticeSessionFacadeBase, rate: MemorizeListenSpeed): void {

    host.listenPlaybackRate = rate;
    host.listenPlaybackRateRef = rate;
    writeMemorizeListenSpeedToStorage(rate);
    const el = host.passageAudioRef?.nativeElement;
    if (el) applyMemorizeListenPlaybackRateToMediaElement(el, rate);
    runPracticeSessionBumpListenUi(host);
    host.cdr.markForCheck();
  
}

export function runPracticeSessionHandleListenPassageClick(host: MemorizationPracticeSessionFacadeBase): void {

    if (!host.listenInteractionAllowed) return;
    if (host.listenViaStreamingAudio) {
      const el = host.passageAudioRef?.nativeElement;
      if (!el) return;
      if (!el.paused) {
        runPracticeSessionClearListenRepeatGapTimer(host);
        el.pause();
        host.passageAudioPlaying = false;
        runPracticeSessionBumpListenUi(host);
        return;
      }
      void runPracticeSessionPlayStreamingAudio(host, el);
      return;
    }
    runPracticeSessionHandleTtsListenClick(host);
  
}

export function runPracticeSessionHandleRepeatListenToggle(host: MemorizationPracticeSessionFacadeBase): void {

    if (!host.listenInteractionAllowed) return;
    const next = !host.repeatListenOnRef;
    host.repeatListenOnRef = next;
    host.repeatListenOn = next;
    if (next) {
      if (host.listenViaStreamingAudio) {
        const el = host.passageAudioRef?.nativeElement;
        if (el?.paused) void runPracticeSessionPlayStreamingAudio(host, el, true);
        host.cdr.markForCheck();
        return;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && !window.speechSynthesis.speaking) {
        runPracticeSessionBeginTtsUtterance(host);
      } else if (
        typeof window !== 'undefined' &&
        window.speechSynthesis?.speaking &&
        !host.memorizeWebSpeechUtteranceIsOurs
      ) {
        window.speechSynthesis.cancel();
        runPracticeSessionBeginTtsUtterance(host);
      }
    } else {
      runPracticeSessionClearListenRepeatGapTimer(host);
    }
    runPracticeSessionBumpListenUi(host);
    host.cdr.markForCheck();
  
}

export function runPracticeSessionBumpListenUi(host: MemorizationPracticeSessionFacadeBase): void {

    host.listenUiTick += 1;
  
}

export function runPracticeSessionStopPassageAudio(host: MemorizationPracticeSessionFacadeBase): void {

    runPracticeSessionClearListenRepeatGapTimer(host);
    host.repeatListenOnRef = false;
    host.repeatListenOn = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    host.memorizeListenTtsRateAtStart = null;
    host.memorizeListenTtsUserPaused = false;
    host.memorizeListenTtsPostResume = false;
    const el = host.passageAudioRef?.nativeElement;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    host.passageAudioPlaying = false;
    runPracticeSessionBumpListenUi(host);
  
}

export function runPracticeSessionClearListenRepeatGapTimer(host: MemorizationPracticeSessionFacadeBase): void {

    if (host.listenRepeatGapTimer != null) {
      clearTimeout(host.listenRepeatGapTimer);
      host.listenRepeatGapTimer = null;
    }
  
}

export async function runPracticeSessionPlayStreamingAudio(host: MemorizationPracticeSessionFacadeBase, el: HTMLAudioElement, fromStart = false): Promise<void> {

    try {
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
      }
      host.memorizeWebSpeechUtteranceIsOurs = false;
      if (!el.getAttribute('src') && host.passageAudioUrl) {
        el.src = host.passageAudioUrl;
      }
      if (fromStart) el.currentTime = 0;
      applyMemorizeListenPlaybackRateToMediaElement(el, host.listenPlaybackRateRef);
      await el.play();
      host.passageAudioPlaying = true;
      runPracticeSessionBumpListenUi(host);
    } catch {
      host.passageAudioPlaying = false;
      runPracticeSessionBumpListenUi(host);
      host.cdr.markForCheck();
    }
  
}

export function runPracticeSessionHandleTtsListenClick(host: MemorizationPracticeSessionFacadeBase): void {

    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const syn = window.speechSynthesis;
    if (syn.speaking) {
      if (!host.memorizeWebSpeechUtteranceIsOurs) {
        host.memorizeListenTtsUserPaused = false;
        host.memorizeListenTtsPostResume = false;
        syn.cancel();
        runPracticeSessionBeginTtsUtterance(host);
        runPracticeSessionBumpListenUi(host);
        return;
      }
      if (syn.paused) {
        host.memorizeListenTtsUserPaused = false;
        const atStart = host.memorizeListenTtsRateAtStart;
        if (atStart != null && host.listenPlaybackRateRef !== atStart) {
          syn.cancel();
          host.memorizeListenTtsRateAtStart = null;
          host.memorizeListenTtsPostResume = false;
          runPracticeSessionBeginTtsUtterance(host);
        } else {
          host.memorizeListenTtsPostResume = true;
          syn.resume();
          setTimeout(() => runPracticeSessionBumpListenUi(host), 24);
          setTimeout(() => runPracticeSessionBumpListenUi(host), 72);
        }
      } else {
        host.memorizeListenTtsUserPaused = true;
        host.memorizeListenTtsPostResume = false;
        syn.pause();
      }
      runPracticeSessionBumpListenUi(host);
      return;
    }
    runPracticeSessionBeginTtsUtterance(host);
  
}

export function runPracticeSessionBeginTtsUtterance(host: MemorizationPracticeSessionFacadeBase): void {

    if (host.memorizeAndroidHost) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const text = getMemorizationListenUtteranceText(
      host.item,
      host.isBibleBooks ? undefined : host.passageText
    );
    if (!text.trim()) return;

    host.memorizeListenTtsUserPaused = false;
    host.memorizeListenTtsPostResume = false;
    const syn = window.speechSynthesis;
    host.memorizeWebSpeechUtteranceIsOurs = false;
    syn.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    const rate = host.listenPlaybackRateRef;
    u.rate = toMemorizeWebSpeechUtteranceRate(rate, isMemorizeIosWebHost());
    host.memorizeListenTtsRateAtStart = rate;
    u.onstart = () => {
      host.memorizeWebSpeechUtteranceIsOurs = true;
      host.memorizeListenTtsPostResume = false;
      runPracticeSessionBumpListenUi(host);
      host.cdr.markForCheck();
    };
    u.onend = () => {
      host.memorizeWebSpeechUtteranceIsOurs = false;
      host.memorizeListenTtsUserPaused = false;
      host.memorizeListenTtsPostResume = false;
      host.memorizeListenTtsRateAtStart = null;
      runPracticeSessionBumpListenUi(host);
      host.cdr.markForCheck();
      if (!host.repeatListenOnRef) return;
      runPracticeSessionClearListenRepeatGapTimer(host);
      host.listenRepeatGapTimer = setTimeout(() => {
        host.listenRepeatGapTimer = null;
        if (!host.repeatListenOnRef) return;
        runPracticeSessionBeginTtsUtterance(host);
      }, MEMORIZE_LISTEN_REPEAT_GAP_MS);
    };
    u.onerror = () => {
      host.memorizeWebSpeechUtteranceIsOurs = false;
      host.memorizeListenTtsUserPaused = false;
      host.memorizeListenTtsPostResume = false;
      host.memorizeListenTtsRateAtStart = null;
      runPracticeSessionBumpListenUi(host);
      host.cdr.markForCheck();
    };
    syn.speak(u);
    runPracticeSessionBumpListenUi(host);
    host.cdr.markForCheck();
  
}