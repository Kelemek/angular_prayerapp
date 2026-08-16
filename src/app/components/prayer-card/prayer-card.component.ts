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
import { PrayerRequest, PrayerService, type PrayerUpdate } from '../../services/prayer.service';
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
import { PrayerUpdateRowComponent } from '../prayer-update-row/prayer-update-row.component';
import {
  PersonalPrayerAnsweredStatusModalComponent,
  type PersonalPrayerAnsweredStatusMode,
} from '../personal-prayer-answered-status-modal/personal-prayer-answered-status-modal.component';
import {
  PrayerUpdateActionsComponent,
  type PrayerUpdateActionsMode,
} from '../prayer-update-actions/prayer-update-actions.component';
import {
  isCommunityPrayerCard,
  isMemberPrayerId,
} from '../../lib/prayer-card-kind';
import type { PrayerUpdateRecord } from '../../lib/prayer-update-header';
import { getPrayerStatusBorderClasses, PERSONAL_PRAYER_BORDER_CLASSES } from '../../lib/prayer-status-header';
import {
  getPrayerCardVariantLayout,
  type PrayerCardVariant,
} from '../../lib/prayer-card-layout';
import type {
  PrayerCardAddUpdateEvent,
  PrayerCardDeleteUpdateEvent,
  PrayerCardDeletionRequest,
  PrayerCardToggleAnsweredEvent,
  PrayerCardUpdateDeletionRequest,
} from '../../services/prayer-card-actions.facade';
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
  imports: [CommonModule, FormsModule, ConfirmationDialogComponent, RichTextViewComponent, PrayerAddUpdateModalComponent, PrayerDeleteRequestModalComponent, PrayerCardMetaHeaderComponent, PrayerItemReminderModalComponent, PrayerUpdateRowComponent, PrayerUpdateActionsComponent, PersonalPrayerAnsweredStatusModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.contents]': 'variant === "presentation"',
    '[class.block]': 'variant !== "presentation"',
  },
  templateUrl: './prayer-card.component.html',
  styles: []
})
export class PrayerCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() variant: PrayerCardVariant = 'home';
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
  @Output() addUpdate = new EventEmitter<PrayerCardAddUpdateEvent>();
  @Output() deleteUpdate = new EventEmitter<PrayerCardDeleteUpdateEvent>();
  @Output() requestDeletion = new EventEmitter<PrayerCardDeletionRequest>();
  @Output() requestUpdateDeletion = new EventEmitter<PrayerCardUpdateDeletionRequest>();
  @Output() editPersonalPrayer = new EventEmitter<PrayerRequest>();
  @Output() editPersonalUpdate = new EventEmitter<{
    update: PrayerUpdate;
    prayerId: string;
  }>();
  @Output() editMemberUpdate = new EventEmitter<{
    update: PrayerUpdate;
    prayerId: string;
  }>();
  @Output() toggleUpdateAnswered = new EventEmitter<PrayerCardToggleAnsweredEvent>();
  @Output() categoryPickerOpenChange = new EventEmitter<boolean>();
  @Output() prayedForCountChange = new EventEmitter<{
    prayerId: string;
    count: number;
  }>();
  @Output() personalPrayerCategoryChange = new EventEmitter<{
    prayerId: string;
    category: string | null;
    status: string;
  }>();

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
  personalAnsweredStatusModalMode: PersonalPrayerAnsweredStatusMode | null = null;
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
    if (changes['prayer'] || changes['isPersonal'] || changes['variant']) {
      this.refreshCanPrayFor$();
    }
    if (changes['prayer']) {
      const previousId = changes['prayer'].previousValue?.id;
      const currentId = changes['prayer'].currentValue?.id;
      if (previousId !== currentId) {
        this.showPrayForModal = false;
        this.prayForDoNotShowAgain = false;
        this.cdr.markForCheck();
      }
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

  get variantLayout() {
    return getPrayerCardVariantLayout(this.variant);
  }

  get showTourAnchors(): boolean {
    return this.variantLayout.showTourAnchors;
  }

  get prayerUpdateList(): PrayerUpdateRecord[] {
    return this.prayer.updates ?? [];
  }

  shellClasses(): string {
    const layout = this.variantLayout;
    const border =
      this.variant === 'presentation' ? '' : ' ' + this.getBorderClass();
    return [
      layout.shellBaseClasses,
      layout.shellPaddingClasses,
      layout.shellBottomPadding,
      layout.shellOuterMargin,
      layout.shellTopPadding,
      border,
    ]
      .filter(Boolean)
      .join(' ');
  }

  getBorderClass(): string {
    if (this.isPersonal) {
      return PERSONAL_PRAYER_BORDER_CLASSES;
    }
    if (isMemberPrayerId(this.prayer.id)) {
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

  /** Badge noun: singular "Prayer" when count is 1 for personal/member cards. */
  prayedForCountLabel(): string {
    if (this.isPersonal || this.isMemberPrayer()) {
      return (this.prayer.prayed_for_count ?? 0) === 1 ? 'Prayer' : 'Prayers';
    }
    return 'Praying';
  }

  isMemberPrayer(): boolean {
    return isMemberPrayerId(this.prayer?.id);
  }

  /** Member cards are a name + updates list; they have no request description. */
  showDescription(): boolean {
    if (this.isMemberPrayer()) {
      return false;
    }
    return !!this.prayer.description?.trim();
  }

  isCommunityPrayer(): boolean {
    return isCommunityPrayerCard(this.prayer, this.isPersonal);
  }

  showStatusPillInHeader(): boolean {
    return this.isCommunityPrayer();
  }

  /** Unread corner badges only on Current and Answered community lists (not Archived/Total/Members). */
  showsCommunityUnreadBadges(): boolean {
    return this.activeFilter === 'current' || this.activeFilter === 'answered';
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
      this.prayedForCountChange.emit({ prayerId, count: newCount });
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

    const updateData: PrayerCardAddUpdateEvent = {
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
    if (this.prayerUpdateList.length === 0) return [];
    const sortedUpdates = [...this.prayerUpdateList].sort((a, b) => 
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
    if (this.prayerUpdateList.length === 0) return false;
    const displayed = this.getDisplayedUpdates();
    return displayed.length < this.prayerUpdateList.length || this.showAllUpdates;
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
    const payload: PrayerUpdate = {
      id: update.id,
      prayer_id: this.prayer.id,
      content: update.content,
      author: update.author ?? '',
      created_at: update.created_at,
      updated_at: update.updated_at,
      is_answered: update.is_answered,
      is_anonymous: update.is_anonymous,
    };
    if (this.isPersonal) {
      this.editPersonalUpdate.emit({ update: payload, prayerId: this.prayer.id });
      return;
    }
    if (this.isMemberPrayer()) {
      this.editMemberUpdate.emit({ update: payload, prayerId: this.prayer.id });
    }
  }

  toggleMemberUpdateAnswered(update: PrayerUpdateRecord): void {
    this.toggleUpdateAnswered.emit({
      updateId: update.id,
      prayerId: this.prayer.id,
      isAnswered: !update.is_answered
    });
  }

  onPersonalAnsweredClick(): void {
    if (!this.isPersonal || this.isTogglingPersonalAnswered) {
      return;
    }

    this.personalAnsweredStatusModalMode =
      this.prayer.category === 'Answered' ? 'unmark' : 'mark';
    this.cdr.markForCheck();
  }

  closePersonalAnsweredStatusModal(): void {
    this.personalAnsweredStatusModalMode = null;
    this.cdr.markForCheck();
  }

  onConfirmPersonalAnswered(): void {
    this.personalAnsweredStatusModalMode = null;
    void this.applyPersonalAnsweredCategory('Answered');
  }

  onConfirmPersonalUnanswered(category: string | null): void {
    this.personalAnsweredStatusModalMode = null;
    void this.applyPersonalAnsweredCategory(category);
  }

  async applyPersonalAnsweredCategory(category: string | null): Promise<void> {
    if (!this.isPersonal || this.isTogglingPersonalAnswered) {
      return;
    }

    this.isTogglingPersonalAnswered = true;
    this.cdr.markForCheck();
    try {
      const success = await this.prayerService.updatePersonalPrayer(this.prayer.id, {
        category,
      });
      if (success) {
        const newStatus = category === 'Answered' ? 'answered' : 'current';
        this.prayer = {
          ...this.prayer,
          category: category ?? undefined,
          status: newStatus,
        };
        this.personalPrayerCategoryChange.emit({
          prayerId: this.prayer.id,
          category,
          status: newStatus,
        });
      }
    } finally {
      this.isTogglingPersonalAnswered = false;
      this.cdr.markForCheck();
    }
  }

  async togglePersonalAnswered(): Promise<void> {
    if (!this.isPersonal || this.isTogglingPersonalAnswered) {
      return;
    }

    const markAnswered = this.prayer.category !== 'Answered';
    await this.applyPersonalAnsweredCategory(markAnswered ? 'Answered' : null);
  }
}