import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PrayerRequest, PrayerService } from '../../services/prayer.service';
import { RichTextEditorsSettingsService } from '../../services/rich-text-editors-settings.service';
import { SupabaseService } from '../../services/supabase.service';
import { UserSessionService } from '../../services/user-session.service';
import { BadgeService } from '../../services/badge.service';
import { PrayerEncouragementService } from '../../services/prayer-encouragement.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import {
  PrayerAddUpdateModalComponent,
  PrayerAddUpdatePayload,
  isPrayerAddUpdatePayload,
} from '../prayer-add-update-modal/prayer-add-update-modal.component';
import {
  PrayerDeleteRequestModalComponent,
  PrayerDeleteRequestPayload,
} from '../prayer-delete-request-modal/prayer-delete-request-modal.component';
import { PrayerCardMetaHeaderComponent } from '../prayer-card-meta-header/prayer-card-meta-header.component';
import { PrayerItemReminderModalComponent } from '../prayer-item-reminder-modal/prayer-item-reminder-modal.component';
import { PrayerItemReminderBellButtonComponent } from '../prayer-item-reminder-bell-button/prayer-item-reminder-bell-button.component';
import { PrayerUpdateRowComponent } from '../prayer-update-row/prayer-update-row.component';
import {
  PrayerUpdateActionsComponent,
  type PrayerUpdateActionsMode,
} from '../prayer-update-actions/prayer-update-actions.component';
import {
  isCommunityPrayerCard,
  isMemberPrayerId,
} from '../../lib/prayer-card-kind';
import type { PrayerUpdateRecord } from '../../lib/prayer-update-header';
import { getPrayerStatusBorderClasses } from '../../lib/prayer-status-header';
import { PRAYER_CARD_SHELL_PADDING_CLASSES } from '../../lib/prayer-card-layout';
import { PrayerItemReminderService } from '../../services/prayer-item-reminder.service';
import {
  resolvePrayerItemKind,
  type PrayerItemReminder,
} from '../../types/prayer-item-reminder';

const PRAY_FOR_MODAL_DO_NOT_SHOW_KEY = 'prayer_encouragement_modal_do_not_show';

/** Matches active **Members** stat tab — church blue `#0047AB`, not Tailwind blue-600. */
const PLANNING_CENTER_MEMBER_BORDER_CLASS =
  '!border-[#0047AB] dark:!border-[#0047AB] ring ring-[#0047AB] dark:ring-[#0047AB] ring-offset-0';

