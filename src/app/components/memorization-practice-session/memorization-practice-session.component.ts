import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MemorizationInProgressSavePayload, MemorizedItem } from '../../types/memorization';
import type { PracticeSessionResult } from '../../services/memorization.service';
import { MemorizationPracticeSessionFacade } from '../../lib/memorization-practice-session-facade';
import { MemorizationWordChoicesFooterComponent } from '../memorization-word-choices-footer/memorization-word-choices-footer.component';
import { MemorizeListenControlsDialogComponent } from '../memorize-listen-controls-dialog/memorize-listen-controls-dialog.component';
import { ScriptureAttributionComponent } from '../scripture-attribution/scripture-attribution.component';
import { MemorizationPracticeSessionGateComponent } from './memorization-practice-session-gate.component';
import { MemorizationPracticeSessionIntroComponent } from './memorization-practice-session-intro.component';
import { MemorizationPracticeSessionIntroFooterComponent } from './memorization-practice-session-intro-footer.component';
import { MemorizationPracticeSessionModePickerComponent } from './memorization-practice-session-mode-picker.component';
import { MemorizationPracticeSessionReciteFeedbackComponent } from './memorization-practice-session-recite-feedback.component';
import { MemorizationPracticeSessionHeaderComponent } from './memorization-practice-session-header.component';
import { MemorizationPracticeSessionPracticingComponent } from './memorization-practice-session-practicing.component';
import { MemorizationPracticeSessionDoneComponent } from './memorization-practice-session-done.component';
import { MemorizationPracticeSessionReciteFooterComponent } from './memorization-practice-session-recite-footer.component';
import { MemorizationPracticeSessionRoundAdvanceFooterComponent } from './memorization-practice-session-round-advance-footer.component';

export type { PracticeSessionResult };

@Component({
  selector: 'app-memorization-practice-session',
  standalone: true,
  imports: [
    CommonModule,
    MemorizationWordChoicesFooterComponent,
    MemorizeListenControlsDialogComponent,
    ScriptureAttributionComponent,
    MemorizationPracticeSessionGateComponent,
    MemorizationPracticeSessionIntroComponent,
    MemorizationPracticeSessionIntroFooterComponent,
    MemorizationPracticeSessionModePickerComponent,
    MemorizationPracticeSessionReciteFeedbackComponent,
    MemorizationPracticeSessionHeaderComponent,
    MemorizationPracticeSessionPracticingComponent,
    MemorizationPracticeSessionDoneComponent,
    MemorizationPracticeSessionReciteFooterComponent,
    MemorizationPracticeSessionRoundAdvanceFooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session.component.html',
  styleUrl: './memorization-practice-session.component.css',
})
export class MemorizationPracticeSessionComponent
  extends MemorizationPracticeSessionFacade
  implements OnChanges, OnDestroy, AfterViewInit
{
  @Input({ required: true }) override item!: MemorizedItem;
  @Input() override isOpen = false;
  @Output() override closed = new EventEmitter<void>();
  @Output() override completed = new EventEmitter<PracticeSessionResult>();
  @Output() override persistInProgress = new EventEmitter<MemorizationInProgressSavePayload>();
  @Output() override clearInProgress = new EventEmitter<void>();
  @Output() override openSettings = new EventEmitter<void>();

  @ViewChild(MemorizationPracticeSessionHeaderComponent)
  override headerPanelRef?: MemorizationPracticeSessionHeaderComponent;
  @ViewChild(MemorizationPracticeSessionPracticingComponent)
  override practicingPanelRef?: MemorizationPracticeSessionPracticingComponent;
  @ViewChild('practiceScroll') override practiceScrollRef?: ElementRef<HTMLDivElement>;
  @ViewChild('practiceInput') override practiceInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('passageAudio') override passageAudioRef?: ElementRef<HTMLAudioElement>;

  @HostListener('window:keydown', ['$event'])
  onEscapeKeydown(event: KeyboardEvent): void {
    this.onWindowKeydown(event);
  }
}
