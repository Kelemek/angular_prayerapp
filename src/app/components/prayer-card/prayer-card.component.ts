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
  Optional,
  SimpleChanges,
} from '@angular/core';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PrayerRequest, PrayerService, type PrayerUpdate } from '../../services/prayer.service';
import { RichTextEditorsSettingsService } from '../../services/rich-text-editors-settings.service';
import { UserSessionService } from '../../services/user-session.service';
import { BadgeService } from '../../services/badge.service';
import { PrayerEncouragementService } from '../../services/prayer-encouragement.service';
import type { PrayerUpdateRecord } from '../../lib/prayer-update-header';
import {
  getPrayerCardVariantLayout,
  type PrayerCardVariant,
} from '../../lib/prayer-card-layout';
import {
  type PrayerCardActiveFilter,
} from '../../lib/prayer-card-display';
import { applyPersonalPrayerCategoryUpdate } from '../../lib/prayer-card-personal-answered';
import {
  persistPrayForModalDoNotShowAgain,
  shouldSkipPrayForExplanationModal,
} from '../../lib/prayer-card-pray-for-modal';
import { runPrayerCardPrayFor } from '../../lib/prayer-card-pray-for-run';
import {
  type PrayerCardPermissionContext,
} from '../../lib/prayer-card-permissions';
import {
  ensurePrayerCardItemRemindersLoaded,
  remindersForPrayerCard,
} from '../../lib/prayer-card-reminders';
import {
  getPrayerCardAddUpdateTourElementIds,
  type PrayerCardAddUpdateTourElementIds,
} from '../../lib/prayer-card-tour-ids';
import {
  getDisplayedPrayerCardUpdates,
  shouldShowPrayerCardUpdatesToggle,
} from '../../lib/prayer-card-updates-display';
import {
  buildPrayerCardDeletionRequest,
  buildPrayerCardUpdateDeletionRequest,
} from '../../lib/prayer-card-delete-requests';
import { getPrayerCardUserEmail } from '../../lib/prayer-card-user-context';
import { PrayerCardBadgeWire } from '../../lib/prayer-card-badge-wire';
import {
  applyPrayerCardDeleteUiPatch,
  prayerCardPrayerDeleteClickPatch,
  prayerCardToggleAddUpdatePatch,
  prayerCardUpdateDeleteClickPatch,
  type PrayerCardDeleteUiState,
} from '../../lib/prayer-card-delete-ui';
import {
  buildPrayerCardAddUpdateEvent,
  personalAnsweredStatusModalMode,
  prayerCardUpdateActionsMode,
  prayerUpdateFromRecord,
} from '../../lib/prayer-card-mutations';
import { computePrayerCardViewState } from '../../lib/prayer-card-view-state';
import { scheduleHomePrayerVirtualScrollRemeasure } from '../../lib/home-prayer-virtual-scroll';
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
import { PrayerCardActionsRowComponent } from './prayer-card-actions-row.component';
import { PrayerCardModalsStackComponent } from './prayer-card-modals-stack.component';
import { PrayerCardTitleBodyComponent } from './prayer-card-title-body.component';
import { PrayerCardUpdatesSectionComponent } from './prayer-card-updates-section.component';
import {
  isPrayerAddUpdatePayload,
} from '../prayer-add-update-modal/prayer-add-update-modal.component';
import { PrayerDeleteRequestPayload } from '../prayer-delete-request-modal/prayer-delete-request-modal.component';
import { PrayerCardMetaHeaderComponent } from '../prayer-card-meta-header/prayer-card-meta-header.component';
import type { PersonalPrayerAnsweredStatusMode } from '../personal-prayer-answered-status-modal/personal-prayer-answered-status-modal.component';

