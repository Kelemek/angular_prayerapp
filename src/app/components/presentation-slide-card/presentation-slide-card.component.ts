import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import { PrayerCardComponent } from "../prayer-card/prayer-card.component";
import {
  PromptCardComponent,
  type PrayerPrompt,
} from "../prompt-card/prompt-card.component";
import { PersonalPrayerEditModalComponent } from "../personal-prayer-edit-modal/personal-prayer-edit-modal.component";
import { PersonalPrayerUpdateEditModalComponent } from "../personal-prayer-update-edit-modal/personal-prayer-update-edit-modal.component";
import {
  PrayerCardActionsFacade,
  type PrayerCardAddUpdateEvent,
  type PrayerCardDeleteUpdateEvent,
} from "../../services/prayer-card-actions.facade";
import { PrayerAllowancePolicyService } from "../../services/prayer-allowance-policy.service";
import {
  type PrayerRequest,
  type PrayerUpdate,
} from "../../services/prayer.service";
import { PlanningCenterListService } from "../../services/planning-center-list.service";
import { isPersonalPrayerCard } from "../../lib/prayer-card-kind";

@Component({
  selector: "app-presentation-slide-card",
  standalone: true,
  imports: [
    PrayerCardComponent,
    PromptCardComponent,
    PersonalPrayerEditModalComponent,
    PersonalPrayerUpdateEditModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (prayer) {
    <app-prayer-card
      variant="presentation"
      [prayer]="prayer"
      [isAdmin]="cardActions.isAdmin"
      [isPersonal]="isPersonalPrayerCard(prayer)"
      [deletionsAllowed]="allowancePolicy.deletionsAllowed"
      [updatesAllowed]="allowancePolicy.updatesAllowed"
      (delete)="onDeletePrayer()"
      (addUpdate)="onAddUpdate($event)"
      (deleteUpdate)="onDeleteUpdate($event)"
      (requestDeletion)="cardActions.requestDeletion($event)"
      (requestUpdateDeletion)="cardActions.requestUpdateDeletion($event)"
      (editPersonalPrayer)="openEditPersonalPrayer($event)"
      (editPersonalUpdate)="openEditPersonalUpdate($event)"
      (editMemberUpdate)="openEditMemberUpdate($event)"
      (toggleUpdateAnswered)="onToggleMemberUpdateAnswered($event)"
      (prayedForCountChange)="prayerPrayedForCountChange.emit($event)"
      (personalPrayerCategoryChange)="personalPrayerCategoryChange.emit($event)"
    />
    } @else if (prompt) {
    <app-prompt-card
      variant="presentation"
      [prompt]="prompt"
      [isAdmin]="cardActions.isAdmin"
      [showPrayForButton]="showPrayForButton"
      [showPrayingCount]="showPrayingCount"
      [prayerEncouragementEnabled]="prayerEncouragementEnabled"
      (delete)="onDeletePrompt($event)"
      (prayedForCountChange)="promptPrayedForCountChange.emit($event)"
    />
    }

    <app-personal-prayer-edit-modal
      [isOpen]="showEditPersonalPrayer"
      [prayer]="editingPrayer"
      (close)="showEditPersonalPrayer = false"
      (save)="onPersonalPrayerSaved()"
    />

    <app-personal-prayer-update-edit-modal
      [isOpen]="showEditPersonalUpdate"
      [update]="editingUpdate"
      [prayerId]="editingUpdatePrayerId"
      (close)="showEditPersonalUpdate = false"
      (save)="onPersonalUpdateSaved()"
    />

    <app-personal-prayer-update-edit-modal
      [isOpen]="showEditMemberUpdate"
      [update]="editingMemberUpdate"
      [prayerId]="editingMemberUpdatePrayerId"
      [isMemberUpdate]="true"
      [planningCenterListId]="planningCenterListId"
      (close)="showEditMemberUpdate = false"
      (save)="onMemberUpdateSaved()"
    />
  `,
})
export class PresentationSlideCardComponent {
  @Input() prayer: PrayerRequest | null = null;
  @Input() prompt: PrayerPrompt | null = null;
  @Input() showPrayForButton = true;
  @Input() showPrayingCount = true;
  @Input() prayerEncouragementEnabled = true;

  @Output() prayerPrayedForCountChange = new EventEmitter<{
    prayerId: string;
    count: number;
  }>();
  @Output() promptPrayedForCountChange = new EventEmitter<{
    promptId: string;
    count: number;
  }>();
  @Output() personalPrayerCategoryChange = new EventEmitter<{
    prayerId: string;
    category: string | null;
    status: string;
  }>();
  @Output() itemRemoved = new EventEmitter<string>();
  @Output() itemMutated = new EventEmitter<string>();

  showEditPersonalPrayer = false;
  editingPrayer: PrayerRequest | null = null;
  showEditPersonalUpdate = false;
  editingUpdate: PrayerUpdate | null = null;
  editingUpdatePrayerId = "";
  showEditMemberUpdate = false;
  editingMemberUpdate: PrayerUpdate | null = null;
  editingMemberUpdatePrayerId = "";

  constructor(
    readonly cardActions: PrayerCardActionsFacade,
    readonly allowancePolicy: PrayerAllowancePolicyService,
    private planningCenterListService: PlanningCenterListService,
    private cdr: ChangeDetectorRef
  ) {}

  get planningCenterListId(): string | null {
    return this.planningCenterListService.getCurrentListId();
  }

  readonly isPersonalPrayerCard = isPersonalPrayerCard;

  onDeletePrayer(): void {
    void this.deletePrayerAndRemoveSlide();
  }

  private async deletePrayerAndRemoveSlide(): Promise<void> {
    const prayer = this.prayer;
    if (!prayer) {
      return;
    }
    const deleted = await this.cardActions.deleteCardForCard(prayer);
    if (deleted) {
      this.itemRemoved.emit(prayer.id);
    }
  }

  async onAddUpdate(event: PrayerCardAddUpdateEvent): Promise<void> {
    const prayer = this.prayer;
    if (!prayer) {
      return;
    }
    const ok = await this.cardActions.addUpdateForCard(prayer, event);
    if (ok) {
      this.itemMutated.emit(prayer.id);
    }
  }

  async onDeleteUpdate(event: PrayerCardDeleteUpdateEvent): Promise<void> {
    const prayer = this.prayer;
    if (!prayer) {
      return;
    }
    const ok = await this.cardActions.deleteUpdateForCard(prayer, event);
    if (ok) {
      this.itemMutated.emit(prayer.id);
    }
  }

  async onToggleMemberUpdateAnswered(event: {
    updateId: string;
    prayerId: string;
    isAnswered: boolean;
  }): Promise<void> {
    const ok = await this.cardActions.toggleMemberUpdateAnswered(event);
    if (ok) {
      this.itemMutated.emit(event.prayerId);
    }
  }

  async onDeletePrompt(id: string): Promise<void> {
    const deleted = await this.cardActions.deletePrompt(id);
    if (deleted) {
      this.itemRemoved.emit(id);
    }
  }

  openEditPersonalPrayer(prayer: PrayerRequest): void {
    this.editingPrayer = prayer;
    this.showEditPersonalPrayer = true;
    this.cdr.markForCheck();
  }

  openEditPersonalUpdate(event: {
    update: PrayerUpdate;
    prayerId: string;
  }): void {
    this.editingUpdate = event.update;
    this.editingUpdatePrayerId = event.prayerId;
    this.showEditPersonalUpdate = true;
    this.cdr.markForCheck();
  }

  openEditMemberUpdate(event: {
    update: PrayerUpdate;
    prayerId: string;
  }): void {
    this.editingMemberUpdate = event.update;
    this.editingMemberUpdatePrayerId = event.prayerId;
    this.showEditMemberUpdate = true;
    this.cdr.markForCheck();
  }

  onPersonalPrayerSaved(): void {
    const id = this.editingPrayer?.id;
    this.showEditPersonalPrayer = false;
    this.editingPrayer = null;
    if (id) {
      this.itemMutated.emit(id);
    }
  }

  onPersonalUpdateSaved(): void {
    const id = this.editingUpdatePrayerId;
    this.showEditPersonalUpdate = false;
    this.editingUpdate = null;
    this.editingUpdatePrayerId = "";
    if (id) {
      this.itemMutated.emit(id);
    }
  }

  onMemberUpdateSaved(): void {
    const id = this.editingMemberUpdatePrayerId;
    this.showEditMemberUpdate = false;
    this.editingMemberUpdate = null;
    this.editingMemberUpdatePrayerId = "";
    if (id) {
      this.itemMutated.emit(id);
    }
  }
}
