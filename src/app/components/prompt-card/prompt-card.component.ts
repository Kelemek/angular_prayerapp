import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BadgeService } from '../../services/badge.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { CardMetaHeaderBandComponent } from '../card-meta-header-band/card-meta-header-band.component';
import { CardActionsOverflowMenuComponent } from '../card-actions-overflow-menu/card-actions-overflow-menu.component';
import { HomeFilterBadgeButtonComponent } from '../home-filter-badge-button/home-filter-badge-button.component';
import type { CardActionsOverflowItem } from '../card-actions-overflow-menu/card-actions-overflow-menu.types';
import { UserSessionService } from '../../services/user-session.service';
import { PrayerEncouragementService } from '../../services/prayer-encouragement.service';
import { PromptService } from '../../services/prompt.service';
import { PrayerItemReminderService } from '../../services/prayer-item-reminder.service';
import { PrayerItemReminderModalComponent } from '../prayer-item-reminder-modal/prayer-item-reminder-modal.component';
import type { PrayerItemReminder } from '../../types/prayer-item-reminder';
import {
  getPromptCardVariantLayout,
  getMetaHeaderBandLayoutClasses,
  type PrayerCardVariant,
} from '../../lib/prayer-card-layout';
import {
  getPromptCardShellClasses,
  prayedForCountLabelForPromptCard,
  promptCardTypeHeaderTextClasses,
  showPromptCardPrayedForBadge,
  showPromptCardReminderButton,
} from '../../lib/prompt-card-display';
import { runPromptCardPrayFor } from '../../lib/prompt-card-pray-for-run';
import {
  persistPrayForModalDoNotShowAgain,
  shouldSkipPrayForExplanationModal,
} from '../../lib/prayer-card-pray-for-modal';
import {
  loadPrayerCardItemReminders,
  remindersForPrayerCard,
} from '../../lib/prayer-card-reminders';
import { getPrayerCardUserEmail } from '../../lib/prayer-card-user-context';
import { PromptCardActionsRowComponent } from './prompt-card-actions-row.component';
import { PromptCardPrayForModalComponent } from './prompt-card-pray-for-modal.component';

export interface PrayerPrompt {
  id: string;
  title: string;
  type: string;
  description: string;
  created_at: string;
  updated_at: string;
  /** Per-user Pray For tally for the current viewer (not shared). */
  prayed_for_count?: number;
}

