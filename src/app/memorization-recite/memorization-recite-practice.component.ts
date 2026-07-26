import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemorizationReciteService } from '../services/memorization-recite.service';
import { MemorizationReciteSettingsService } from '../services/memorization-recite-settings.service';
import { UserSessionService } from '../services/user-session.service';
import {
  alignRecitation,
  buildReciteDisplaySegments,
  formatReciteSkippedLabels,
  reciteScorePercent,
  type ReciteAlignmentResult,
  type ReciteAlignmentSummary,
  type ReciteDisplaySegment,
} from '../lib/memorization/memorizationReciteAlignment';
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  formatMemorizationReciteWhisperPrompt,
  hiddenFractionForRound,
  type MemorizationToken,
} from '../lib/memorization/memorizationPracticeUtils';
import type { BibleTranslation } from '../types/memorization';
import { computeReciteModeAvailable } from './integration';

export type RecitePhase = 'ready' | 'recording' | 'stopping' | 'transcribing' | 'results';

export type ReciteAttemptMetrics = {
  wrong: number;
  correct: number;
  hadErrors: boolean;
};

@Component({
  selector: 'app-memorization-recite-practice',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memorization-recite-practice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemorizationRecitePracticeComponent {
  private readonly reciteService = inject(MemorizationReciteService);
  private readonly reciteSettingsService = inject(MemorizationReciteSettingsService);
  private readonly userSessionService = inject(UserSessionService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly MEMORIZATION_FULL_HIDE_ROUND = MEMORIZATION_FULL_HIDE_ROUND;
  readonly hiddenFractionForRound = hiddenFractionForRound;
  readonly Math = Math;

  @Input() active = false;
  @Input({ required: true }) tokens!: MemorizationToken[];
  @Input({ required: true }) typableIndices!: number[];
  @Input({ required: true }) reference!: string;
  @Input({ required: true }) translation!: BibleTranslation;
  @Input({ required: true }) itemId!: string;
  @Input({ required: true }) roundIndex!: number;
  @Input() awaitingRoundAdvance = false;
  @Input() roundAdvanceHeaderCopy = '';
  @Input() isBibleBooks = false;
  @Input() wrongAttemptsInRound = 0;
  @Input() roundCompletedWithErrors = false;
  @Input() strictModeEnabled = false;
  @Input() isFinalRound = false;
  @Input() parentShowNextRoundOption = false;
  @Input({ required: true }) hiddenIndices!: Set<number>;
  @Input({ required: true }) revealed!: Set<number>;
  @Input({ required: true }) hintPeekIndices!: Set<number>;

  @Output() clearHint = new EventEmitter<void>();
  @Output() attemptMetrics = new EventEmitter<ReciteAttemptMetrics>();
  @Output() repeatRound = new EventEmitter<void>();
  @Output() nextRound = new EventEmitter<void>();
  @Output() finishPractice = new EventEmitter<void>();

  phase: RecitePhase = 'ready';
  error = '';
  recordingMs = 0;
  transcript = '';
  alignment: ReciteAlignmentSummary | null = null;
  settingsLoaded = false;
  enabled = false;
  starting = false;

  private attemptMetricsApplied = false;
  private alignmentByToken = new Map<number, ReciteAlignmentResult>();
  private stopGeneration = 0;
  private startGeneration = 0;
  private inFlightStop: Promise<void> | null = null;

  get displayPracticeErrors(): number {
    if (this.phase === 'results') {
      return this.effectiveRoundErrors;
    }
    return this.wrongAttemptsInRound;
  }

  get effectiveRoundErrors(): number {
    if (this.attemptMetricsApplied) {
      return this.wrongAttemptsInRound;
    }
    return this.wrongAttemptsInRound + this.pendingAttemptErrors;
  }

  get pendingAttemptErrors(): number {
    if (!this.alignment) return 0;
    return this.alignment.wrongCount + this.alignment.missingCount;
  }

  get modeAvailable(): boolean {
    return computeReciteModeAvailable({
      settingsLoaded: this.settingsLoaded,
      enabled: this.enabled,
      isBibleBooks: this.isBibleBooks,
      reference: this.reference,
    });
  }

  get scoreSummary(): string {
    if (!this.alignment) return '';
    const pct = reciteScorePercent(this.alignment);
    const base = `${this.alignment.correctCount} of ${this.alignment.totalTypable} words correct (${pct}%)`;
    const skippedLabels = formatReciteSkippedLabels(this.tokens, this.alignment.results);
    if (skippedLabels.length > 0) {
      return `${base} · ${skippedLabels.length} skipped`;
    }
    return base;
  }

  get skippedWordsLabel(): string | null {
    if (!this.alignment) return null;
    const labels = formatReciteSkippedLabels(this.tokens, this.alignment.results);
    if (labels.length === 0) return null;
    return labels.join(', ');
  }

  get alignedColumns() {
    return this.alignment?.alignedColumns ?? [];
  }

  get displaySegments(): ReciteDisplaySegment[] {
    return buildReciteDisplaySegments(this.tokens);
  }

  get showNextRoundOption(): boolean {
    if (this.phase !== 'results') return false;
    if (this.isFinalRound) return false;
    const hasErrors = this.roundCompletedWithErrors || this.pendingAttemptErrors > 0;
    if (!hasErrors) return true;
    const errors = this.effectiveRoundErrors;
    if (errors <= 0) return true;
    if (!this.userSessionService.isSessionInitialized()) return false;
    return !this.strictModeEnabled;
  }

  get showFinishOption(): boolean {
    if (this.phase !== 'results') return false;
    if (!this.isFinalRound) return false;
    const errors = this.effectiveRoundErrors;
    if (errors <= 0) return true;
    if (!this.userSessionService.isSessionInitialized()) return false;
    return !this.strictModeEnabled;
  }

  async refreshSettings(): Promise<void> {
    const settings = await this.reciteSettingsService.getSettingsFromServer();
    this.ngZone.run(() => {
      this.enabled = settings.enabled;
      this.settingsLoaded = true;
      this.cdr.markForCheck();
    });
  }

  resetAttemptState(): void {
    this.invalidateStop();
    this.phase = 'ready';
    this.error = '';
    this.transcript = '';
    this.alignment = null;
    this.alignmentByToken = new Map();
    this.recordingMs = 0;
    this.attemptMetricsApplied = false;
    this.cdr.markForCheck();
  }

  async prepareClose(): Promise<void> {
    if (
      this.phase === 'recording' ||
      this.phase === 'stopping' ||
      this.phase === 'transcribing'
    ) {
      this.invalidateStop();
      await this.reciteService.cancelRecording();
      this.phase = 'ready';
      this.cdr.markForCheck();
      return;
    }
    if (this.phase === 'results') {
      this.applyAttemptMetrics();
    }
  }

  destroy(): void {
    this.invalidateStop();
    void this.reciteService.cancelRecording();
    this.phase = 'ready';
    this.transcript = '';
    this.alignment = null;
    this.alignmentByToken = new Map();
    this.cdr.markForCheck();
  }

  cancel(): void {
    this.invalidateStop();
    void this.reciteService.cancelRecording();
  }

  async startRecording(): Promise<void> {
    if (this.starting || this.phase === 'recording' || this.phase === 'stopping' || !this.active) return;

    const startGeneration = ++this.startGeneration;
    this.error = '';
    this.starting = true;
    this.clearHint.emit();
    this.cdr.markForCheck();

    try {
      await this.refreshSettings();
      if (!this.isStartCurrent(startGeneration)) {
        await this.reciteService.cancelRecording();
        return;
      }
      if (!this.enabled || !this.modeAvailable) {
        this.error = 'Recite mode is not available.';
        return;
      }

      await this.reciteService.startRecording({
        onDurationMs: (ms) => {
          this.recordingMs = ms;
          this.cdr.markForCheck();
        },
        onMaxDurationReached: () => {
          if (this.phase === 'recording') {
            void this.stopRecording();
          }
        },
      });
      if (!this.isStartCurrent(startGeneration)) {
        await this.reciteService.cancelRecording();
        return;
      }
      this.phase = 'recording';
      this.recordingMs = 0;
    } catch (err) {
      if (!this.isStartCurrent(startGeneration)) {
        await this.reciteService.cancelRecording();
        return;
      }
      this.phase = 'ready';
      this.error = err instanceof Error ? err.message : 'Could not start recording.';
    } finally {
      if (startGeneration === this.startGeneration) {
        this.starting = false;
      }
      this.cdr.markForCheck();
    }
  }

  async stopRecording(): Promise<void> {
    if (this.inFlightStop) {
      await this.inFlightStop;
      return;
    }
    if (this.phase !== 'recording') return;

    this.phase = 'stopping';
    this.cdr.markForCheck();

    const stopRun = this.runStop();
    this.inFlightStop = stopRun;
    try {
      await stopRun;
    } finally {
      if (this.inFlightStop === stopRun) {
        this.inFlightStop = null;
      }
    }
  }

  retry(): void {
    if (this.phase !== 'results') return;
    this.repeatRound.emit();
  }

  advanceNextRound(): void {
    if (this.phase !== 'results') return;
    this.applyAttemptMetrics();
    this.nextRound.emit();
    this.cdr.markForCheck();
  }

  advanceFinish(): void {
    if (this.phase !== 'results') return;
    this.applyAttemptMetrics();
    this.finishPractice.emit();
    this.cdr.markForCheck();
  }

  formatReciteDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  segmentHasHiddenBlank(segment: ReciteDisplaySegment): boolean {
    if (segment.kind === 'punct') return false;
    if (segment.kind === 'digits') {
      return segment.text
        .split('')
        .some((_, charIndex) => this.digitCharShowsBlank(segment, charIndex));
    }
    return segment.tokenIndices.some((i) => this.tokenShowsBlank(i));
  }

  digitCharShowsBlank(segment: ReciteDisplaySegment, charIndex: number): boolean {
    const tokenIndex = segment.tokenIndices[charIndex]!;
    if (this.showViaHint(tokenIndex)) return false;
    return this.tokenShowsBlank(tokenIndex);
  }

  digitCharShowsText(segment: ReciteDisplaySegment, charIndex: number): boolean {
    return !this.digitCharShowsBlank(segment, charIndex);
  }

  digitCharShowHint(segment: ReciteDisplaySegment, charIndex: number): boolean {
    return this.showViaHint(segment.tokenIndices[charIndex]!);
  }

  segmentFullyBlank(segment: ReciteDisplaySegment): boolean {
    if (segment.kind === 'punct') return false;
    return segment.tokenIndices.every((i) => this.tokenShowsBlank(i));
  }

  segmentShowsText(segment: ReciteDisplaySegment): boolean {
    if (segment.kind === 'punct') return true;
    return segment.tokenIndices.some((i) => this.tokenShowsText(i));
  }

  segmentShowHint(segment: ReciteDisplaySegment): boolean {
    if (segment.kind === 'punct') return false;
    return segment.tokenIndices.some((i) => this.showViaHint(i));
  }

  segmentDisplayText(segment: ReciteDisplaySegment): string {
    if (segment.kind === 'punct') return segment.text;
    if (this.segmentFullyBlank(segment)) {
      return segment.text;
    }
    return this.tokenDisplayText(segment.tokenIndices[0]!);
  }

  private async runStop(): Promise<void> {
    const stopGeneration = this.stopGeneration;
    this.error = '';
    this.cdr.markForCheck();
    try {
      const alignmentReference = this.isBibleBooks ? '' : this.reference;
      const prompt = formatMemorizationReciteWhisperPrompt(
        this.tokens,
        alignmentReference,
        this.translation
      );
      const captured = await this.reciteService.stopRecordingCapture();
      if (!this.isStopCurrent(stopGeneration)) return;

      this.phase = 'transcribing';
      this.cdr.markForCheck();

      const transcript = await this.reciteService.transcribeCapturedRecording({
        memorizedItemId: this.itemId,
        prompt,
        blob: captured.blob,
        audioSeconds: captured.audioSeconds,
      });
      if (!this.isStopCurrent(stopGeneration)) return;

      this.transcript = transcript;

      this.alignment = alignRecitation(
        this.tokens,
        this.typableIndices,
        transcript,
        alignmentReference
      );
      this.alignmentByToken = new Map(
        this.alignment.results.map((r) => [r.tokenIndex, r])
      );
      this.phase = 'results';
    } catch (err) {
      if (!this.isStopCurrent(stopGeneration)) return;
      await this.reciteService.cancelRecording();
      this.phase = 'ready';
      this.error = err instanceof Error ? err.message : 'Could not check recitation.';
    }
    this.cdr.markForCheck();
  }

  applyAttemptMetrics(): void {
    if (!this.alignment || this.attemptMetricsApplied) return;
    this.attemptMetricsApplied = true;
    const wrong = this.alignment.wrongCount + this.alignment.missingCount;
    this.attemptMetrics.emit({
      wrong,
      correct: this.alignment.correctCount,
      hadErrors: wrong > 0,
    });
  }

  private invalidateStop(): void {
    this.stopGeneration += 1;
    this.startGeneration += 1;
    this.starting = false;
  }

  private isStartCurrent(startGeneration: number): boolean {
    return startGeneration === this.startGeneration && this.active;
  }

  private isStopCurrent(stopGeneration: number): boolean {
    return (
      stopGeneration === this.stopGeneration &&
      (this.phase === 'stopping' || this.phase === 'transcribing')
    );
  }

  private isTokenHidden(i: number): boolean {
    return this.hiddenIndices.has(i);
  }

  private isTokenRevealed(i: number): boolean {
    return this.revealed.has(i);
  }

  private showViaHint(i: number): boolean {
    return this.hintPeekIndices.has(i);
  }

  private tokenStatus(i: number): ReciteAlignmentResult['status'] | null {
    return this.alignmentByToken.get(i)?.status ?? null;
  }

  private tokenSpokenText(i: number): string | null {
    if (this.phase !== 'results') return null;
    return this.alignmentByToken.get(i)?.spokenText ?? null;
  }

  private resultsShowsBlank(i: number): boolean {
    return this.phase === 'results' && this.tokenStatus(i) === 'missing';
  }

  private tokenDisplayText(i: number): string {
    const token = this.tokens[i];
    if (!token) return '';
    if (token.kind === 'punct') return token.text;
    if (this.phase === 'results') {
      return this.tokenSpokenText(i) ?? token.text;
    }
    return token.text;
  }

  private tokenShowsBlank(i: number): boolean {
    const token = this.tokens[i];
    if (!token || token.kind === 'punct') return false;
    if (this.resultsShowsBlank(i)) return true;
    if (this.phase === 'results') return false;
    if (this.showViaHint(i)) return false;
    return this.isTokenHidden(i) && !this.isTokenRevealed(i);
  }

  private tokenShowsText(i: number): boolean {
    const token = this.tokens[i];
    if (!token || token.kind === 'punct') return true;
    if (this.phase === 'results') {
      return !this.resultsShowsBlank(i);
    }
    return !this.isTokenHidden(i) || this.isTokenRevealed(i) || this.showViaHint(i);
  }
}
