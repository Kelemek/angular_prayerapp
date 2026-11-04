import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { extractSupabaseErrorMessage } from '../../lib/prayer-error-message';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import {
  activeOwnerCount,
  canChangeOtherOwner,
  canGrantGroupOwnership,
  normalizeGroupEmail,
} from '../../lib/prayer-group-owners';
import {
  PrayerGroupMemberRow,
  PrayerGroupService,
  PrayerGroupSummary,
} from '../../services/prayer-group.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-home-group-owner-controls',
  standalone: true,
  imports: [ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-group-owner-controls.component.html',
  host: { class: 'block' },
})
export class HomeGroupOwnerControlsComponent {
  @Input({ required: true }) group!: PrayerGroupSummary;
  @Input() members: PrayerGroupMemberRow[] = [];
  @Input() viewerEmail = '';
  @Input() submitting = false;
  @Input() reloadMembers: (
    groupId: string,
  ) => Promise<readonly PrayerGroupMemberRow[] | null> = async () => null;

  @Output() submittingChange = new EventEmitter<boolean>();

  ownerPick: string[] = [];
  pendingDemoteEmail: string | null = null;
  private alive = true;

  constructor(
    private readonly groupsApi: PrayerGroupService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
    destroyRef: DestroyRef,
  ) {
    destroyRef.onDestroy(() => {
      this.alive = false;
    });
  }

  get demoteConfirmMessage(): string {
    const email = this.pendingDemoteEmail ?? '';
    const member = this.members.find((row) => row.user_email === email);
    const label = member?.name || member?.user_email || email;
    return `Make ${label} a member? They stay in the group and lose owner actions.`;
  }

  isOwnerPick(email: string): boolean {
    return this.ownerPick.includes(email);
  }

  toggleOwnerPick(email: string, event: Event): void {
    if (!canGrantGroupOwnership(this.group.role)) return;
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    this.ownerPick = checked
      ? [...this.ownerPick, email]
      : this.ownerPick.filter((picked) => picked !== email);
    this.cdr.markForCheck();
  }

  showOwnerPick(member: PrayerGroupMemberRow): boolean {
    return canGrantGroupOwnership(this.group.role) && member.role !== 'owner';
  }

  showOtherOwnerActions(member: PrayerGroupMemberRow): boolean {
    return canChangeOtherOwner({
      viewerRole: this.group.role,
      viewerEmail: this.viewerEmail,
      memberEmail: member.user_email,
      memberRole: member.role,
      owners: activeOwnerCount(this.members.map((row) => row.role)),
    });
  }

  showRemove(member: PrayerGroupMemberRow): boolean {
    if (!canGrantGroupOwnership(this.group.role)) return false;
    if (normalizeGroupEmail(member.user_email) === normalizeGroupEmail(this.viewerEmail)) {
      return false;
    }
    return member.role !== 'owner' || this.showOtherOwnerActions(member);
  }

  async promoteSelected(): Promise<void> {
    if (!canGrantGroupOwnership(this.group.role)) return;
    const groupId = this.group.id;
    const emails = [...this.ownerPick];
    if (emails.length === 0) return;
    this.setSubmitting(true);
    try {
      for (const email of emails) {
        if (!this.sameGroup(groupId)) return;
        await this.groupsApi.setMemberRole(groupId, email, 'owner');
      }
      if (this.sameGroup(groupId)) {
        this.ownerPick = [];
        this.toast.success(emails.length === 1 ? 'They are an owner now' : 'They are owners now');
      }
    } catch (err: unknown) {
      this.toast.error(extractSupabaseErrorMessage(err, 'Could not add that owner'));
    } finally {
      if (this.sameGroup(groupId)) {
        const rows = await this.reloadMembers(groupId);
        if (rows && this.sameGroup(groupId)) {
          const owners = new Set(
            rows.filter((member) => member.role === 'owner').map((member) => member.user_email),
          );
          this.ownerPick = this.ownerPick.filter((email) => !owners.has(email));
        }
      }
      this.setSubmitting(false);
    }
  }

  askDemote(email: string): void {
    if (!canGrantGroupOwnership(this.group.role)) return;
    this.pendingDemoteEmail = email;
    this.cdr.markForCheck();
  }

  cancelDemote(): void {
    this.pendingDemoteEmail = null;
    this.cdr.markForCheck();
  }

  async confirmDemote(): Promise<void> {
    const email = this.pendingDemoteEmail;
    const groupId = this.group.id;
    this.pendingDemoteEmail = null;
    if (!email || !canGrantGroupOwnership(this.group.role)) return;
    try {
      await this.groupsApi.setMemberRole(groupId, email, 'member');
      if (!this.sameGroup(groupId)) return;
      await this.reloadMembers(groupId);
      this.toast.success('They are a member now');
    } catch (err: unknown) {
      this.toast.error(extractSupabaseErrorMessage(err, 'Could not change that role'));
    } finally {
      this.cdr.markForCheck();
    }
  }

  async removeMember(email: string): Promise<void> {
    if (!canGrantGroupOwnership(this.group.role)) return;
    const groupId = this.group.id;
    try {
      await this.groupsApi.removeMember(groupId, email);
      if (!this.sameGroup(groupId)) return;
      this.ownerPick = this.ownerPick.filter((picked) => picked !== email);
      await this.reloadMembers(groupId);
    } catch (err: unknown) {
      this.toast.error(extractSupabaseErrorMessage(err, 'Could not remove that member'));
    }
  }

  private sameGroup(groupId: string): boolean {
    return this.alive && this.group?.id === groupId;
  }

  private setSubmitting(active: boolean): void {
    this.submittingChange.emit(active);
    if (!this.alive) return;
    this.cdr.markForCheck();
  }
}