@Component({
  selector: 'app-prompt-card',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmationDialogComponent,
    CardMetaHeaderBandComponent,
    PrayerItemReminderModalComponent,
    CardActionsOverflowMenuComponent,
    HomeFilterBadgeButtonComponent,
    PromptCardActionsRowComponent,
    PromptCardPrayForModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.contents]': 'variant === "presentation"',
    '[class.block]': 'variant !== "presentation"',
  },
  templateUrl: './prompt-card.component.html',
})
export class PromptCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() variant: PrayerCardVariant = 'home';
  @Input() prompt!: PrayerPrompt;
  @Input() isAdmin = false;
  @Input() isTypeSelected = false;
  /** First visible prompt in the list: stable id for the Prayer Prompts guided tour. */
  @Input() tourPromptAnchors = false;

  @Output() delete = new EventEmitter<string>();
  @Output() onTypeClick = new EventEmitter<string>();
  @Output() prayedForCountChange = new EventEmitter<{
    promptId: string;
    count: number;
  }>();

  readonly userSessionService = inject(UserSessionService);
  readonly prayerEncouragementService = inject(PrayerEncouragementService);
  private readonly promptService = inject(PromptService);
  private readonly prayerItemReminderService = inject(PrayerItemReminderService);
  private readonly cdr = inject(ChangeDetectorRef);

  promptBadge$: Observable<boolean> | null = null;
  canPrayFor$ = of(true);
  showConfirmationDialog = false;
  showPrayForModal = false;
  showReminderModal = false;
  private allPrayerItemReminders: PrayerItemReminder[] = [];
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private promptBadgeSubject$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  constructor(public badgeService: BadgeService) {}

  get variantLayout() {
    return getPromptCardVariantLayout(this.variant);
  }

  get headerInsetClasses(): string {
    return this.variantLayout.headerInsetClasses;
  }

  get metaHeaderTextSmClasses(): string {
    return getMetaHeaderBandLayoutClasses(this.variantLayout.bandSize).textSmClasses;
  }

  get overflowItems(): CardActionsOverflowItem[] {
    const items: CardActionsOverflowItem[] = [];
    if (this.showReminderButton()) {
      const hasReminder = this.hasReminderForPrompt();
      items.push({
        id: 'reminder',
        label: hasReminder ? 'Manage prayer reminders' : 'Add prayer reminder',
        icon: 'bell',
        tone: 'blue',
        filled: hasReminder,
        onSelect: () => this.openReminderModal(),
      });
    }
    if (this.isAdmin) {
      items.push({
        id: 'delete',
        label: 'Delete prompt',
        ariaLabel: 'Delete prayer prompt',
        icon: 'trash',
        tone: 'red',
        onSelect: () => this.handleDelete(),
      });
    }
    return items;
  }

  shellClasses(): string {
    return getPromptCardShellClasses(this.variantLayout);
  }

  ngOnInit(): void {
    this.loadPrayerItemReminders();
    this.initializePromptBadge();
    this.promptBadge$ = this.promptBadgeSubject$.asObservable();
    this.refreshCanPrayFor$();

    this.badgeService
      .getUpdateBadgesChanged$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updatePromptBadge();
      });

    this.storageListener = (event: StorageEvent) => {
      if (event.key === 'read_prompts_data') {
        this.updatePromptBadge();
      }
    };

    window.addEventListener('storage', this.storageListener);
    this.userSessionService.userSession$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadPrayerItemReminders();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prompt']) {
      const previousId = changes['prompt'].previousValue?.id;
      const currentId = changes['prompt'].currentValue?.id;
      if (previousId !== currentId) {
        this.showPrayForModal = false;
      }
      this.refreshCanPrayFor$();
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refreshCanPrayFor$(): void {
    if (!this.prompt?.id) {
      this.canPrayFor$ = of(true);
      return;
    }
    this.canPrayFor$ = this.prayerEncouragementService.getCanPrayFor$(
      this.prompt.id,
      true
    );
  }

  showPrayedForBadge(): boolean {
    return showPromptCardPrayedForBadge(this.prompt.prayed_for_count);
  }

  prayedForCountLabel(): string {
    return prayedForCountLabelForPromptCard(this.prompt.prayed_for_count);
  }

  getTypeHeaderTextClasses(): string {
    return promptCardTypeHeaderTextClasses(this.isTypeSelected);
  }

  onPrayForClick(): void {
    if (shouldSkipPrayForExplanationModal()) {
      void this.confirmPrayFor();
      return;
    }
    this.showPrayForModal = true;
    this.cdr.markForCheck();
  }

  onConfirmPrayForFromModal(doNotShowAgain: boolean): void {
    if (doNotShowAgain) {
      persistPrayForModalDoNotShowAgain();
    }
    this.showPrayForModal = false;
    void this.confirmPrayFor();
    this.cdr.markForCheck();
  }

  onCancelPrayForModal(): void {
    this.showPrayForModal = false;
    this.cdr.markForCheck();
  }

  async confirmPrayFor(): Promise<void> {
    this.showPrayForModal = false;
    const prayedForPrompt = this.prompt;
    const promptId = prayedForPrompt.id;

    const newCount = await runPromptCardPrayFor(
      {
        promptService: this.promptService,
        prayerEncouragementService: this.prayerEncouragementService,
      },
      promptId
    );

    if (newCount === null) {
      this.refreshCanPrayFor$();
      this.cdr.markForCheck();
      return;
    }

    prayedForPrompt.prayed_for_count = newCount;
    if (this.prompt?.id === promptId) {
      this.prompt = { ...this.prompt, prayed_for_count: newCount };
    }
    this.prayedForCountChange.emit({ promptId, count: newCount });
    this.refreshCanPrayFor$();
    this.cdr.markForCheck();
  }

  private initializePromptBadge(): void {
    const isUnread = this.badgeService.isPromptUnread(this.prompt.id);
    this.promptBadgeSubject$.next(isUnread);
  }

  private updatePromptBadge(): void {
    const isUnread = this.badgeService.isPromptUnread(this.prompt.id);
    this.promptBadgeSubject$.next(isUnread);
  }

  handleDelete(): void {
    this.showConfirmationDialog = true;
  }

  onConfirmDelete(): void {
    this.delete.emit(this.prompt.id);
    this.showConfirmationDialog = false;
  }

  onCancelDelete(): void {
    this.showConfirmationDialog = false;
  }

  markPromptAsRead(): void {
    this.badgeService.markPromptAsRead(this.prompt.id);
  }

  private loadPrayerItemReminders(): void {
    if (!this.reminderSessionEmail()) {
      this.allPrayerItemReminders = [];
      this.cdr.markForCheck();
      return;
    }
    void loadPrayerCardItemReminders(this.prayerItemReminderService).then(
      (rows) => {
        this.allPrayerItemReminders = rows;
        this.cdr.markForCheck();
      }
    );
  }

  reminderSessionEmail(): string {
    return getPrayerCardUserEmail(this.userSessionService).trim();
  }

  showReminderButton(): boolean {
    return showPromptCardReminderButton(
      this.reminderSessionEmail(),
      this.prompt?.id
    );
  }

  remindersForThisPrompt(): PrayerItemReminder[] {
    return remindersForPrayerCard(
      this.prayerItemReminderService,
      this.userSessionService,
      this.allPrayerItemReminders,
      this.prompt?.id ?? '',
      false
    );
  }

  hasReminderForPrompt(): boolean {
    return this.remindersForThisPrompt().length > 0;
  }

  openReminderModal(): void {
    this.showReminderModal = true;
    this.loadPrayerItemReminders();
    this.cdr.markForCheck();
  }

  onPromptRemindersChanged(all: PrayerItemReminder[]): void {
    this.allPrayerItemReminders = all;
    this.cdr.markForCheck();
  }
}
