import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { BehaviorSubject } from 'rxjs';
import { ElementRef, SimpleChange, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';
import { MemorizationPracticeSessionHeaderComponent } from './memorization-practice-session-header.component';
import { ScriptureService } from '../../services/scripture.service';
import { UserSessionService } from '../../services/user-session.service';
import { MemorizationReciteService } from '../../services/memorization-recite.service';
import { MemorizationReciteSettingsService } from '../../services/memorization-recite-settings.service';
import type { MemorizedItem } from '../../types/memorization';
import { MEMORIZATION_FULL_HIDE_ROUND } from '../../lib/memorization/memorizationPracticeUtils';
import { MEMORIZE_LISTEN_REPEAT_GAP_MS } from '../../lib/memorization/memorizeListenSpeedStorage';
import * as scrollRun from '../../lib/memorization-practice-session-scroll-run';

vi.mock('../../lib/memorization/isWhisperReciteSupported', () => ({
  isWhisperReciteSupported: vi.fn(() => true),
}));

const trackMemorizationPracticeSessionStartMock = vi.fn();
const trackMemorizationPracticeCompletedMock = vi.fn();

vi.mock('../../lib/memorization/memorizationPracticeAnalytics', () => ({
  trackMemorizationPracticeSessionStart: (...args: unknown[]) =>
    trackMemorizationPracticeSessionStartMock(...args),
  trackMemorizationPracticeCompleted: (...args: unknown[]) =>
    trackMemorizationPracticeCompletedMock(...args),
}));

const verseItem: MemorizedItem = {
  id: 'v1',
  reference: 'John 3:16',
  text: '',
  translation: 'esv',
  dateAdded: Date.now(),
  lastPracticedAt: null,
  practiceSessions: [],
};

const mockScriptureService = {
  getPassage: vi.fn().mockResolvedValue({
    reference: 'John 3:16',
    text: 'For God so loved the world',
    translation: 'esv',
  }),
  getAudioUrl: vi.fn().mockResolvedValue({
    audioUrl: 'https://audio.test/x.mp3',
    useSpeechSynthesis: false,
  }),
};

const mockReciteService = {
  startRecording: vi.fn().mockResolvedValue(undefined),
  stopRecordingCapture: vi.fn().mockResolvedValue({
    blob: new Blob(['audio'], { type: 'audio/webm' }),
    audioSeconds: 2,
  }),
  transcribeCapturedRecording: vi.fn().mockResolvedValue('For God so loved the world'),
  stopAndTranscribe: vi.fn().mockResolvedValue('For God so loved the world'),
  cancelRecording: vi.fn().mockResolvedValue(undefined),
};

const mockReciteSettingsService = {
  getSettings: vi.fn().mockResolvedValue({ enabled: false }),
  getSettingsFromServer: vi.fn().mockResolvedValue({ enabled: false }),
};

function createMockUserSessionService(
  memorizationStrictMode = false,
  options: { deferSessionLoad?: boolean } = {},
) {
  const session = {
    email: 'test@example.com',
    fullName: 'Test User',
    memorizationStrictMode,
  };
  const deferSessionLoad = options.deferSessionLoad ?? false;
  const subject = new BehaviorSubject(deferSessionLoad ? null : session);
  const initializedSubject = new BehaviorSubject(!deferSessionLoad);
  return {
    getCurrentSession: vi.fn(() => subject.value),
    userSession$: subject.asObservable(),
    sessionInitialized$: initializedSubject.asObservable(),
    isSessionInitialized: vi.fn(() => initializedSubject.value),
    setMemorizationStrictMode(strict: boolean): void {
      subject.next({ ...session, memorizationStrictMode: strict });
      initializedSubject.next(true);
    },
    finishSessionLoad(strict: boolean = memorizationStrictMode): void {
      subject.next({ ...session, memorizationStrictMode: strict });
      initializedSubject.next(true);
    },
  };
}

function makeKeyEvent(key: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as KeyboardEvent;
}

function makePointerEvent(
  type: 'down' | 'up' | 'leave',
  target?: HTMLElement
): PointerEvent {
  const el = target ?? document.createElement('button');
  el.setPointerCapture = vi.fn();
  el.hasPointerCapture = vi.fn().mockReturnValue(true);
  el.releasePointerCapture = vi.fn();
  return {
    pointerId: 1,
    buttons: type === 'leave' ? 0 : 1,
    preventDefault: vi.fn(),
    currentTarget: el,
  } as unknown as PointerEvent;
}

async function renderSession(
  options: {
    item?: MemorizedItem;
    isOpen?: boolean;
    memorizationStrictMode?: boolean;
    deferSessionLoad?: boolean;
    reciteEnabled?: boolean;
    reciteTranscript?: string;
  } = {}
) {
  const closed = vi.fn();
  const completed = vi.fn();
  const persistInProgress = vi.fn();
  const clearInProgress = vi.fn();
  const strictMode = options.memorizationStrictMode ?? false;
  const sessionService = createMockUserSessionService(strictMode, {
    deferSessionLoad: options.deferSessionLoad,
  });

  const reciteSettings = { enabled: options.reciteEnabled ?? false };
  mockReciteSettingsService.getSettings.mockResolvedValue(reciteSettings);
  mockReciteSettingsService.getSettingsFromServer.mockResolvedValue(reciteSettings);
  mockReciteService.transcribeCapturedRecording.mockResolvedValue(
    options.reciteTranscript ?? 'For God so loved the world'
  );

  const result = await render(MemorizationPracticeSessionComponent, {
    componentInputs: {
      item: options.item ?? verseItem,
      isOpen: options.isOpen ?? true,
    },
    providers: [
      { provide: ScriptureService, useValue: mockScriptureService },
      {
        provide: UserSessionService,
        useValue: sessionService,
      },
      { provide: MemorizationReciteService, useValue: mockReciteService },
      { provide: MemorizationReciteSettingsService, useValue: mockReciteSettingsService },
    ],
  });

  const { fixture } = result;
  const component = fixture.componentInstance;
  const cdr = fixture.changeDetectorRef;

  component.closed.subscribe(closed);
  component.completed.subscribe(completed);
  component.persistInProgress.subscribe(persistInProgress);
  component.clearInProgress.subscribe(clearInProgress);

  await fixture.whenStable();
  cdr.detectChanges();

  return { ...result, component, cdr, closed, completed, persistInProgress, clearInProgress, sessionService };
}

function revealAllHiddenViaTyping(component: MemorizationPracticeSessionComponent): void {
  let guard = 0;
  while (component.currentTargetIndex !== null && !component.awaitingRoundAdvance && guard < 200) {
    guard += 1;
    const token = component.tokens[component.currentTargetIndex];
    if (!token || token.kind === 'punct') break;
    const key = token.kind === 'digit' ? token.text : token.text[0]!;
    component.onPracticeInputKeyDown(makeKeyEvent(key));
  }
}

function correctReorderOrder(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

const componentDir = dirname(fileURLToPath(import.meta.url));
const reciteComponentDir = join(componentDir, '../../memorization-recite');

function readComponentResource(url: string): string {
  for (const base of [componentDir, reciteComponentDir]) {
    const path = join(base, url);
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
  }
  throw new Error(`Component resource not found: ${url}`);
}

export function registerPracticeSessionSpecHooks(): void {
  beforeAll(async () => {
    await resolveComponentResources((url) => Promise.resolve(readComponentResource(url)));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockScriptureService.getPassage.mockResolvedValue({
      reference: 'John 3:16',
      text: 'For God so loved the world',
      translation: 'esv',
    });
    mockScriptureService.getAudioUrl.mockResolvedValue({
      audioUrl: 'https://audio.test/x.mp3',
      useSpeechSynthesis: false,
    });
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    HTMLElement.prototype.scrollTo = vi.fn(function (
      this: HTMLElement,
      options?: ScrollToOptions | number
    ) {
      if (typeof options === 'object' && options?.top != null) {
        this.scrollTop = options.top;
      }
    }) as typeof HTMLElement.prototype.scrollTo;

    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    } else {
      vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    }

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        speaking: false,
        paused: false,
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        speak: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}


export {
  trackMemorizationPracticeSessionStartMock,
  trackMemorizationPracticeCompletedMock,
  verseItem,
  mockScriptureService,
  mockReciteService,
  mockReciteSettingsService,
  createMockUserSessionService,
  makeKeyEvent,
  makePointerEvent,
  renderSession,
  revealAllHiddenViaTyping,
  correctReorderOrder,
  readComponentResource,
  componentDir,
};
