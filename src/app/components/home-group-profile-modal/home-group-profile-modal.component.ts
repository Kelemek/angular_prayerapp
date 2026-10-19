import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { LoginRegistrationFormComponent } from '../login-registration-form/login-registration-form.component';
import { PrayerGroupService } from '../../services/prayer-group.service';
import { UserSessionService } from '../../services/user-session.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-home-group-profile-modal',
  standalone: true,
  imports: [LoginRegistrationFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
    <div
      class="fixed inset-0 z-modal-overlay flex items-center justify-center bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-profile-title"
    >
      <div
        class="modal-panel-edge w-full max-w-md rounded-lg bg-white shadow-lg dark:bg-gray-800"
      >
        <div class="modal-chrome-header px-6 py-4">
          <h2
            id="group-profile-title"
            class="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Welcome to your prayer group
          </h2>
        </div>
        <div class="px-6 pb-6">
          <app-login-registration-form
            profileKind="group"
            [firstName]="firstName"
            (firstNameChange)="firstName = $event; cdr.markForCheck()"
            [lastName]="lastName"
            (lastNameChange)="lastName = $event; cdr.markForCheck()"
            [loading]="loading"
            [error]="error"
            (save)="save()"
          />
        </div>
      </div>
    </div>
    }
  `,
})
export class HomeGroupProfileModalComponent {
  @Input() isOpen = false;
  @Output() completed = new EventEmitter<void>();

  firstName = '';
  lastName = '';
  loading = false;
  error = '';

  constructor(
    private readonly groupsApi: PrayerGroupService,
    private readonly userSession: UserSessionService,
    private readonly toast: ToastService,
    readonly cdr: ChangeDetectorRef,
  ) {}

  async save(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      await this.groupsApi.completeMemberProfile(this.firstName, this.lastName);
      const email = await this.userSession.resolveUserEmail();
      if (email) {
        await this.userSession.loadUserSession(email);
      }
      this.firstName = '';
      this.lastName = '';
      this.toast.success('Profile saved');
      this.completed.emit();
    } catch (err: unknown) {
      this.error =
        err instanceof Error ? err.message : 'Could not save your profile';
      this.cdr.markForCheck();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
