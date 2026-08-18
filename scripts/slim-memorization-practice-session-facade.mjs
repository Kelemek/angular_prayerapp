import fs from 'node:fs';
import path from 'node:path';

const facadePath = path.join(
  process.cwd(),
  'src/app/lib/memorization-practice-session-facade.ts',
);
let content = fs.readFileSync(facadePath, 'utf8');

const noArgMap = {
  onOpen: 'runPracticeSessionOnOpen',
  primeKeyboardFocusForResume: 'runPracticeSessionPrimeKeyboardFocusForResume',
  onCloseCleanup: 'runPracticeSessionOnCloseCleanup',
  recomputeDerivedFromItem: 'runPracticeSessionRecomputeDerivedFromItem',
  handleItemIdChange: 'runPracticeSessionHandleItemIdChange',
  resetToIntro: 'runPracticeSessionResetToIntro',
  hydrateInProgressOnce: 'runPracticeSessionHydrateInProgressOnce',
  handleWrongKeystroke: 'runPracticeSessionHandleWrongKeystroke',
  recordWrongAttempt: 'runPracticeSessionRecordWrongAttempt',
  syncStrictModeFromSession: 'runPracticeSessionSyncStrictModeFromSession',
  refreshStrictModeFromSession: 'runPracticeSessionRefreshStrictModeFromSession',
  attachStrictModeSessionSubscription: 'runPracticeSessionAttachStrictModeSessionSubscription',
  detachStrictModeSessionSubscription: 'runPracticeSessionDetachStrictModeSessionSubscription',
  checkRoundCompletion: 'runPracticeSessionCheckRoundCompletion',
  onRoundComplete: 'runPracticeSessionOnRoundComplete',
  syncMetricRefs: 'runPracticeSessionSyncMetricRefs',
  flashErrorBriefly: 'runPracticeSessionFlashErrorBriefly',
  clearFlashError: 'runPracticeSessionClearFlashError',
  syncFlashErrorView: 'runPracticeSessionSyncFlashErrorView',
  bumpListen: 'runPracticeSessionBumpListenUi',
  stopPassageAudio: 'runPracticeSessionStopPassageAudio',
  clearListenRepeatGapTimer: 'runPracticeSessionClearListenRepeatGapTimer',
  handleTtsListenClick: 'runPracticeSessionHandleTtsListenClick',
  beginTtsUtterance: 'runPracticeSessionBeginTtsUtterance',
  focusPracticeInput: 'runPracticeSessionFocusPracticeInput',
  scheduleKeyboardPracticeFocus: 'runPracticeSessionScheduleKeyboardPracticeFocus',
  restorePracticeInputFocusAfterHint: 'runPracticeSessionRestorePracticeInputFocusAfterHint',
  startHintInterval: 'runPracticeSessionStartHintInterval',
  schedulePracticeEffects: 'runPracticeSessionSchedulePracticeEffects',
  attachViewportListeners: 'runPracticeSessionAttachViewportListeners',
  attachPracticeListeners: 'runPracticeSessionAttachPracticeListeners',
  attachAndroidScrollClamp: 'runPracticeSessionAttachAndroidScrollClamp',
  attachTypeModeCapture: 'runPracticeSessionAttachTypeModeCapture',
  ensureTypeModeCaptureAttached: 'runPracticeSessionEnsureTypeModeCaptureAttached',
  attachHintCapture: 'runPracticeSessionAttachHintCapture',
  ensureHintCaptureAttached: 'runPracticeSessionEnsureHintCaptureAttached',
  attachFirstLetterResizeObserver: 'runPracticeSessionAttachFirstLetterResizeObserver',
  detachAllListeners: 'runPracticeSessionDetachAllListeners',
  clearHintInterval: 'runPracticeSessionClearHintInterval',
  reconcileFinalRoundAfterSessionLoad: 'runPracticeSessionReconcileFinalRoundAfterSessionLoad',
  syncRefs: 'runPracticeSessionSyncMetricRefs',
};

const argMap = [
  ['loadPassageText', 'runPracticeSessionLoadPassageText'],
  ['loadAudioUrl', 'runPracticeSessionLoadAudioUrl'],
  ['startRound', 'runPracticeSessionStartRound'],
  ['revealFirstLetterCueForToken', 'runPracticeSessionRevealFirstLetterCueForToken'],
  ['processKeystroke', 'runPracticeSessionProcessKeystroke'],
  ['applyStrictModeFromSession', 'runPracticeSessionApplyStrictModeFromSession'],
  ['tryAutoRevealAfterWrong', 'runPracticeSessionTryAutoRevealAfterWrong'],
  ['persistPracticeSnapshot', 'runPracticeSessionPersistPracticeSnapshot'],
  ['scheduleScrollToBlank', 'runPracticeSessionScheduleScrollToBlank'],
  ['playStreamingAudio', 'runPracticeSessionPlayStreamingAudio'],
  ['keepPracticeInputOnPointerCapture', 'runPracticeSessionKeepPracticeInputOnPointerCapture'],
  ['resolvePracticeInputEl', 'runPracticeSessionResolvePracticeInputEl'],
  ['isAutoRevealBlocked', 'runPracticeSessionIsAutoRevealBlocked'],
  ['resolveHydratedWrongAttemptsInRound', 'runPracticeSessionResolveHydratedWrongAttemptsInRound'],
  ['mustRepeatDueToErrors', 'runPracticeSessionMustRepeatDueToErrors'],
  ['mustRepeatFinalRound', 'runPracticeSessionMustRepeatFinalRound'],
];

const delegateStart = content.indexOf('\nprivate onOpen(): void {');
const finishPracticeStart = content.indexOf('\n  finishPracticeSession(): void {');
const persistDelegateStart = content.indexOf('\nprivate persistPracticeSnapshot', finishPracticeStart);
const reorderFnStart = content.indexOf('\nfunction reorderChunksEmpty()');

if (delegateStart < 0 || finishPracticeStart < 0 || persistDelegateStart < 0 || reorderFnStart < 0) {
  throw new Error('Could not locate facade delegate section markers');
}

let main =
  content.slice(0, delegateStart) + content.slice(finishPracticeStart, persistDelegateStart);
const tail = content.slice(reorderFnStart);

for (const [method, runFn] of Object.entries(noArgMap)) {
  main = main.replace(new RegExp(`this\\.${method}\\(\\)`, 'g'), `${runFn}(this)`);
}

for (const [method, runFn] of argMap) {
  main = main.replace(new RegExp(`this\\.${method}\\(`, 'g'), `${runFn}(this, `);
}

if (!main.includes('consecutiveWrong = 0;')) {
  main = main.replace(
    'roundCompletedWithErrors = false;',
    'roundCompletedWithErrors = false;\n  consecutiveWrong = 0;\n  pendingBetweenRoundsErrors = 0;\n  /** Set when final round completes with errors before session bootstrap; cleared after reconcile. */\n  deferFinalRoundUntilSessionInit = false;',
  );
}

content = main + '\n}' + tail;

fs.writeFileSync(facadePath, content);
console.log('Slimmed facade:', facadePath);
