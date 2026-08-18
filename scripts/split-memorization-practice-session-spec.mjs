import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/app/components/memorization-practice-session');
const sourcePath = join(dir, 'memorization-practice-session.component.spec.ts');
const lines = readFileSync(sourcePath, 'utf-8').split('\n');

const setupHeader = lines.slice(0, 209).join('\n');

const hooks = `
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
`;

const setupExports = `
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
};
`;

writeFileSync(
  join(dir, 'memorization-practice-session.spec-setup.ts'),
  `${setupHeader}\n${hooks}\n${setupExports}`,
);

function makeSpecFile(name, startLine, endLine, extraImports = '') {
  const body = lines.slice(startLine - 1, endLine).join('\n');
  const content = `import { describe } from 'vitest';
${extraImports}
import {
  registerPracticeSessionSpecHooks,
  renderSession,
  revealAllHiddenViaTyping,
  correctReorderOrder,
  makeKeyEvent,
  makePointerEvent,
  verseItem,
  mockScriptureService,
  mockReciteService,
  mockReciteSettingsService,
  trackMemorizationPracticeSessionStartMock,
  trackMemorizationPracticeCompletedMock,
} from './memorization-practice-session.spec-setup';

registerPracticeSessionSpecHooks();

describe('MemorizationPracticeSessionComponent', () => {
${body}
});
`;
  writeFileSync(join(dir, name), content);
}

makeSpecFile('memorization-practice-session.core.spec.ts', 265, 801);
makeSpecFile(
  'memorization-practice-session.hydrate-strict.spec.ts',
  802,
  1451,
  `import { it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { ElementRef, SimpleChange } from '@angular/core';
import { MemorizationPracticeSessionHeaderComponent } from './memorization-practice-session-header.component';
import { MEMORIZATION_FULL_HIDE_ROUND } from '../../lib/memorization/memorizationPracticeUtils';
import * as scrollRun from '../../lib/memorization-practice-session-scroll-run';`,
);
makeSpecFile(
  'memorization-practice-session.coverage.spec.ts',
  1452,
  2105,
  `import { it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { ElementRef, SimpleChange } from '@angular/core';
import { MemorizationPracticeSessionHeaderComponent } from './memorization-practice-session-header.component';
import { MEMORIZATION_FULL_HIDE_ROUND } from '../../lib/memorization/memorizationPracticeUtils';
import { MEMORIZE_LISTEN_REPEAT_GAP_MS } from '../../lib/memorization/memorizeListenSpeedStorage';`,
);
makeSpecFile(
  'memorization-practice-session.recite.spec.ts',
  2106,
  2282,
  `import { it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';`,
);

unlinkSync(sourcePath);
console.log('Split memorization-practice-session.component.spec.ts into setup + 4 spec files');
