import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const facadePath = path.join(root, 'src/app/lib/memorization-practice-session-facade.ts');
const basePath = path.join(root, 'src/app/lib/memorization-practice-session-facade-base.ts');

const content = fs.readFileSync(facadePath, 'utf8');
const lines = content.split('\n');

const phaseIdx = lines.findIndex((l) => l.startsWith('type Phase'));
const ngOnChangesIdx = lines.findIndex((l) => l.includes('ngOnChanges(changes'));
const reorderFnIdx = lines.findIndex((l) => l.startsWith('function reorderChunksEmpty'));

if (phaseIdx < 0 || ngOnChangesIdx < 0 || reorderFnIdx < 0) {
  throw new Error('Could not find split markers in facade');
}

const baseImports = `import { ChangeDetectorRef, ElementRef, EventEmitter, NgZone, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subscription } from 'rxjs';
import { ScriptureService } from '../services/scripture.service';
import { UserSessionService } from '../services/user-session.service';
// @removal-recite
import { MemorizationReciteSettingsService } from '../services/memorization-recite-settings.service';
import { MemorizationRecitePracticeComponent } from '../memorization-recite/memorization-recite-practice.component';
import {
  computeReciteModeAvailable,
  computeReciteModeVisible,
  isRecitePracticeMode,
} from '../memorization-recite/integration';
import type { PracticeSessionResult } from '../services/memorization.service';
import {
  type MemorizationInProgressSavePayload,
  type MemorizationPracticeMode,
  type MemorizedItem,
} from '../types/memorization';
import { isKeyboardPracticeMode } from './memorization/memorizationKeyboardPractice';
import { MemorizeListenSpeed } from './memorization/memorizeListenSpeedStorage';
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  buildMemorizationChoiceLabels,
  buildMemorizationReorderChunks,
  cueGlyphForTypableToken,
  formatMemorizationTokensPlain,
  hiddenFractionForRound,
  pickHiddenCueTypableSlotIndices,
  reorderMovableCountForRound,
  seedRandom,
  stringToSeed,
  type MemorizationToken,
} from './memorization/memorizationPracticeUtils';
import {
  MEMORIZATION_WORD_CHOICE_COUNT_DIGIT,
  MEMORIZATION_WORD_CHOICE_COUNT_WORD,
  MEMORIZE_INTRO_START_ROUND_OPTIONS,
  MEMORIZE_LISTEN_CONTROLS_DIALOG_ID,
  MEMORIZE_LISTEN_CONTROLS_TITLE_ID,
  MEMORIZE_PRACTICE_BLUE_BTN_CLASS,
  MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS,
  MEMORIZE_PRACTICE_BLUE_BTN_HINT_CLASS,
} from './memorization-practice-session-ui';
import type { MemorizationPracticeSessionHeaderComponent } from '../components/memorization-practice-session/memorization-practice-session-header.component';
import type { MemorizationPracticeSessionPracticingComponent } from '../components/memorization-practice-session/memorization-practice-session-practicing.component';

function reorderChunksEmpty() {
  return [] as ReturnType<typeof buildMemorizationReorderChunks>;
}

`;

let baseBody = lines.slice(phaseIdx, ngOnChangesIdx).join('\n');
baseBody = baseBody.replace(
  'export class MemorizationPracticeSessionFacade',
  'export abstract class MemorizationPracticeSessionFacadeBase',
);
baseBody = baseBody.replace(
  '    return !runPracticeSessionMustRepeatDueToErrors(this);',
  '    if (this.wrongAttemptsInRound <= 0) return true;\n    if (!this.userSessionService.isSessionInitialized()) return false;\n    return !this.strictModeEnabled;',
);

fs.writeFileSync(basePath, baseImports + baseBody + '\n');

const methodBody = lines.slice(ngOnChangesIdx, reorderFnIdx).join('\n');
const reorderFn = lines.slice(reorderFnIdx).join('\n');