@Component({
  selector: 'app-prayer-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationDialogComponent, RichTextViewComponent, PrayerAddUpdateModalComponent, PrayerDeleteRequestModalComponent, PrayerCardMetaHeaderComponent, PrayerItemReminderModalComponent, PrayerItemReminderBellButtonComponent, PrayerUpdateRowComponent, PrayerUpdateActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [attr.id]="tourPersonalWalkthroughAnchors ? 'tour-walkthrough-personal-prayer-card' : null"
      [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md border-[2px] ' + shellPaddingClasses + ' pb-4 mb-4 transition-colors relative ' + (usesPrayerMetaHeader() ? 'pt-0 ' : 'pt-6 ') + getBorderClass()"
    >
      <!-- Meta header: category or status (left) | date (center) | actions (right) -->
      @if (usesPrayerMetaHeader()) {
      <app-prayer-card-meta-header
        [prayerCreatedAt]="prayer.created_at"
        [isPersonal]="isPersonal"
        [isMember]="isMemberPrayer()"
        [category]="prayer.category ?? null"
        [status]="prayer.status"
        [showStatus]="showStatusPillInHeader()"
        [showDelete]="showDeleteButton()"
        [showReminder]="showReminderButton()"
        [hasReminder]="hasReminderForPrayer()"
        [reminderBellTourId]="tourPrayerReminderBellAnchors ? 'tour-prayer-reminder-bell' : null"
        [showCenterDateTime]="!isMemberPrayer()"
        [personalEditTourId]="tourPersonalWalkthroughAnchors ? 'tour-walkthrough-personal-edit' : null"
        [personalAnsweredTourId]="tourPersonalWalkthroughAnchors ? 'tour-walkthrough-personal-answered' : null"
        [personalDeleteTourId]="tourPersonalWalkthroughAnchors ? 'tour-walkthrough-personal-delete' : null"
        [centerDragHandle]="personalDragHandle && isPersonal"
        [centerDragHandleId]="personalDragTourId"
        (toggleAnswered)="togglePersonalAnswered()"
        (edit)="editPersonalPrayer.emit(prayer)"
        (delete)="handleDeleteClick()"
        (reminder)="openReminderModal()"
        (pickerOpenChange)="onCategoryPickerOpenChange($event)"
      />
      }

      <!-- Header -->
      <div class="flex items-start justify-between mb-4 relative">
        <div
          class="flex gap-3 flex-1 min-w-0"
          [class.items-center]="activeFilter === 'planning_center_list'"
          [class.items-start]="activeFilter !== 'planning_center_list'"
        >
          <!-- Avatar for Planning Center members -->
          @if (prayer.prayer_image && isMemberPrayer()) {
            <img 
              [src]="prayer.prayer_image" 
              [alt]="'Avatar for ' + prayer.prayer_for"
              class="w-20 h-20 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
              loading="lazy"
            />
          }
          <div class="flex-1">
            <div class="relative flex items-center gap-2 flex-wrap">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-0 inline">
                Prayer for {{ prayer.prayer_for }}
              </h3>
            @if (!isPersonal && !isMemberPrayer()) {
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Requested by: <span class="font-medium text-gray-800 dark:text-gray-100">{{ displayRequester() }}</span>
            </span>
            }
            </div>
          </div>
        </div>
        @if (!usesPrayerMetaHeader()) {
        <div class="absolute top-0 right-0 flex items-center gap-2 flex-shrink-0">
          @if (showReminderButton()) {
          <app-prayer-item-reminder-bell-button
            [hasReminder]="hasReminderForPrayer()"
            [tourAnchorId]="tourPrayerReminderBellAnchors ? 'tour-prayer-reminder-bell' : null"
            (reminder)="openReminderModal()"
          />
          }
          @if (showDeleteButton()) {
          <button
            (click)="handleDeleteClick()"
            aria-label="Delete prayer request"
            title="Delete prayer request"
            class="inline-flex items-center justify-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          }
        </div>
        }
      </div>

      <!-- Badge in top-right corner -->
      @if ((prayerBadge$ | async) && (badgeService.getBadgeFunctionalityEnabled$() | async) && activeFilter !== 'total' && !isPersonal && !isMemberPrayer()) {
        <button
          (click)="markPrayerAsRead()"
          class="absolute -top-2 -right-2 z-10 inline-flex items-center justify-center w-6 h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
          title="Mark prayer as read"
          aria-label="Mark prayer as read"
        >
          1
        </button>
      }

      <!-- Prayer Description -->
      <app-rich-text-view
        class="block text-gray-600 dark:text-gray-300 mb-4"
        [text]="prayer.description"
      ></app-rich-text-view>

      <!-- Action buttons - flex-nowrap, reduced padding so row fits without wrap or scroll -->
      @if (showAddUpdateButton()) {
      <div class="flex flex-nowrap gap-1 items-center min-w-0">
        <button
          type="button"
          (click)="toggleAddUpdate()"
          title="Add an update to this prayer"
          [attr.id]="
            tourPersonalWalkthroughAnchors
              ? 'tour-walkthrough-add-update'
              : tourUpdateAnchors
                ? 'tour-prayer-add-update'
                : null
          "
          class="flex-shrink-0 px-2 py-1 text-xs font-medium btn-chip btn-chip-green whitespace-nowrap"
        >
          Add Update
        </button>
        @if ((userSessionService.getShowPrayForButton$() | async) && (prayerEncouragementService.getPrayerEncouragementEnabled$() | async)) {
          @if (canPrayFor$ | async) {
            <button
              type="button"
              (click)="onPrayForClick()"
              title="Record that you prayed for this request"
              [attr.id]="tourPrayForEncouragementAnchors ? 'tour-prayer-pray-for' : null"
              class="flex-shrink-0 px-2 py-1 text-xs font-medium btn-chip btn-chip-blue whitespace-nowrap"
            >
              Pray For
            </button>
          } @else {
            <button
              type="button"
              disabled
              [attr.id]="tourPrayForEncouragementAnchors ? 'tour-prayer-pray-for' : null"
              [title]="'You can pray for this again in ' + ((prayerEncouragementService.getCooldownHoursForPrayer$(usesPersonalCooldown()) | async) ?? 4) + ' hours'"
              class="flex-shrink-0 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md border border-gray-300 dark:border-gray-600 cursor-not-allowed whitespace-nowrap"
            >
              Prayed For
            </button>
          }
        }
        @if ((userSessionService.getShowPrayingCount$() | async) && (prayerEncouragementService.getPrayerEncouragementEnabled$() | async) && showPrayedForBadge()) {
          <span
            class="flex-shrink-0 px-1.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md border border-blue-600 dark:border-blue-500 whitespace-nowrap"
            title="Number praying for this request"
          >
            {{ (prayer.prayed_for_count ?? 0) }} {{ isPersonal || isMemberPrayer() ? 'Prayers' : 'Praying' }}
          </span>
        }
      </div>
      }

      <app-prayer-add-update-modal
        [isOpen]="showAddUpdateForm"
        [prayerId]="prayer.id"
        [isPersonal]="isPersonal"
        [richTextEditorsEnabled]="richTextEditorsEnabled"
        [tourElementIds]="addUpdateTourElementIds"
        (close)="closeAddUpdateForm()"
        (updateSubmit)="onAddUpdateSubmit($event)"
      />

      <app-prayer-delete-request-modal
        [isOpen]="showDeleteRequestForm || showUpdateDeleteRequestForm !== null"
        [prayerId]="prayer.id"
        [requestType]="showUpdateDeleteRequestForm ? 'update' : 'prayer'"
        [updateId]="showUpdateDeleteRequestForm ?? ''"
        (close)="closeAllDeleteRequestForms()"
        (submit)="onDeleteRequestModalSubmit($event)"
      />

      <!-- Prayer updates -->
      @if (prayer.updates && prayer.updates.length > 0) {
      <div [class.mt-4]="recentUpdatesNeedsTopMargin()">
        @if (shouldShowToggleButton()) {
        <div class="flex justify-end mb-2">
          <button
            (click)="showAllUpdates = !showAllUpdates"
            class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            {{ showAllUpdates ? 'Show less' : 'Show all' }}
            <svg [class]="'transform transition-transform ' + (showAllUpdates ? 'rotate-180' : '')" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
        }
        <div class="space-y-3">
          @for (update of getDisplayedUpdates(); track update.id) {
          <app-prayer-update-row
            [update]="update"
            [showUpdatedBy]="isCommunityPrayer()"
            [compactHeaderInset]="isPersonal || isMemberPrayer()"
          >
            <app-prayer-update-actions
              updateActions
              [update]="update"
              [mode]="getUpdateActionsMode()"
              [showDelete]="showUpdateDeleteButton()"
              (edit)="onUpdateEdit(update)"
              (delete)="handleDeleteUpdate(update.id)"
              (toggleAnswered)="toggleMemberUpdateAnswered(update)"
            />
            @if ((updateBadges$.get(update.id) | async) && (badgeService.getBadgeFunctionalityEnabled$() | async) && activeFilter !== 'total' && isCommunityPrayer()) {
              <button
                updateCorner
                (click)="markUpdateAsRead(update.id)"
                class="absolute -top-2 -right-2 z-10 inline-flex items-center justify-center w-6 h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                title="Mark update as read"
                aria-label="Mark update as read"
              >
                1
              </button>
            }
          </app-prayer-update-row>
          }
        </div>
      </div>
      }

      <!-- Confirmation Dialog -->
      @if (showConfirmationDialog) {
      <app-confirmation-dialog
        [title]="'Delete Prayer'"
        [message]="'Are you sure you want to delete this prayer? This action cannot be undone.'"
        [isDangerous]="true"
        [confirmText]="'Delete'"
        (confirm)="onConfirmDelete()"
        (cancel)="onCancelDelete()">
      </app-confirmation-dialog>
      }

      <!-- Update Confirmation Dialog -->
      @if (showUpdateConfirmationDialog) {
      <app-confirmation-dialog
        [title]="updateConfirmationTitle"
        [message]="updateConfirmationMessage"
        [isDangerous]="true"
        [confirmText]="'Delete'"
        (confirm)="onConfirmUpdateDelete()"
        (cancel)="onCancelUpdateDelete()">
      </app-confirmation-dialog>
      }

      <app-prayer-item-reminder-modal
        [isOpen]="showReminderModal"
        [email]="reminderSessionEmail()"
        [prayerId]="prayer.id"
        [prayerKind]="prayerItemKind()"
        [prayerFor]="prayer.prayer_for"
        [titleSnapshot]="prayer.title || ('Prayer for ' + prayer.prayer_for)"
        [reminders]="remindersForThisPrayer()"
        (close)="showReminderModal = false"
        (remindersChange)="onPrayerRemindersChanged($event)"
      />

      <!-- Pray For explanation modal -->
      @if (showPrayForModal) {
      <div class="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Pray For This Request</h2>
          </div>
          <div class="px-6 py-4">
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              @if (isPersonal) {
              When you click Pray For, your personal prayer count increases so you can track how often you have prayed for this request.
              } @else if (isMemberPrayer()) {
              When you click Pray For, the shared praying count for this Planning Center member increases. Only the total count is shown—your click is anonymous.
              } @else {
              When you click Pray For, the person who submitted this prayer request will see that others have prayed for them. Only the total count is shown—your click is anonymous.
              }
            </p>
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p class="text-sm text-blue-700 dark:text-blue-300">
                @if (isPersonal) {
                You can pray for the same personal request again in {{ (prayerEncouragementService.getCooldownHoursForPrayer$(true) | async) ?? 4 }} hours. Change this cooldown in Settings under Prayer encouragement on cards.
                } @else if (isMemberPrayer()) {
                This encourages others by showing how many times this member has been prayed for. You can pray for the same member again in {{ (prayerEncouragementService.getCooldownHoursForPrayer$(true) | async) ?? 4 }} hours. Change this cooldown in Settings under Prayer encouragement on cards.
                } @else {
                This encourages the requester by showing how many times their prayer has been lifted up. You can pray for the same request again in {{ (prayerEncouragementService.getCooldownHoursForPrayer$(false) | async) ?? 4 }} hours.
                }
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
              (click)="showPrayForModal = false; prayForDoNotShowAgain = false"
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              (click)="onConfirmPrayForFromModal()"
              class="px-4 py-2 btn-chip btn-chip-blue"
            >
              Pray For
            </button>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: []
})
export class PrayerCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() prayer!: PrayerRequest;
  @Input() isAdmin = false;
  @Input() isPersonal = false;
  /** When true with a single category filter, date/time in the meta header is the drag handle. */
  @Input() personalDragHandle = false;
  @Input() personalDragTourId: string | null = null;
  @Input() deletionsAllowed: 'everyone' | 'original-requestor' | 'admin-only' = 'everyone';
  @Input() updatesAllowed: 'everyone' | 'original-requestor' | 'admin-only' = 'everyone';
  @Input() activeFilter: 'current' | 'answered' | 'archived' | 'total' | 'prompts' | 'personal' | 'planning_center_list' = 'total';
  /** First visible card in the list: stable ids for driver.js “Updating Prayers” tour. */
  @Input() tourUpdateAnchors = false;
  /** First community card on Home: stable id on **Pray For** / **Prayed For** for the Prayer Encouragement tour (step 2). */
  @Input() tourPrayForEncouragementAnchors = false;
  /** First visible community card: stable id on the reminder bell for the Prayer reminders help tour. */
  @Input() tourPrayerReminderBellAnchors = false;
  /** Personal card matching the hands-on help tour sample prayer — stable ids for driver.js. */
  @Input() tourPersonalWalkthroughAnchors = false;

  @Output() delete = new EventEmitter<string>();
  @Output() addUpdate = new EventEmitter<any>();
  @Output() deleteUpdate = new EventEmitter<{updateId: string; prayerId: string}>();
  @Output() requestDeletion = new EventEmitter<any>();
  @Output() requestUpdateDeletion = new EventEmitter<any>();
  @Output() editPersonalPrayer = new EventEmitter<PrayerRequest>();
  @Output() editPersonalUpdate = new EventEmitter<any>();
  @Output() editMemberUpdate = new EventEmitter<any>();
  @Output() toggleUpdateAnswered = new EventEmitter<any>();
  @Output() categoryPickerOpenChange = new EventEmitter<boolean>();

  readonly shellPaddingClasses = PRAYER_CARD_SHELL_PADDING_CLASSES;

  prayerBadge$: Observable<boolean> | null = null;
  canPrayFor$ = of(true);
  updateBadges$: Map<string, BehaviorSubject<boolean>> = new Map();
  private destroy$ = new Subject<void>();
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private prayerBadgeSubject$ = new BehaviorSubject<boolean>(false);

  showAddUpdateForm = false;
  showDeleteRequestForm = false;
  showUpdateDeleteRequestForm: string | null = null;
  showAllUpdates = false;
  showConfirmationDialog = false;
  showUpdateConfirmationDialog = false;
  updateConfirmationTitle = '';
  updateConfirmationMessage = '';
  updateConfirmationId: string | null = null;
  showPrayForModal = false;
  prayForDoNotShowAgain = false;
  richTextEditorsEnabled = true;
  categoryPickerOpen = false;
  showReminderModal = false;
  private isTogglingPersonalAnswered = false;
  private allPrayerItemReminders: PrayerItemReminder[] = [];

  onCategoryPickerOpenChange(open: boolean): void {
    this.categoryPickerOpen = open;
    this.categoryPickerOpenChange.emit(open);
    this.cdr.markForCheck();
  }

  constructor(
    private supabase: SupabaseService,
    public userSessionService: UserSessionService,
    public badgeService: BadgeService,
    private prayerService: PrayerService,
    public prayerEncouragementService: PrayerEncouragementService,
    private prayerItemReminderService: PrayerItemReminderService,
    private cdr: ChangeDetectorRef,
    richTextEditorsSettings: RichTextEditorsSettingsService
  ) {
    richTextEditorsSettings
      .getRichTextEditorsEnabled$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        this.richTextEditorsEnabled = v;
        this.cdr.markForCheck();
      });
  }

  ngOnInit(): void {
    // Initialize badge observable for this prayer
    this.initializePrayerBadge();
    this.prayerBadge$ = this.prayerBadgeSubject$.asObservable();

    // Initialize badges for updates with local BehaviorSubjects
    if (this.prayer.updates && Array.isArray(this.prayer.updates)) {
      this.prayer.updates.forEach(update => {
        this.initializeUpdateBadge(update.id);
      });
    }

    // Listen to update badges changed event from badge service
    this.badgeService.getUpdateBadgesChanged$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Update prayer badge and all update badge subjects when batch changes occur
        this.updatePrayerBadge();
        if (this.prayer.updates && Array.isArray(this.prayer.updates)) {
          this.prayer.updates.forEach(update => {
            this.updateUpdateBadge(update.id);
          });
        }
      });

    // Listen to storage changes for cross-tab updates
    this.storageListener = (event: StorageEvent) => {
      if (event.key === 'read_prayers_data') {
        // Update only this prayer's update badge subjects
        if (this.prayer.updates && Array.isArray(this.prayer.updates)) {
          this.prayer.updates.forEach(update => {
            this.updateUpdateBadge(update.id);
          });
        }
      }
    };

    window.addEventListener('storage', this.storageListener);
    this.refreshCanPrayFor$();
    this.loadPrayerItemReminders();
    this.userSessionService.userSession$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadPrayerItemReminders();
      });
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
        console.error('[PrayerCard] Failed to load prayer item reminders:', err);
        void this.prayerItemReminderService
          .ensureLoaded(true)
          .then((rows) => {
            this.allPrayerItemReminders = rows;
            this.cdr.markForCheck();
          })
          .catch((retryErr) => {
            console.error(
              '[PrayerCard] Retry load prayer item reminders failed:',
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
    if (!this.reminderSessionEmail() || !this.prayer?.id) {
      return false;
    }
    if (this.isPersonal) {
      return this.prayer.category !== 'Answered';
    }
    if (this.isMemberPrayer()) {
      return true;
    }
    return this.prayer.status === 'current';
  }

  prayerItemKind() {
    return resolvePrayerItemKind({
      prayerId: this.prayer?.id ?? '',
      isPersonal: this.isPersonal,
    });
  }

  remindersForThisPrayer(): PrayerItemReminder[] {
    if (!this.prayer?.id) return [];
    const sessionRows =
      this.userSessionService.getCurrentSession()?.prayerItemReminders;
    const all = sessionRows ?? this.allPrayerItemReminders;
    return this.prayerItemReminderService.remindersForPrayer(
      all,
      this.prayer.id,
      this.prayerItemKind()
    );
  }

  hasReminderForPrayer(): boolean {
    return this.remindersForThisPrayer().length > 0;
  }

  openReminderModal(): void {
    this.showReminderModal = true;
    this.loadPrayerItemReminders();
    this.cdr.markForCheck();
  }

  onPrayerRemindersChanged(all: PrayerItemReminder[]): void {
    this.allPrayerItemReminders = all;
    this.cdr.markForCheck();
  }

  private refreshCanPrayFor$(): void {
    if (!this.prayer?.id) {
      this.canPrayFor$ = of(true);
      return;
    }
    this.canPrayFor$ = this.prayerEncouragementService.getCanPrayFor$(
      this.prayer.id,
      this.usesPersonalCooldown()
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prayer'] || changes['isPersonal']) {
      this.refreshCanPrayFor$();
    }
    // Check if updates array has changed
    if (changes['prayer'] && !changes['prayer'].firstChange) {
      const previousPrayer = changes['prayer'].previousValue as PrayerRequest;
      const currentPrayer = changes['prayer'].currentValue as PrayerRequest;
      
      // Detect if updates were added
      const previousUpdateIds = previousPrayer?.updates?.map(u => u.id) || [];
      const currentUpdateIds = currentPrayer?.updates?.map(u => u.id) || [];
      
      // Find new updates that weren't in the previous array
      const newUpdates = currentUpdateIds.filter(id => !previousUpdateIds.includes(id));
      
      if (newUpdates.length > 0) {
        // Initialize badge subjects for new updates
        newUpdates.forEach(newUpdateId => {
          const update = currentPrayer.updates?.find(u => u.id === newUpdateId);
          if (update && !this.updateBadges$.has(update.id)) {
            this.initializeUpdateBadge(update.id);
          }
        });
        // Refresh badge state for all updates so only the new one shows unread (existing
        // updates may still have been left true from initial ngOnInit before any were marked read)
        if (currentPrayer.updates && Array.isArray(currentPrayer.updates)) {
          currentPrayer.updates.forEach(update => {
            this.updateUpdateBadge(update.id);
          });
        }
      }
    }
  }

  /**
   * Initialize a badge subject for an update
   */
  private initializeUpdateBadge(updateId: string): void {
    const isUnread = this.badgeService.isUpdateUnread(updateId);
    const subject = new BehaviorSubject<boolean>(isUnread);
    this.updateBadges$.set(updateId, subject);
  }

  /**
   * Update a badge subject for an update based on badge service state
   */
  private updateUpdateBadge(updateId: string): void {
    const isUnread = this.badgeService.isUpdateUnread(updateId);
    const subject = this.updateBadges$.get(updateId);
    if (subject) {
      subject.next(isUnread);
    }
  }

  /**
   * Initialize the prayer badge based on badge service state
   */
  private initializePrayerBadge(): void {
    const isUnread = this.badgeService.isPrayerUnread(this.prayer.id);
    this.prayerBadgeSubject$.next(isUnread);
  }

  /**
   * Update the prayer badge based on current badge service state
   */
  private updatePrayerBadge(): void {
    const isUnread = this.badgeService.isPrayerUnread(this.prayer.id);
    this.prayerBadgeSubject$.next(isUnread);
  }

  ngOnDestroy(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get read update IDs from localStorage
   */
  private getReadUpdateIds(): string[] {
    try {
      const stored = localStorage.getItem('read_prayers_data');
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed.updates) ? parsed.updates : [];
    } catch (error) {
      return [];
    }
  }

  getBorderClass(): string {
    if (this.isPersonal) {
      return '!border-gray-300 dark:!border-gray-600';
    }
    if (
      this.activeFilter === 'planning_center_list' ||
      isMemberPrayerId(this.prayer.id)
    ) {
      return PLANNING_CENTER_MEMBER_BORDER_CLASS;
    }
    return getPrayerStatusBorderClasses(this.prayer.status);
  }

  displayRequester(): string {
    return this.prayer.is_anonymous ? 'Anonymous' : this.prayer.requester;
  }

  // Check if delete button should be shown based on deletion policy
  // Admin: always shows delete button
  // admin-only: only admins can see/use delete
  // original-requestor: only prayer creator can delete
  // everyone: all users can request deletion
  showDeleteButton(): boolean {
    // Don't show delete button for synthetic Planning Center member cards
    if (isMemberPrayerId(this.prayer.id)) return false;
    // Personal prayers always allow deletion by owner
    if (this.isPersonal) return true;
    if (this.isAdmin) return true;
    if (this.deletionsAllowed === 'admin-only') return false;
    if (this.deletionsAllowed === 'original-requestor') {
      return this.isCurrentUserTheRequester();
    }
    return true; // 'everyone'
  }

  // Check if add update button should be shown based on update policy
  // Admin: always shows add update button
  // admin-only: only admins can see/use add update
  // original-requestor: only prayer creator can add updates
  // everyone: all users can submit updates
  // personal / Planning Center member cards: always allow for list viewers (no requester email)
  showAddUpdateButton(): boolean {
    // Personal prayers always allow updates by owner
    if (this.isPersonal) return true;
    // Member cards have no requester; list viewers can add updates and use Pray For
    if (this.isMemberPrayer()) return true;
    if (this.isAdmin) return true;
    if (this.updatesAllowed === 'admin-only') return false;
    if (this.updatesAllowed === 'original-requestor') {
      return this.isCurrentUserTheRequester();
    }
    return true; // 'everyone'
  }

  /** Top margin before prayer updates when action buttons or an open form sit above. */
  recentUpdatesNeedsTopMargin(): boolean {
    return this.showAddUpdateButton();
  }

  showPrayedForBadge(): boolean {
    const count = this.prayer.prayed_for_count ?? 0;
    if (count <= 0) return false;
    // Personal prayers are private to the owner; they always see their count.
    if (this.isPersonal) return true;
    // Member cards have no requester email — shared count is visible to everyone on the list.
    if (this.isMemberPrayer()) return true;
    if (this.isAdmin) return true;
    return this.isCurrentUserTheRequester();
  }

  isMemberPrayer(): boolean {
    return isMemberPrayerId(this.prayer?.id);
  }

  isCommunityPrayer(): boolean {
    return isCommunityPrayerCard(this.prayer, this.isPersonal);
  }

  usesPrayerMetaHeader(): boolean {
    return this.isPersonal || this.isCommunityPrayer() || this.isMemberPrayer();
  }

  showStatusPillInHeader(): boolean {
    return (
      this.isCommunityPrayer() &&
      (this.activeFilter === 'total' ||
        this.activeFilter === 'current' ||
        this.activeFilter === 'answered')
    );
  }

  /** Personal and member cards use the user's personal cooldown setting. */
  usesPersonalCooldown(): boolean {
    return this.isPersonal || this.isMemberPrayer();
  }

  onPrayForClick(): void {
    if (localStorage.getItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY) === 'true') {
      this.confirmPrayFor();
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
    this.confirmPrayFor();
    this.cdr.markForCheck();
  }

  async confirmPrayFor(): Promise<void> {
    this.showPrayForModal = false;
    const prayedForPrayer = this.prayer;
    const prayerId = prayedForPrayer.id;
    const isMember = this.isMemberPrayer();
    const usePersonalCooldown = this.usesPersonalCooldown();
    if (!this.prayerEncouragementService.canPrayFor(prayerId, usePersonalCooldown)) return;
    this.prayerEncouragementService.recordPrayedFor(prayerId, usePersonalCooldown);
    let newCount: number | null;
    if (isMember) {
      const personId = prayerId.substring('pc-member-'.length);
      newCount = await this.prayerService.incrementMemberPrayedFor(personId);
    } else if (this.isPersonal) {
      newCount = await this.prayerService.incrementPersonalPrayedFor(prayerId);
    } else {
      newCount = await this.prayerService.incrementPrayedFor(prayerId);
    }
    if (newCount !== null) {
      prayedForPrayer.prayed_for_count = newCount;
      if (this.prayer?.id === prayerId) {
        this.prayer = { ...this.prayer, prayed_for_count: newCount };
      }
    } else {
      this.prayerEncouragementService.clearPrayedForCooldown(prayerId, usePersonalCooldown);
    }
    this.cdr.markForCheck();
  }

  // Check if update delete button should be shown based on deletion policy
  // Same rules as prayer deletion policy
  showUpdateDeleteButton(): boolean {
    if (this.isAdmin) return true;
    if (this.deletionsAllowed === 'admin-only') return false;
    if (this.deletionsAllowed === 'original-requestor') {
      return this.isCurrentUserTheRequester();
    }
    return true; // 'everyone'
  }

  handleDeleteClick(): void {
    if (this.isAdmin || this.isPersonal) {
      this.showConfirmationDialog = true;
    } else {
      this.showDeleteRequestForm = !this.showDeleteRequestForm;
      if (this.showDeleteRequestForm) {
        this.showAddUpdateForm = false;
        this.showUpdateDeleteRequestForm = null;
      }
    }
  }

  onConfirmDelete(): void {
    this.delete.emit(this.prayer.id);
    this.showConfirmationDialog = false;
  }

  onCancelDelete(): void {
    this.showConfirmationDialog = false;
  }

  onConfirmUpdateDelete(): void {
    if (!this.updateConfirmationId) return;
    const updateId = this.updateConfirmationId;
    this.showUpdateConfirmationDialog = false;
    this.updateConfirmationId = null;
    this.deleteUpdate.emit({updateId, prayerId: this.prayer.id});
  }

  onCancelUpdateDelete(): void {
    this.showUpdateConfirmationDialog = false;
    this.updateConfirmationId = null;
  }

  toggleAddUpdate(): void {
    this.showAddUpdateForm = !this.showAddUpdateForm;
    if (this.showAddUpdateForm) {
      this.showDeleteRequestForm = false;
      this.showUpdateDeleteRequestForm = null;
    }
  }

  get addUpdateTourElementIds():
    | {
        content?: string;
        anonymousWrap?: string;
        anonymousInput?: string;
        markAnsweredWrap?: string;
        markAnsweredInput?: string;
        submit?: string;
      }
    | null {
    if (this.tourPersonalWalkthroughAnchors) {
      return { content: "tour-walkthrough-update-content" };
    }
    if (this.tourUpdateAnchors) {
      return {
        content: "tour-prayer-update-content",
        anonymousWrap: "tour-prayer-update-anonymous-wrap",
        anonymousInput: "tour-prayer-update-anonymous-input",
        markAnsweredWrap: "tour-prayer-update-mark-answered-wrap",
        markAnsweredInput: "tour-prayer-update-mark-answered-input",
        submit: "tour-prayer-update-submit",
      };
    }
    return null;
  }

  closeAddUpdateForm(): void {
    this.showAddUpdateForm = false;
    this.cdr.markForCheck();
  }

  onAddUpdateSubmit(payload: PrayerAddUpdatePayload): void {
    if (!isPrayerAddUpdatePayload(payload)) {
      return;
    }

    const userEmail = this.getCurrentUserEmail();

    const userSession = this.userSessionService.getCurrentSession();
    const authorName = userSession?.fullName || this.getCurrentUserName();

    const updateData = {
      prayer_id: this.prayer.id,
      content: payload.content,
      author: authorName,
      author_email: userEmail,
      is_anonymous: payload.is_anonymous,
      mark_as_answered: payload.mark_as_answered,
    };

    this.addUpdate.emit(updateData);
    this.showAddUpdateForm = false;
    this.cdr.markForCheck();
  }

  closeAllDeleteRequestForms(): void {
    this.showDeleteRequestForm = false;
    this.showUpdateDeleteRequestForm = null;
    this.cdr.markForCheck();
  }

  onDeleteRequestModalSubmit(payload: PrayerDeleteRequestPayload): void {
    if (this.showUpdateDeleteRequestForm) {
      this.onUpdateDeleteRequestSubmit(payload);
    } else {
      this.onDeleteRequestSubmit(payload);
    }
  }

  closeDeleteRequestForm(): void {
    this.closeAllDeleteRequestForms();
  }

  onDeleteRequestSubmit(payload: PrayerDeleteRequestPayload): void {
    const nameParts = this.getCurrentUserName().split(' ');
    const requestData = {
      prayer_id: this.prayer.id,
      requester_first_name: nameParts[0] || '',
      requester_last_name: nameParts.slice(1).join(' ') || '',
      requester_email: this.getCurrentUserEmail(),
      reason: payload.reason,
    };

    this.requestDeletion.emit(requestData);
    this.showDeleteRequestForm = false;
    this.cdr.markForCheck();
  }

  handleDeleteUpdate(updateId: string): void {
    if (this.isAdmin || this.isPersonal) {
      this.updateConfirmationTitle = 'Delete Update';
      this.updateConfirmationMessage = 'Are you sure you want to delete this update? This action cannot be undone.';
      this.updateConfirmationId = updateId;
      this.showUpdateConfirmationDialog = true;
    } else {
      // Toggle the form - close if already open for this update, open if closed
      if (this.showUpdateDeleteRequestForm === updateId) {
        this.showUpdateDeleteRequestForm = null;
      } else {
        this.showUpdateDeleteRequestForm = updateId;
        this.showAddUpdateForm = false;
        this.showDeleteRequestForm = false;
      }
    }
    this.cdr.markForCheck();
  }

  getDisplayedUpdates() {
    if (!this.prayer.updates) return [];
    const sortedUpdates = [...this.prayer.updates].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    if (this.showAllUpdates) return sortedUpdates;
    
    // Get updates from the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentUpdates = sortedUpdates.filter(update => 
      new Date(update.created_at).getTime() > oneWeekAgo.getTime()
    );
    
    // If there are updates less than 1 week old, show all of them
    // Otherwise, show only the most recent update
    return recentUpdates.length > 0 ? recentUpdates : sortedUpdates.slice(0, 1);
  }

  shouldShowToggleButton(): boolean {
    if (!this.prayer.updates) return false;
    const displayed = this.getDisplayedUpdates();
    return displayed.length < this.prayer.updates.length || this.showAllUpdates;
  }

  private getCurrentUserEmail(): string {
    // Get email from UserSessionService (cached from database)
    const session = this.userSessionService.getCurrentSession();
    return session?.email || '';
  }

  // Helper method to check if the current user is the original prayer requester
  // Used for 'original-requestor' policy to verify user email matches prayer email
  private isCurrentUserTheRequester(): boolean {
    const userEmail = this.getCurrentUserEmail();
    return userEmail.toLowerCase() === (this.prayer.email || '').toLowerCase();
  }

  private getCurrentUserName(): string {
    const firstName = localStorage.getItem('userFirstName') || '';
    const lastName = localStorage.getItem('userLastName') || '';
    return `${firstName} ${lastName}`.trim();
  }

  closeUpdateDeleteRequestForm(): void {
    this.closeAllDeleteRequestForms();
  }

  onUpdateDeleteRequestSubmit(payload: PrayerDeleteRequestPayload): void {
    if (!this.showUpdateDeleteRequestForm) return;

    const nameParts = this.getCurrentUserName().split(' ');
    const requestData = {
      update_id: this.showUpdateDeleteRequestForm,
      requester_first_name: nameParts[0] || '',
      requester_last_name: nameParts.slice(1).join(' ') || '',
      requester_email: this.getCurrentUserEmail(),
      reason: payload.reason,
    };

    this.requestUpdateDeletion.emit(requestData);
    this.showUpdateDeleteRequestForm = null;
    this.cdr.markForCheck();
  }

  markPrayerAsRead(): void {
    this.badgeService.markPrayerAsRead(this.prayer.id);
  }

  /**
   * Mark an update as read
   */
  markUpdateAsRead(updateId: string): void {
    try {
      // Call the badge service method which handles all the counting
      this.badgeService.markUpdateAsRead(updateId, this.prayer.id, 'prayers');
      
      // Update the BehaviorSubject for this update immediately
      const subject = this.updateBadges$.get(updateId);
      if (subject) {
        subject.next(false); // Hide the badge
      }
    } catch (error) {
      console.warn('Failed to mark update as read:', error);
    }
  }

  getUpdateActionsMode(): PrayerUpdateActionsMode {
    if (this.isPersonal) {
      return 'personal';
    }
    if (this.isMemberPrayer()) {
      return 'member';
    }
    return 'readonly';
  }

  onUpdateEdit(update: PrayerUpdateRecord): void {
    if (this.isPersonal) {
      this.editPersonalUpdate.emit({ update, prayerId: this.prayer.id });
      return;
    }
    if (this.isMemberPrayer()) {
      this.editMemberUpdate.emit({ update, prayerId: this.prayer.id });
    }
  }

  toggleMemberUpdateAnswered(update: PrayerUpdateRecord): void {
    this.toggleUpdateAnswered.emit({
      updateId: update.id,
      prayerId: this.prayer.id,
      isAnswered: !update.is_answered
    });
  }

  async togglePersonalAnswered(): Promise<void> {
    if (!this.isPersonal || this.isTogglingPersonalAnswered) {
      return;
    }

    const markAnswered = this.prayer.category !== 'Answered';
    this.isTogglingPersonalAnswered = true;
    this.cdr.markForCheck();
    try {
      await this.prayerService.updatePersonalPrayer(this.prayer.id, {
        category: markAnswered ? 'Answered' : null,
      });
    } finally {
      this.isTogglingPersonalAnswered = false;
      this.cdr.markForCheck();
    }
  }
}