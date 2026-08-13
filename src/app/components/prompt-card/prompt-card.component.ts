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
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BadgeService } from '../../services/badge.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { CardMetaHeaderBandComponent } from '../card-meta-header-band/card-meta-header-band.component';
import { UserSessionService } from '../../services/user-session.service';
import { PrayerEncouragementService } from '../../services/prayer-encouragement.service';
import { PromptService } from '../../services/prompt.service';
import { PrayerItemReminderService } from '../../services/prayer-item-reminder.service';
import { PrayerItemReminderModalComponent } from '../prayer-item-reminder-modal/prayer-item-reminder-modal.component';
import { PrayerItemReminderBellButtonComponent } from '../prayer-item-reminder-bell-button/prayer-item-reminder-bell-button.component';
import type { PrayerItemReminder } from '../../types/prayer-item-reminder';
import {
  getPromptCardVariantLayout,
  getMetaHeaderBandLayoutClasses,
  type PrayerCardVariant,
} from '../../lib/prayer-card-layout';

const PRAY_FOR_MODAL_DO_NOT_SHOW_KEY = 'prayer_encouragement_modal_do_not_show';

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
  imports: [CommonModule, FormsModule, ConfirmationDialogComponent, CardMetaHeaderBandComponent, PrayerItemReminderModalComponent, PrayerItemReminderBellButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.contents]': 'variant === "presentation"',
    '[class.block]': 'variant !== "presentation"',
  },
  template: `
    <div [class]="variantLayout.usePresentationWrapper ? variantLayout.presentationScrollClasses : 'contents'">
    <div
      [class]="shellClasses()"
      [attr.id]="variant === 'home' ? 'prompt-card-' + prompt.id : null"
    >
      <!-- Meta header: type (left) | delete (right) -->
      <app-card-meta-header-band
        layout="two-column"
        [bandSize]="variantLayout.bandSize"
        [bleedClasses]="variantLayout.headerBleedClasses"
        [actionsInsetClasses]="variantLayout.headerInsetClasses"
      >
        <div cardMetaLeft class="w-full min-w-0">
          @if (variantLayout.typeHeaderInteractive) {
          <button
            type="button"
            (click)="onTypeClick.emit(prompt.type)"
            [class]="'flex items-center min-w-0 max-w-full truncate text-left font-bold transition-colors cursor-pointer ' + headerInsetClasses + ' ' + metaHeaderTextSmClasses + ' ' + getTypeHeaderTextClasses()"
            [title]="isTypeSelected ? 'Remove ' + prompt.type + ' filter' : 'Filter by ' + prompt.type"
          >
            {{ prompt.type }}
          </button>
          } @else {
          <span
            [class]="'flex items-center min-w-0 max-w-full truncate text-left font-bold ' + headerInsetClasses + ' ' + metaHeaderTextSmClasses + ' ' + variantLayout.typeHeaderClasses"
          >
            {{ prompt.type }}
          </span>
          }
        </div>
        <div cardMetaRight [class]="'flex items-center ' + metaActionsGapClasses">
          @if (showReminderButton()) {
          <app-prayer-item-reminder-bell-button
            [hasReminder]="hasReminderForPrompt()"
            [bandSize]="variantLayout.bandSize"
            itemLabel="prompt"
            (reminder)="openReminderModal()"
          />
          }
          @if (isAdmin) {
          <button
            type="button"
            (click)="handleDelete()"
            aria-label="Delete prayer prompt"
            title="Delete prompt"
            [class]="'inline-flex items-center justify-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md cursor-pointer ' + iconButtonPaddingClasses"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          }
        </div>
      </app-card-meta-header-band>

      <!-- Title -->
      <div [class]="'flex items-center gap-2 ' + variantLayout.titleRowMargin">
        <svg [class]="(variantLayout.typeHeaderClasses || 'text-[#988F83] dark:text-[#988F83]') + ' w-[24px] h-[24px] flex-shrink-0'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 18h6"></path>
          <path d="M10 22h4"></path>
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
        </svg>
        <h3 [class]="variantLayout.titleClasses">
          {{ prompt.title }}
        </h3>
      </div>

      @if (variantLayout.showUnreadBadges && (promptBadge$ | async) && (badgeService.getBadgeFunctionalityEnabled$() | async)) {
        <button
          (click)="markPromptAsRead()"
          class="absolute -top-2 -right-2 z-10 inline-flex items-center justify-center w-6 h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
          title="Mark as read"
          aria-label="Mark prompt as read"
        >
          1
        </button>
      }

      <!-- Description -->
      <p [class]="variantLayout.descriptionClasses + ' ' + variantLayout.descriptionMargin">
        {{ prompt.description }}
      </p>

      <!-- Pray For actions -->
      <div [class]="'flex flex-nowrap items-center min-w-0 ' + variantLayout.actionRowGap">
        @if ((userSessionService.getShowPrayForButton$() | async) && (prayerEncouragementService.getPrayerEncouragementEnabled$() | async)) {
          @if (canPrayFor$ | async) {
            <button
              type="button"
              (click)="onPrayForClick()"
              title="Record that you prayed using this prompt"
              [class]="variantLayout.actionButtonClasses + ' btn-chip btn-chip-blue'"
            >
              Pray For
            </button>
          } @else {
            <button
              type="button"
              disabled
              [title]="'You can pray for this again in ' + ((prayerEncouragementService.getCooldownHoursForPrayer$(true) | async) ?? 4) + ' hours'"
              [class]="variantLayout.actionButtonClasses + ' bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md border border-gray-300 dark:border-gray-600 cursor-not-allowed'"
            >
              Prayed For
            </button>
          }
        }
        @if ((userSessionService.getShowPrayingCount$() | async) && (prayerEncouragementService.getPrayerEncouragementEnabled$() | async) && showPrayedForBadge()) {
          <span
            [class]="variantLayout.prayedForBadgeClasses"
            title="How many times you have prayed with this prompt"
          >
            {{ (prompt.prayed_for_count ?? 0) }} {{ prayedForCountLabel() }}
          </span>
        }
      </div>

      <!-- Confirmation Dialog -->
      @if (showConfirmationDialog) {
      <app-confirmation-dialog
        [title]="'Delete Prayer Prompt'"
        [message]="'Are you sure you want to delete this prayer prompt?'"
        [isDangerous]="true"
        [confirmText]="'Delete'"
        (confirm)="onConfirmDelete()"
        (cancel)="onCancelDelete()">
      </app-confirmation-dialog>
      }

      <!-- Pray For explanation modal -->
      @if (showPrayForModal) {
      <div class="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Pray For This Prompt</h2>
          </div>
          <div class="px-6 py-4">
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              When you click Pray For, your private count for this prompt increases so you can track how often you have prayed with it. Only you see this count.
            </p>
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p class="text-sm text-blue-700 dark:text-blue-300">
                You can pray with the same prompt again in {{ (prayerEncouragementService.getCooldownHoursForPrayer$(true) | async) ?? 4 }} hours. Change this cooldown in Settings under Prayer encouragement on cards.
              </p>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                [(ngModel)]="prayForDoNotShowAgain"
                name="prayForDoNotShowAgain"
                class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Do not show this again</span>
            </label>
          </div>
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
            <button
              type="button"
              (click)="showPrayForModal = false; prayForDoNotShowAgain = false"
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="onConfirmPrayForFromModal()"
              class="px-4 py-2 btn-chip btn-chip-blue"
            >
              Pray For
            </button>
          </div>
        </div>
      </div>
      }

      <app-prayer-item-reminder-modal
        [isOpen]="showReminderModal"
        [email]="reminderSessionEmail()"
        [prayerKind]="'prompt'"
        [prayerId]="prompt.id"
        [titleSnapshot]="prompt.title"
        [prayerFor]="prompt.type"
        [reminders]="remindersForThisPrompt()"
        (close)="showReminderModal = false"
        (remindersChange)="onPromptRemindersChanged($event)"
      />
    </div>
    </div>
  `,
  styles: []
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
  /** Emitted after a successful Pray For so presentation can sync its local prompt lists. */
  @Output() prayedForCountChange = new EventEmitter<{
    promptId: string;
    count: number;
  }>();

  get variantLayout() {
    return getPromptCardVariantLayout(this.variant);
  }

  get headerInsetClasses(): string {
    return this.variantLayout.headerInsetClasses;
  }

  get metaActionsGapClasses(): string {
    return getMetaHeaderBandLayoutClasses(this.variantLayout.bandSize).actionsGapClasses;
  }

  get metaHeaderTextSmClasses(): string {
    return getMetaHeaderBandLayoutClasses(this.variantLayout.bandSize).textSmClasses;
  }

  get iconButtonPaddingClasses(): string {
    return getMetaHeaderBandLayoutClasses(this.variantLayout.bandSize).iconButtonPaddingClasses;
  }

  shellClasses(): string {
    const layout = this.variantLayout;
    return [layout.shellBaseClasses, layout.shellPaddingClasses, layout.shellOuterMargin]
      .filter(Boolean)
      .join(' ');
  }

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
  prayForDoNotShowAgain = false;
  private allPrayerItemReminders: PrayerItemReminder[] = [];
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private promptBadgeSubject$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  constructor(public badgeService: BadgeService) {}

  ngOnInit(): void {
    this.loadPrayerItemReminders();
    // Initialize badge by checking if prompt is unread
    this.initializePromptBadge();
    this.promptBadge$ = this.promptBadgeSubject$.asObservable();
    this.refreshCanPrayFor$();

    // Listen to badge changes from badge service
    this.badgeService.getUpdateBadgesChanged$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updatePromptBadge();
      });

    // Listen to storage changes to ensure badge updates
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
        this.prayForDoNotShowAgain = false;
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
    return (this.prompt.prayed_for_count ?? 0) > 0;
  }

  /** Badge noun: singular "Prayer" when count is 1. */
  prayedForCountLabel(): string {
    return (this.prompt.prayed_for_count ?? 0) === 1 ? 'Prayer' : 'Prayers';
  }

  getTypeHeaderTextClasses(): string {
    if (this.isTypeSelected) {
      return 'text-[#988F83] dark:text-[#988F83]';
    }
    return 'text-gray-700 dark:text-gray-300 hover:text-[#988F83] dark:hover:text-[#988F83]';
  }

  onPrayForClick(): void {
    if (localStorage.getItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY) === 'true') {
      void this.confirmPrayFor();
      return;
    }
    this.showPrayForModal = true;
    this.cdr.markForCheck();
  }

  onConfirmPrayForFromModal(): void {
    if (this.prayForDoNotShowAgain) {
      try {
        localStorage.setItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY, 'true');
      } catch {
        // Ignore quota or disabled localStorage
      }
    }
    this.showPrayForModal = false;
    this.prayForDoNotShowAgain = false;
    void this.confirmPrayFor();
    this.cdr.markForCheck();
  }

  async confirmPrayFor(): Promise<void> {
    this.showPrayForModal = false;
    const prayedForPrompt = this.prompt;
    const promptId = prayedForPrompt.id;
    if (!this.prayerEncouragementService.canPrayFor(promptId, true)) return;
    this.prayerEncouragementService.recordPrayedFor(promptId, true);
    const newCount = await this.promptService.incrementPromptPrayedFor(promptId);
    if (newCount !== null) {
      prayedForPrompt.prayed_for_count = newCount;
      if (this.prompt?.id === promptId) {
        this.prompt = { ...this.prompt, prayed_for_count: newCount };
      }
      this.prayedForCountChange.emit({ promptId, count: newCount });
    } else {
      this.prayerEncouragementService.clearPrayedForCooldown(promptId, true);
    }
    this.refreshCanPrayFor$();
    this.cdr.markForCheck();
  }

  /**
   * Initialize the prompt badge based on badge service state
   */
  private initializePromptBadge(): void {
    const isUnread = this.badgeService.isPromptUnread(this.prompt.id);
    this.promptBadgeSubject$.next(isUnread);
  }

  /**
   * Update the prompt badge based on current badge service state
   */
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
    void this.prayerItemReminderService
      .ensureLoaded()
      .then((rows) => {
        this.allPrayerItemReminders = rows;
        this.cdr.markForCheck();
      })
      .catch((err) => {
        console.error('[PromptCard] Failed to load prayer item reminders:', err);
        void this.prayerItemReminderService
          .ensureLoaded(true)
          .then((rows) => {
            this.allPrayerItemReminders = rows;
            this.cdr.markForCheck();
          })
          .catch((retryErr) => {
            console.error(
              '[PromptCard] Retry load prayer item reminders failed:',
              retryErr
            );
            this.cdr.markForCheck();
          });
      });
  }

  reminderSessionEmail(): string {
    return this.userSessionService.getCurrentSession()?.email?.trim() ?? '';
  }

  showReminderButton(): boolean {
    return !!this.reminderSessionEmail() && !!this.prompt?.id;
  }

  remindersForThisPrompt(): PrayerItemReminder[] {
    if (!this.prompt?.id) return [];
    const sessionRows =
      this.userSessionService.getCurrentSession()?.prayerItemReminders;
    const all = sessionRows ?? this.allPrayerItemReminders;
    return this.prayerItemReminderService.remindersForPrayer(
      all,
      this.prompt.id,
      'prompt'
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