const facadeImports = `import {
  AfterViewInit,
  Injectable,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
// @removal-recite
import {
  MEMORIZATION_RECITE_PRACTICE_MODE,
  RECITE_VERSE_LIMIT_MESSAGE,
  isRecitePracticeMode,
} from '../memorization-recite/integration';
import { type ReciteAttemptMetrics } from '../memorization-recite/memorization-recite-practice.component';
import type { PracticeSessionResult } from '../services/memorization.service';
import {
  type MemorizationInProgressSavePayload,
  type MemorizationPracticeMode,
} from '../types/memorization';
import { pickRandomAllDoneMessage } from './memorization/memorizationEncouragementMessages';
import {
  trackMemorizationPracticeCompleted,
  trackMemorizationPracticeSessionStart,
} from './memorization/memorizationPracticeAnalytics';
import {
  MemorizeListenSpeed,
} from './memorization/memorizeListenSpeedStorage';
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  generateMemorizationSessionSeed,
} from './memorization/memorizationPracticeUtils';
import {
  runPracticeSessionBumpListenUi,
  runPracticeSessionStopPassageAudio,
  runPracticeSessionClearListenRepeatGapTimer,
  runPracticeSessionPlayStreamingAudio,
  runPracticeSessionHandleTtsListenClick,
  runPracticeSessionBeginTtsUtterance,
  runPracticeSessionPassageAudioPlay,
  runPracticeSessionPassageAudioPause,
  runPracticeSessionPassageAudioEnded,
  runPracticeSessionPassageAudioError,
  runPracticeSessionOpenListenPanel,
  runPracticeSessionCloseListenPanel,
  runPracticeSessionSelectListenSpeed,
  runPracticeSessionHandleListenPassageClick,
  runPracticeSessionHandleRepeatListenToggle,
} from './memorization-practice-session-listen-run';
import {
  runPracticeSessionResolvePracticeInputEl,
  runPracticeSessionFocusPracticeInput,
  runPracticeSessionScheduleKeyboardPracticeFocus,
  runPracticeSessionRestorePracticeInputFocusAfterHint,
  runPracticeSessionStartHintInterval,
  runPracticeSessionSchedulePracticeEffects,
  runPracticeSessionScheduleScrollToBlank,
  runPracticeSessionScrollCurrentBlankIntoView,
  runPracticeSessionScrollActiveFirstLetterCueIntoView,
  runPracticeSessionAttachViewportListeners,
  runPracticeSessionAttachPracticeListeners,
  runPracticeSessionAttachAndroidScrollClamp,
  runPracticeSessionAttachTypeModeCapture,
  runPracticeSessionEnsureTypeModeCaptureAttached,
  runPracticeSessionAttachHintCapture,
  runPracticeSessionEnsureHintCaptureAttached,
  runPracticeSessionKeepPracticeInputOnPointerCapture,
  runPracticeSessionAttachFirstLetterResizeObserver,
  runPracticeSessionDetachAllListeners,
  runPracticeSessionClearHintInterval,
} from './memorization-practice-session-scroll-run';
import {
  runPracticeSessionOnOpen,
  runPracticeSessionPrimeKeyboardFocusForResume,
  runPracticeSessionOnCloseCleanup,
  runPracticeSessionRecomputeDerivedFromItem,
  runPracticeSessionLoadPassageText,
  runPracticeSessionLoadAudioUrl,
  runPracticeSessionHandleItemIdChange,
  runPracticeSessionResetToIntro,
  runPracticeSessionHydrateInProgressOnce,
  runPracticeSessionBeginRecitePractice,
  runPracticeSessionFetchReciteSettings,
} from './memorization-practice-session-passage-run';
import {
  runPracticeSessionStartRound,
  runPracticeSessionRevealFirstLetterCueForToken,
  runPracticeSessionProcessKeystroke,
  runPracticeSessionHandleWrongKeystroke,
  runPracticeSessionRecordWrongAttempt,
  runPracticeSessionSyncStrictModeFromSession,
  runPracticeSessionRefreshStrictModeFromSession,
  runPracticeSessionAttachStrictModeSessionSubscription,
  runPracticeSessionDetachStrictModeSessionSubscription,
  runPracticeSessionApplyStrictModeFromSession,
  runPracticeSessionIsAutoRevealBlocked,
  runPracticeSessionResolveHydratedWrongAttemptsInRound,
  runPracticeSessionMustRepeatDueToErrors,
  runPracticeSessionMustRepeatFinalRound,
  runPracticeSessionReconcileFinalRoundAfterSessionLoad,
  runPracticeSessionTryAutoRevealAfterWrong,
  runPracticeSessionCheckRoundCompletion,
  runPracticeSessionOnRoundComplete,
  runPracticeSessionPersistPracticeSnapshot,
  runPracticeSessionSyncMetricRefs,
  runPracticeSessionFlashErrorBriefly,
  runPracticeSessionClearFlashError,
  runPracticeSessionSyncFlashErrorView,
  runPracticeSessionProcessWordGuess,
  runPracticeSessionOnPracticeInputKeyDown,
  runPracticeSessionOnPracticeInput,
} from './memorization-practice-session-round-run';
import { MemorizationPracticeSessionFacadeBase } from './memorization-practice-session-facade-base';

export type { PracticeSessionResult };

@Injectable()
export class MemorizationPracticeSessionFacade
  extends MemorizationPracticeSessionFacadeBase
  implements AfterViewInit, OnChanges, OnDestroy
{
`;

// Strip unused imports from methodBody replacements - script adds run functions we'll add manually
let methods = methodBody
  .replace(
    /private beginRecitePractice\(\): void \{[\s\S]*?this\.cdr\.markForCheck\(\);\s*\}/,
    '',
  )
  .replace(
    /private async fetchReciteSettings\(\): Promise<void> \{[\s\S]*?this\.cdr\.markForCheck\(\);\s*\}\);?\s*\}/,
    '',
  )
  .replace(
    /processWordGuess\(label: string\): void \{[\s\S]*?this\.cdr\.markForCheck\(\);\s*\}/,
    'processWordGuess(label: string): void {\n    runPracticeSessionProcessWordGuess(this, label);\n  }',
  )
  .replace(
    /onPracticeInputKeyDown\(event: KeyboardEvent\): void \{[\s\S]*?}, 0\);\s*\}/,
    'onPracticeInputKeyDown(event: KeyboardEvent): void {\n    runPracticeSessionOnPracticeInputKeyDown(this, event);\n  }',
  )
  .replace(
    /onPracticeInput\(event: Event\): void \{[\s\S]*?runPracticeSessionProcessKeystroke\(this, last\);\s*\}/,
    'onPracticeInput(event: Event): void {\n    runPracticeSessionOnPracticeInput(this, event);\n  }',
  )
  .replace('this.beginRecitePractice();', 'runPracticeSessionBeginRecitePractice(this);')
  .replace('await this.fetchReciteSettings();', 'await runPracticeSessionFetchReciteSettings(this);')
  .replace('void this.fetchReciteSettings();', 'void runPracticeSessionFetchReciteSettings(this);');

fs.writeFileSync(facadePath, facadeImports + methods + '\n}\n');

console.log('Split facade -> base + facade');
console.log('Base lines:', fs.readFileSync(basePath, 'utf8').split('\n').length);
console.log('Facade lines:', fs.readFileSync(facadePath, 'utf8').split('\n').length);
