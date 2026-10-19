import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { HomeSubFilterChipComponent } from '../home-sub-filter-chip/home-sub-filter-chip.component';
import { CardActionsOverflowMenuComponent } from '../card-actions-overflow-menu/card-actions-overflow-menu.component';
import type { CardActionsOverflowItem } from '../card-actions-overflow-menu/card-actions-overflow-menu.types';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { ModalChromeCloseButtonComponent } from '../modal-chrome-close-button/modal-chrome-close-button.component';
import { PrayerCardComponent } from '../prayer-card/prayer-card.component';
import {
  HOME_GROUPS_SUB_FILTER_GROUP_CLASS,
  HOME_PUBLIC_STATUS_CHIP_THEMES,
  HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS,
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from '../../lib/home-sub-filter-chip-classes';
import { buildHomeSubFilterChipButtonClass } from '../../lib/home-sub-filter-chip-button-class';
import { HOME_SHELL_SECTION_GAP_CLASSES } from '../../lib/home-shell-spacing';
import {
  countGroupPrayersByStatus,
  countPrayersInGroup,
  groupPrayerCardModel,
  groupPrayersForHomeView,
  type GroupFilterMode,
} from '../../lib/home-group-catalog';
import { parseInviteEmails } from '../../lib/home-group-invite-emails';
import { groupPrayerUpdatesByPrayerId } from '../../lib/prayer-group-catalog-load';
import type { PrayerRequest } from '../../lib/prayer-types';
import {
  GroupPrayerRow,
  GroupPrayerUpdateRow,
  PrayerGroupMemberRow,
  PrayerGroupService,
  PrayerGroupSummary,
} from '../../services/prayer-group.service';
import type {
  PrayerCardAddUpdateEvent,
  PrayerCardDeleteUpdateEvent,
} from '../../services/prayer-card-actions.facade';
import { ToastService } from '../../services/toast.service';
import { PrayerItemReminderService } from '../../services/prayer-item-reminder.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { HomeDeepLinkCoordinator } from '../../services/home-deep-link.coordinator';
import {
  AdminFilterSelectComponent,
  type AdminFilterSelectOption,
} from '../admin-filter-select/admin-filter-select.component';

@Component({
  selector: 'app-home-groups-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    HomeSubFilterChipComponent,
    CardActionsOverflowMenuComponent,
    ConfirmationDialogComponent,
    ModalChromeCloseButtonComponent,
    PrayerCardComponent,
    AdminFilterSelectComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-groups-panel.component.html',
  host: { class: 'block' },
})
export class HomeGroupsPanelComponent {
  @Input() isChurchMember = true;
  @Input() viewerEmail = '';
  @Input() viewerName = '';
  @Input() showPrayForButton = true;
  @Input() showPrayingCount = true;
  @Input() prayerEncouragementEnabled = false;

  readonly sectionGapClass = HOME_SHELL_SECTION_GAP_CLASSES;
  readonly panelClass = HOME_GROUPS_SUB_FILTER_GROUP_CLASS;
  readonly chipRowClass = HOME_SUB_FILTER_CHIP_ROW_CLASS;
  readonly chipHostClass = HOME_WRAP_FILTER_CHIP_FLEX_CLASS;
  readonly chipThemes = HOME_PUBLIC_STATUS_CHIP_THEMES;
  readonly groupChipActive = HOME_PUBLIC_STATUS_CHIP_THEMES.members.active;
  readonly groupChipInactive = HOME_PUBLIC_STATUS_CHIP_THEMES.members.inactive;
  /** Square chip the same height as the other filters; the plus is drawn inside it. */
  readonly addGroupChipLayoutClass =
    'inline-flex size-9 shrink-0 items-center justify-center rounded-lg p-0 text-xs font-medium transition-all';

  groups: PrayerGroupSummary[] = [];
  prayers: GroupPrayerRow[] = [];
  private updatesByPrayer = new Map<string, GroupPrayerUpdateRow[]>();
  editingPrayer: PrayerRequest | null = null;
  editPrayerFor = '';
  editDescription = '';
  editingUpdate: { id: string; content: string } | null = null;
  members: PrayerGroupMemberRow[] = [];
  filterMode: GroupFilterMode = 'current';
  selectedId: string | null = null;
  error: string | null = null;
  loading = true;
  reordering = false;
  chipReorderHandlesVisible = false;
  submitting = false;
  createOpen = false;
  createName = '';
  membersTarget: PrayerGroupSummary | null = null;
  /** First open after creating a group: invite-only (no leave / transfer). */
  membersModalPostCreate = false;
  renameTarget: PrayerGroupSummary | null = null;
  renameDraft = '';
  pendingDelete: PrayerGroupSummary | null = null;
  pendingLeaveGroup: PrayerGroupSummary | null = null;
  pendingTransferEmail: string | null = null;
  emailsDraft = '';
  transferEmail = '';
  private membersLoadToken = 0;

  constructor(
    private readonly groupsApi: PrayerGroupService,
    private readonly prayerItemReminderService: PrayerItemReminderService,
    private readonly toast: ToastService,
    private readonly auth: AdminAuthService,
    private readonly deepLinks: HomeDeepLinkCoordinator,
    private readonly cdr: ChangeDetectorRef,
    destroyRef: DestroyRef,
  ) {
    this.groupsApi.groups$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((groups) => {
        this.groups = groups;
        if (groups.length <= 1) {
          this.chipReorderHandlesVisible = false;
        }
        this.applyPendingGroupDeepLink();
        this.cdr.markForCheck();
      });
    this.groupsApi.prayers$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((prayers) => {
        this.prayers = prayers;
        this.applyPendingGroupPrayerDeepLink();
        this.cdr.markForCheck();
      });
    this.groupsApi.updates$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((updates) => {
        this.updatesByPrayer = groupPrayerUpdatesByPrayerId(updates);
        this.cdr.markForCheck();
      });
    this.groupsApi.loading$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((loading) => {
        this.loading = loading;
        this.cdr.markForCheck();
      });
    this.groupsApi.error$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((error) => {
        this.error = error;
        this.cdr.markForCheck();
      });
    this.groupsApi.groupDeepLinkApply$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.applyPendingGroupDeepLink();
        this.applyPendingGroupPrayerDeepLink();
        this.cdr.markForCheck();
      });
  }

  get counts() {
    return countGroupPrayersByStatus(this.prayers);
  }

  get deleteMessage(): string {
    const name = this.pendingDelete?.name ?? 'this group';
    return `Delete "${name}" and all of its prayers? This cannot be undone.`;
  }

  get leaveConfirmMessage(): string {
    const name = this.pendingLeaveGroup?.name ?? 'this group';
    return `Leave "${name}"? You will no longer see its prayers or receive group notifications.`;
  }

  get canSendInvites(): boolean {
    return parseInviteEmails(this.emailsDraft).length > 0;
  }

  get transferConfirmMessage(): string {
    const email = this.pendingTransferEmail ?? '';
    const member = this.members.find((row) => row.user_email === email);
    const label = member?.name || member?.user_email || email;
    const groupName = this.membersTarget?.name ?? 'this group';
    return `Make ${label} the owner of "${groupName}"? You will become a member.`;
  }

  get visiblePrayers(): GroupPrayerRow[] {
    return groupPrayersForHomeView(
      this.prayers,
      this.filterMode,
      this.selectedId,
      this.groups,
    );
  }

  prayerCount(groupId: string): number {
    return countPrayersInGroup(this.prayers, groupId);
  }

  isGroupActive(groupId: string): boolean {
    return this.filterMode === 'named' && this.selectedId === groupId;
  }

  chipClass(group: PrayerGroupSummary): string {
    return buildHomeSubFilterChipButtonClass({
      base: HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS,
      active: this.isGroupActive(group.id),
      activeClass: this.groupChipActive,
      inactiveClass: this.groupChipInactive,
      disabled: this.reordering,
      showDragHandle: this.chipReorderHandlesVisible,
    });
  }

  toggleChipReorderHandles(): void {
    this.chipReorderHandlesVisible = !this.chipReorderHandlesVisible;
    this.cdr.markForCheck();
  }

  selectStatus(mode: 'current' | 'answered' | 'total'): void {
    this.filterMode = mode;
    this.selectedId = null;
  }

  selectGroup(id: string): void {
    if (this.isGroupActive(id)) {
      this.selectStatus('total');
      this.groupsApi.preferredGroupId = null;
      return;
    }
    this.selectedId = id;
    this.filterMode = 'named';
    this.groupsApi.preferredGroupId = id;
  }

  cardFor(prayer: GroupPrayerRow): PrayerRequest {
    return groupPrayerCardModel(prayer, this.updatesByPrayer.get(prayer.id) ?? []);
  }

  groupNameFor(groupId: string): string {
    return this.groups.find((group) => group.id === groupId)?.name ?? 'Group';
  }

  isGroupOwnerForPrayer(prayer: GroupPrayerRow): boolean {
    return this.groups.find((group) => group.id === prayer.group_id)?.role === 'owner';
  }

  overflowItems(group: PrayerGroupSummary): CardActionsOverflowItem[] {
    const items: CardActionsOverflowItem[] = [];
    if (this.groups.length > 1) {
      items.push({
        id: 'reorder',
        label: this.chipReorderHandlesVisible ? 'Done reordering' : 'Reorder',
        icon: 'grip',
        tone: 'blue',
        ariaLabel: this.chipReorderHandlesVisible
          ? 'Hide drag handles'
          : 'Show drag handles to reorder',
        onSelect: () => this.toggleChipReorderHandles(),
      });
    }
    items.push({
        id: 'members',
        label: 'Manage members',
        icon: 'users',
        tone: 'blue',
        ariaLabel: `Manage members of ${group.name}`,
        onSelect: () => void this.openMembers(group),
      });
    if (group.role !== 'owner') return items;
    return [
      ...items,
      {
        id: 'edit',
        label: 'Rename group',
        icon: 'edit',
        tone: 'blue',
        ariaLabel: `Rename ${group.name}`,
        onSelect: () => this.openRename(group),
      },
      {
        id: 'delete',
        label: 'Delete group',
        icon: 'trash',
        tone: 'red',
        ariaLabel: `Delete ${group.name}`,
        onSelect: () => {
          this.pendingDelete = group;
          this.cdr.markForCheck();
        },
      },
    ];
  }

  async onGroupDrop(event: CdkDragDrop<PrayerGroupSummary[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex || this.reordering) return;
    moveItemInArray(this.groups, event.previousIndex, event.currentIndex);
    this.reordering = true;
    this.cdr.markForCheck();
    try {
      await this.groupsApi.reorderGroups(this.groups.map((group) => group.id));
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not reorder groups');
      await this.groupsApi.loadCatalog(false);
    } finally {
      this.reordering = false;
      this.cdr.markForCheck();
    }
  }

  async createGroup(): Promise<void> {
    const name = this.createName.trim();
    if (!name || this.submitting) return;
    this.submitting = true;
    this.cdr.markForCheck();
    try {
      const id = await this.groupsApi.createGroup(name);
      this.createName = '';
      this.createOpen = false;
      this.selectedId = id;
      this.filterMode = 'named';
      this.cdr.markForCheck();
      const created =
        this.groups.find((group) => group.id === id) ??
        ({ id, name, role: 'owner', memberCount: 1 } satisfies PrayerGroupSummary);
      this.openMembers(created, { postCreate: true });
      this.toast.success('Group created');
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not create the group');
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  async saveRename(): Promise<void> {
    const name = this.renameDraft.trim();
    if (!this.renameTarget || !name || name === this.renameTarget.name) return;
    this.submitting = true;
    this.cdr.markForCheck();
    try {
      await this.groupsApi.renameGroup(this.renameTarget.id, name);
      this.renameTarget = null;
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not rename the group');
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  async confirmDelete(): Promise<void> {
    const group = this.pendingDelete;
    if (!group) return;
    this.submitting = true;
    this.cdr.markForCheck();
    try {
      await this.groupsApi.deleteGroup(group.id);
      if (this.selectedId === group.id) this.selectStatus('current');
      this.pendingDelete = null;
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not delete the group');
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  async sendInvites(): Promise<void> {
    if (!this.membersTarget) return;
    const emails = parseInviteEmails(this.emailsDraft);
    if (emails.length === 0) return;
    this.submitting = true;
    this.cdr.markForCheck();
    try {
      let inviteEmailFailed = false;
      for (const email of emails) {
        const result = await this.groupsApi.invite(this.membersTarget.id, email);
        if (result.emailError) {
          inviteEmailFailed = true;
          this.toast.error(`Added ${email}. ${result.emailError}`);
        }
      }
      this.emailsDraft = '';
      await this.groupsApi.refreshCatalogAfterWrite();
      await this.loadMembers(this.membersTarget.id);
      if (!inviteEmailFailed) {
        this.toast.success('Invites sent');
      }
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not invite that email');
    } finally {
      this.submitting = false;
      this.cdr.markForCheck();
    }
  }

  async removeMember(email: string): Promise<void> {
    if (!this.membersTarget) return;
    try {
      await this.groupsApi.removeMember(this.membersTarget.id, email);
      await this.loadMembers(this.membersTarget.id);
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not remove that member');
    }
  }

  leave(group: PrayerGroupSummary): void {
    if (group.role === 'owner') {
      this.toast.info(
        'Transfer ownership to another member before you can leave this group.',
      );
      return;
    }
    this.pendingLeaveGroup = group;
    this.cdr.markForCheck();
  }

  cancelLeave(): void {
    this.pendingLeaveGroup = null;
    this.cdr.markForCheck();
  }

  async confirmLeave(): Promise<void> {
    const group = this.pendingLeaveGroup;
    if (!group) return;
    this.pendingLeaveGroup = null;
    this.cdr.markForCheck();
    try {
      const accountDeleted = await this.groupsApi.leave(group.id);
      if (accountDeleted) {
        await this.auth.logout();
        window.location.assign('/login');
        return;
      }
      this.closeMembersModal();
      if (this.selectedId === group.id) this.selectStatus('current');
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not leave the group');
    } finally {
      this.cdr.markForCheck();
    }
  }

  get transferMemberOptions(): AdminFilterSelectOption[] {
    return this.members
      .filter(
        (member) =>
          member.user_email !== this.viewerEmail && member.role !== 'owner',
      )
      .map((member) => ({
        value: member.user_email,
        label: member.name || member.user_email,
      }));
  }

  onTransferEmailChange(email: string): void {
    if (!email) {
      this.transferEmail = '';
      this.cdr.markForCheck();
      return;
    }
    this.pendingTransferEmail = email;
    this.transferEmail = '';
    this.cdr.markForCheck();
  }

  cancelTransfer(): void {
    this.pendingTransferEmail = null;
    this.transferEmail = '';
    this.cdr.markForCheck();
  }

  async confirmTransfer(): Promise<void> {
    const email = this.pendingTransferEmail;
    this.pendingTransferEmail = null;
    if (!this.membersTarget || !email) return;
    try {
      await this.groupsApi.transfer(this.membersTarget.id, email);
      this.transferEmail = '';
      this.membersTarget = { ...this.membersTarget, role: 'member' };
      this.toast.success('Ownership transferred');
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not transfer ownership');
    } finally {
      this.cdr.markForCheck();
    }
  }

  async deletePrayer(prayerId: string): Promise<void> {
    try {
      await this.groupsApi.deletePrayer(prayerId);
      this.prayerItemReminderService.dropRemindersForPrayer(prayerId, 'group');
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not delete the prayer');
    }
  }

  async addUpdate(event: PrayerCardAddUpdateEvent): Promise<void> {
    try {
      await this.groupsApi.addUpdate({
        prayerId: event.prayer_id,
        content: event.content,
        author: event.author,
        authorEmail: event.author_email,
        markAsAnswered: event.mark_as_answered,
      });
      if (event.mark_as_answered) {
        try {
          await this.groupsApi.setAnswered(event.prayer_id, true);
        } catch {
          this.toast.error('Update saved. Only the author can mark the prayer answered.');
        }
      }
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not add the update');
    }
  }

  async deleteUpdate(event: PrayerCardDeleteUpdateEvent): Promise<void> {
    try {
      await this.groupsApi.deleteUpdate(event.updateId);
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not delete the update');
    }
  }

  openEdit(prayer: PrayerRequest): void {
    this.editingPrayer = prayer;
    this.editPrayerFor = prayer.prayer_for;
    this.editDescription = prayer.description;
    this.cdr.markForCheck();
  }

  async saveEdit(): Promise<void> {
    const prayer = this.editingPrayer;
    const prayerFor = this.editPrayerFor.trim();
    if (!prayer || !prayerFor) return;
    try {
      await this.groupsApi.updatePrayer(prayer.id, prayerFor, this.editDescription);
      this.editingPrayer = null;
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not save the prayer');
    }
  }

  openEditUpdate(event: { update: { id: string; content: string } }): void {
    this.editingUpdate = { id: event.update.id, content: event.update.content };
    this.cdr.markForCheck();
  }

  async saveUpdateEdit(): Promise<void> {
    const update = this.editingUpdate;
    if (!update || !update.content.trim()) return;
    try {
      await this.groupsApi.updateUpdate(update.id, update.content.trim());
      this.editingUpdate = null;
    } catch (err: unknown) {
      this.toast.error(err instanceof Error ? err.message : 'Could not save the update');
    }
  }

  async setAnswered(prayerId: string, answered: boolean): Promise<void> {
    try {
      await this.groupsApi.setAnswered(prayerId, answered);
      if (answered) {
        this.prayerItemReminderService.dropRemindersForPrayer(prayerId, 'group');
      }
    } catch (err: unknown) {
      this.toast.error(
        err instanceof Error ? err.message : 'Only the author can change answered status',
      );
    }
  }

  onPrayedForCountChange(event: { prayerId: string; count: number }): void {
    this.prayers = this.prayers.map((prayer) =>
      prayer.id === event.prayerId
        ? { ...prayer, prayed_for_count: event.count }
        : prayer,
    );
    this.cdr.markForCheck();
  }

  closeMembersModal(): void {
    this.membersTarget = null;
    this.membersModalPostCreate = false;
    this.pendingLeaveGroup = null;
    this.cdr.markForCheck();
  }

  private openMembers(
    group: PrayerGroupSummary,
    options?: { postCreate?: boolean },
  ): void {
    this.membersTarget = group;
    this.membersModalPostCreate = options?.postCreate === true;
    this.emailsDraft = '';
    this.transferEmail = '';
    this.pendingTransferEmail = null;
    this.members =
      this.groupsApi.membersForGroup(group.id) ?? this.fallbackMembersForViewer(group);
    this.cdr.markForCheck();
    void this.loadMembers(group.id);
  }

  private fallbackMembersForViewer(group: PrayerGroupSummary): PrayerGroupMemberRow[] {
    const email = this.viewerEmail.trim().toLowerCase();
    if (!email) return [];
    return [
      {
        user_email: email,
        role: group.role,
        name: this.viewerName.trim() || null,
      },
    ];
  }

  private openRename(group: PrayerGroupSummary): void {
    this.renameTarget = group;
    this.renameDraft = group.name;
    this.cdr.markForCheck();
  }

  private applyPendingGroupDeepLink(): void {
    if (this.selectedId) this.groupsApi.preferredGroupId = this.selectedId;
    const groupId = this.deepLinks.peekPendingGroupId();
    if (!groupId || !this.groups.some((group) => group.id === groupId)) {
      return;
    }
    this.deepLinks.consumePendingGroupId();
    this.selectGroup(groupId);
  }

  private applyPendingGroupPrayerDeepLink(): void {
    const prayerId = this.groupsApi.pendingPrayerDeepLinkId;
    if (!prayerId) {
      return;
    }
    const prayer = this.prayers.find((row) => row.id === prayerId);
    if (!prayer) {
      return;
    }
    this.groupsApi.pendingPrayerDeepLinkId = null;
    this.selectedId = prayer.group_id;
    this.filterMode = 'named';
    this.groupsApi.preferredGroupId = prayer.group_id;
    this.cdr.markForCheck();
  }

  private async loadMembers(groupId: string): Promise<void> {
    const token = ++this.membersLoadToken;
    try {
      const rows = await this.groupsApi.listMembers(groupId);
      if (token !== this.membersLoadToken || this.membersTarget?.id !== groupId) return;
      this.members = rows;
      this.cdr.markForCheck();
    } catch (err: unknown) {
      if (token !== this.membersLoadToken || this.membersTarget?.id !== groupId) return;
      this.toast.error(err instanceof Error ? err.message : 'Could not load members');
      this.cdr.markForCheck();
    }
  }
}
