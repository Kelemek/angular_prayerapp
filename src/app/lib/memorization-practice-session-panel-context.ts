import type { ReciteAttemptMetrics } from '../memorization-recite/memorization-recite-practice.component';
import type {
  MemorizationPracticeMode,
} from '../types/memorization';
import type { MemorizationStartRoundOption } from './memorization-practice-session-ui';

/** Panel bindings for practice session child components (decoupled from the shell class). */
export interface MemorizationPracticeSessionPanelContext {
  readonly practiceBlueBtnClass: string;
  readonly practiceBlueBtnFillClass: string;
  readonly practiceBlueBtnHintClass: string;
  readonly startRoundOptions: readonly MemorizationStartRoundOption[];
  startRoundChoice: number;
  readonly modePickerTitle: string;
  readonly MEMORIZE_LISTEN_CONTROLS_DIALOG_ID: string;

  handleClose(): void;
  handleStartOver(): void;
  openListenPanel(): void;
  openModePicker(): void;
  closeModePicker(): void;
  beginPracticeWithMode(mode: MemorizationPracticeMode): void;
  repeatRound(): void;
  nextRound(): void;
  finishPracticeSession(): void;
  startReciteRecording(): Promise<void>;
  stopReciteRecording(): Promise<void>;
  openReciteFeedbackHelp(): void;
  closeReciteFeedbackHelp(): void;
  openSettingsForReciteFeedback(): Promise<void>;
  onReciteClearHint(): void;
  onReciteAttemptMetrics(metrics: ReciteAttemptMetrics): void;
  onReciteRepeatRound(): void;
  onReciteNextRound(): void;
  onReciteFinishPractice(): void;
  onReorderSlotChunkIdsChange(ids: number[]): void;
  onReorderInvalidDrop(): void;
  onReorderSlotsBecameCorrect(slots: number[]): void;
  onReorderWrongSwap(): void;
  onVerseTouchStart(event: TouchEvent): void;
  onVerseTouchMove(event: TouchEvent): void;
  onVerseTouchCancel(): void;
  onVerseTouchEnd(): void;
  onHintPointerDown(event: PointerEvent): void;
  onHintPointerUp(event: PointerEvent): void;
  onHintPointerLeave(event: PointerEvent): void;
}