@Component({
  selector: 'app-prayer-card',
  standalone: true,
  imports: [
    CommonModule,
    PrayerCardMetaHeaderComponent,
    PrayerCardActionsRowComponent,
    PrayerCardTitleBodyComponent,
    PrayerCardModalsStackComponent,
    PrayerCardUpdatesSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.contents]': 'variant === "presentation"',
    '[class.block]': 'variant !== "presentation"',
  },
  templateUrl: './prayer-card.component.html',
  styleUrl: './prayer-card.component.css',
})
export class PrayerCardComponent
  implements OnInit, OnChanges, OnDestroy, PrayerCardDeleteUiState
{
  @Input() variant: PrayerCardVariant = 'home';
  @Input() prayer!: PrayerRequest;
  @Input() isAdmin = false;
  @Input() isPersonal = false;
  @Input() personalDragHandle = false;
  @Input() personalDragTourId: string | null = null;
  @Input() deletionsAllowed: PrayerCardPermissionContext['deletionsAllowed'] =
    'everyone';
  @Input() updatesAllowed: PrayerCardPermissionContext['updatesAllowed'] =
    'everyone';
  @Input() activeFilter: PrayerCardActiveFilter = 'total';
  @Input() tourUpdateAnchors = false;
  @Input() tourPrayForEncouragementAnchors = false;
  @Input() tourPrayerReminderBellAnchors = false;
  @Input() tourPersonalWalkthroughAnchors = false;
  @Input() showPrayForButton = true;
  @Input() showPrayingCount = true;
  @Input() prayerEncouragementEnabled = true;

  @Output() delete = new EventEmitter<string>();
  @Output() addUpdate = new EventEmitter<PrayerCardAddUpdateEvent>();
  @Output() deleteUpdate = new EventEmitter<PrayerCardDeleteUpdateEvent>();
  @Output() requestDeletion = new EventEmitter<PrayerCardDeletionRequest>();
  @Output() requestUpdateDeletion =
    new EventEmitter<PrayerCardUpdateDeletionRequest>();
  @Output() editPersonalPrayer = new EventEmitter<PrayerRequest>();
  @Output() editPersonalUpdate = new EventEmitter<{
    update: PrayerUpdate;
    prayerId: string;
  }>();
  @Output() editMemberUpdate = new EventEmitter<{
    update: PrayerUpdate;
    prayerId: string;
  }>();
  @Output() toggleUpdateAnswered =
    new EventEmitter<PrayerCardToggleAnsweredEvent>();
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
  @Output() memorizeVerse = new EventEmitter<void>();

  prayerBadge$: Observable<boolean> | null = null;
  canPrayFor$ = of(true);
  cooldownHours = 4;
  private badgeWire!: PrayerCardBadgeWire;
  private destroy$ = new Subject<void>();
  private cooldownHoursDestroy$ = new Subject<void>();

  showAddUpdateForm = false;
  showDeleteRequestForm = false;
  showUpdateDeleteRequestForm: string | null = null;
  showAllUpdates = false;
  showConfirmationDialog = false;
  showUpdateConfirmationDialog = false;
  personalAnsweredStatusModalMode: PersonalPrayerAnsweredStatusMode | null =
    null;
  updateConfirmationTitle = '';
  updateConfirmationMessage = '';
  updateConfirmationId: string | null = null;
  showPrayForModal = false;
  richTextEditorsEnabled = true;
  categoryPickerOpen = false;
  showReminderModal = false;
  private isTogglingPersonalAnswered = false;
  private allPrayerItemReminders: PrayerItemReminder[] = [];

  constructor(
    public userSessionService: UserSessionService,
    public badgeService: BadgeService,
    private prayerService: PrayerService,
    public prayerEncouragementService: PrayerEncouragementService,
    private prayerItemReminderService: PrayerItemReminderService,
    private cdr: ChangeDetectorRef,
    richTextEditorsSettings: RichTextEditorsSettingsService,
    @Optional() private virtualScrollViewport?: CdkVirtualScrollViewport
  ) {
    this.badgeWire = new PrayerCardBadgeWire(this.badgeService, () => this.prayer);
    richTextEditorsSettings
      .getRichTextEditorsEnabled$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        this.richTextEditorsEnabled = v;
        this.cdr.markForCheck();
      });
  }

  get updateBadges$(): PrayerCardBadgeWire['updateBadges$'] {
    return this.badgeWire.updateBadges$;
  }

  ngOnInit(): void {
    this.prayerBadge$ = this.badgeWire.prayerBadge$;
    this.badgeWire.init(this.destroy$);
    this.refreshCanPrayFor$();
    this.refreshCooldownHoursSubscription();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prayer'] || changes['isPersonal'] || changes['variant']) {
      this.refreshCanPrayFor$();
      this.refreshCooldownHoursSubscription();
    }
    if (changes['prayer']) {
      const previousId = changes['prayer'].previousValue?.id;
      const currentId = changes['prayer'].currentValue?.id;
      if (previousId !== currentId) {
        this.showPrayForModal = false;
        this.showReminderModal = false;
        this.allPrayerItemReminders = [];
        this.showAllUpdates = false;
      }
      if (!changes['prayer'].firstChange) {
        this.badgeWire.onPrayerChanged(
          changes['prayer'].previousValue as PrayerRequest,
          changes['prayer'].currentValue as PrayerRequest
        );
      }
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.cooldownHoursDestroy$.next();
    this.cooldownHoursDestroy$.complete();
    this.badgeWire.destroy();
    this.destroy$.next();
    this.destroy$.complete();
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

  get viewState() {
    return computePrayerCardViewState({
      variant: this.variant,
      prayer: this.prayer,
      isAdmin: this.isAdmin,
      isPersonal: this.isPersonal,
      activeFilter: this.activeFilter,
      deletionsAllowed: this.deletionsAllowed,
      updatesAllowed: this.updatesAllowed,
      reminderSessionEmail: this.reminderSessionEmail(),
      currentUserEmail: getPrayerCardUserEmail(this.userSessionService),
    });
  }

  getBorderClass(): string {
    return this.viewState.borderClass;
  }

  shellClasses(): string {
    return this.viewState.shellClasses;
  }

  isMemberPrayer(): boolean {
    return this.viewState.isMember;
  }

  reminderSessionEmail(): string {
    return this.userSessionService.getCurrentSession()?.email?.trim() ?? '';
  }

  hasReminderForPrayer(): boolean {
    return this.remindersForThisPrayer().length > 0;
  }

  prayerItemKind() {
    return resolvePrayerItemKind({
      prayerId: this.prayer?.id ?? '',
      isPersonal: this.isPersonal,
    });
  }

  remindersForThisPrayer(): PrayerItemReminder[] {
    return remindersForPrayerCard(
      this.prayerItemReminderService,
      this.userSessionService,
      this.allPrayerItemReminders,
      this.prayer?.id ?? '',
      this.isPersonal
    );
  }

  openReminderModal(): void {
    this.showReminderModal = true;
    void this.ensurePrayerItemRemindersLoaded();
    this.cdr.markForCheck();
  }

  onPrayerRemindersChanged(all: PrayerItemReminder[]): void {
    this.allPrayerItemReminders = all;
    this.cdr.markForCheck();
  }

  onCategoryPickerOpenChange(open: boolean): void {
    this.categoryPickerOpen = open;
    this.categoryPickerOpenChange.emit(open);
    this.cdr.markForCheck();
  }

  readonly prepareOverflowMenuOpen = async (): Promise<void> => {
    await this.ensurePrayerItemRemindersLoaded();
    this.cdr.detectChanges();
  };

  private ensurePrayerItemRemindersLoaded(): Promise<void> {
    if (!this.reminderSessionEmail()) {
      this.allPrayerItemReminders = [];
      this.cdr.markForCheck();
      return Promise.resolve();
    }
    return ensurePrayerCardItemRemindersLoaded(
      this.userSessionService,
      this.prayerItemReminderService
    ).then((rows) => {
      this.allPrayerItemReminders = rows;
      this.cdr.markForCheck();
    });
  }

  private refreshCanPrayFor$(): void {
    if (!this.prayer?.id) {
      this.canPrayFor$ = of(true);
      return;
    }
    this.canPrayFor$ = this.prayerEncouragementService.getCanPrayFor$(
      this.prayer.id,
      this.viewState.usesPersonalCooldown
    );
  }

  private refreshCooldownHoursSubscription(): void {
    this.cooldownHoursDestroy$.next();
    this.prayerEncouragementService
      .getCooldownHoursForPrayer$(this.viewState.usesPersonalCooldown)
      .pipe(
        takeUntil(this.cooldownHoursDestroy$),
        takeUntil(this.destroy$)
      )
      .subscribe((hours) => {
        this.cooldownHours = hours;
        this.cdr.markForCheck();
      });
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
    const prayedForPrayer = this.prayer;
    const prayerId = prayedForPrayer.id;
    const { isMember, usesPersonalCooldown } = this.viewState;

    const newCount = await runPrayerCardPrayFor(
      {
        prayerService: this.prayerService,
        prayerEncouragementService: this.prayerEncouragementService,
      },
      {
        prayerId,
        isMember,
        isPersonal: this.isPersonal,
        usePersonalCooldown: usesPersonalCooldown,
      }
    );

    if (newCount === null) {
      this.cdr.markForCheck();
      return;
    }

    prayedForPrayer.prayed_for_count = newCount;
    if (this.prayer?.id === prayerId) {
      this.prayer = { ...this.prayer, prayed_for_count: newCount };
    }
    this.prayedForCountChange.emit({ prayerId, count: newCount });
    this.cdr.markForCheck();
  }

  handleDeleteClick(): void {
    applyPrayerCardDeleteUiPatch(
      this,
      prayerCardPrayerDeleteClickPatch(
        this.isAdmin,
        this.isPersonal,
        this.showDeleteRequestForm
      )
    );
    this.cdr.markForCheck();
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
    this.deleteUpdate.emit({ updateId, prayerId: this.prayer.id });
  }

  onCancelUpdateDelete(): void {
    this.showUpdateConfirmationDialog = false;
    this.updateConfirmationId = null;
  }

  toggleAddUpdate(): void {
    applyPrayerCardDeleteUiPatch(
      this,
      prayerCardToggleAddUpdatePatch(this.showAddUpdateForm)
    );
    this.cdr.markForCheck();
    this.remeasureVirtualScrollRow();
  }

  get addUpdateTourElementIds(): PrayerCardAddUpdateTourElementIds | null {
    return getPrayerCardAddUpdateTourElementIds(
      this.tourPersonalWalkthroughAnchors,
      this.tourUpdateAnchors
    );
  }

  closeAddUpdateForm(): void {
    this.showAddUpdateForm = false;
    this.cdr.markForCheck();
    this.remeasureVirtualScrollRow();
  }

  onAddUpdateSubmit(payload: unknown): void {
    if (!isPrayerAddUpdatePayload(payload)) {
      return;
    }

    this.addUpdate.emit(
      buildPrayerCardAddUpdateEvent(
        this.prayer.id,
        payload,
        this.userSessionService
      )
    );
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
    this.requestDeletion.emit(
      buildPrayerCardDeletionRequest(
        this.prayer.id,
        payload.reason,
        this.userSessionService
      )
    );
    this.showDeleteRequestForm = false;
    this.cdr.markForCheck();
  }

  handleDeleteUpdate(updateId: string): void {
    applyPrayerCardDeleteUiPatch(
      this,
      prayerCardUpdateDeleteClickPatch(
        this.isAdmin,
        this.isPersonal,
        updateId,
        this.showUpdateDeleteRequestForm
      )
    );
    this.cdr.markForCheck();
  }

  getDisplayedUpdates(): PrayerUpdateRecord[] {
    return getDisplayedPrayerCardUpdates(
      this.prayerUpdateList,
      this.showAllUpdates
    );
  }

  shouldShowToggleButton(): boolean {
    return shouldShowPrayerCardUpdatesToggle(
      this.prayerUpdateList,
      this.getDisplayedUpdates(),
      this.showAllUpdates
    );
  }

  toggleShowAllUpdates(): void {
    this.showAllUpdates = !this.showAllUpdates;
    this.cdr.markForCheck();
    this.remeasureVirtualScrollRow();
  }

  private remeasureVirtualScrollRow(): void {
    scheduleHomePrayerVirtualScrollRemeasure(this.virtualScrollViewport);
  }

  closeUpdateDeleteRequestForm(): void {
    this.closeAllDeleteRequestForms();
  }

  onUpdateDeleteRequestSubmit(payload: PrayerDeleteRequestPayload): void {
    if (!this.showUpdateDeleteRequestForm) return;

    this.requestUpdateDeletion.emit(
      buildPrayerCardUpdateDeletionRequest(
        this.showUpdateDeleteRequestForm,
        payload.reason,
        this.userSessionService
      )
    );
    this.showUpdateDeleteRequestForm = null;
    this.cdr.markForCheck();
  }

  markPrayerAsRead(): void {
    this.badgeService.markPrayerAsRead(this.prayer.id);
  }

  markUpdateAsRead(updateId: string): void {
    try {
      this.badgeWire.markUpdateRead(updateId, this.prayer.id);
    } catch (error) {
      console.warn('Failed to mark update as read:', error);
    }
  }

  getUpdateActionsMode() {
    return prayerCardUpdateActionsMode(
      this.isPersonal,
      this.viewState.isMember
    );
  }

  onUpdateEdit(update: PrayerUpdateRecord): void {
    const payload = prayerUpdateFromRecord(update, this.prayer.id);
    if (this.isPersonal) {
      this.editPersonalUpdate.emit({
        update: payload,
        prayerId: this.prayer.id,
      });
      return;
    }
    if (this.viewState.isMember) {
      this.editMemberUpdate.emit({ update: payload, prayerId: this.prayer.id });
    }
  }

  toggleMemberUpdateAnswered(update: PrayerUpdateRecord): void {
    this.toggleUpdateAnswered.emit({
      updateId: update.id,
      prayerId: this.prayer.id,
      isAnswered: !update.is_answered,
    });
  }

  onPersonalAnsweredClick(): void {
    if (!this.isPersonal || this.isTogglingPersonalAnswered) {
      return;
    }

    this.personalAnsweredStatusModalMode =
      personalAnsweredStatusModalMode(this.prayer.category);
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
      const result = await applyPersonalPrayerCategoryUpdate(
        this.prayerService,
        this.prayer.id,
        category
      );
      if (result) {
        this.prayer = {
          ...this.prayer,
          category: result.category ?? undefined,
          status: result.status,
        };
        this.personalPrayerCategoryChange.emit({
          prayerId: this.prayer.id,
          category: result.category,
          status: result.status,
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
    await this.applyPersonalAnsweredCategory(
      markAnswered ? 'Answered' : null
    );
  }
}
