import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { TextSizeService } from '../../services/text-size.service';
import { SupabaseService } from '../../services/supabase.service';
import { PrintService } from '../../services/print.service';
import { PrayerService } from '../../services/prayer.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { GitHubFeedbackService } from '../../services/github-feedback.service';
import { UserSessionService } from '../../services/user-session.service';
import { BadgeService } from '../../services/badge.service';
import { PrayerEncouragementService } from '../../services/prayer-encouragement.service';
import { CapacitorService } from '../../services/capacitor.service';
import { UserSettingsFacade } from '../../lib/user-settings-facade';
import { UserSettingsPanelComponent } from '../user-settings-panel/user-settings-panel.component';
import { UserSettingsDeleteAccountDialogComponent } from '../user-settings-delete-account-dialog/user-settings-delete-account-dialog.component';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [UserSettingsPanelComponent, UserSettingsDeleteAccountDialogComponent],
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsComponent
  extends UserSettingsFacade
  implements OnInit, OnDestroy, OnChanges
{
  @Input() override isOpen = false;
  @Input() override scrollToSectionId: string | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() scrollToSectionComplete = new EventEmitter<void>();

  constructor(
    themeService: ThemeService,
    textSizeService: TextSizeService,
    printService: PrintService,
    supabase: SupabaseService,
    prayerService: PrayerService,
    emailNotification: EmailNotificationService,
    adminAuthService: AdminAuthService,
    githubFeedbackService: GitHubFeedbackService,
    badgeService: BadgeService,
    userSessionService: UserSessionService,
    capacitorService: CapacitorService,
    prayerEncouragementService: PrayerEncouragementService,
    cdr: ChangeDetectorRef,
  ) {
    const scrollCallbacks = {
      emitScrollToSectionComplete: () => {},
    };
    super({
      themeService,
      textSizeService,
      printService,
      supabase,
      prayerService,
      emailNotification,
      adminAuthService,
      githubFeedbackService,
      badgeService,
      userSessionService,
      capacitorService,
      prayerEncouragementService,
      cdr,
      markForCheck: () => cdr.markForCheck(),
      emitScrollToSectionComplete: () =>
        scrollCallbacks.emitScrollToSectionComplete(),
    });
    scrollCallbacks.emitScrollToSectionComplete = () =>
      this.scrollToSectionComplete.emit();
  }

  ngOnInit(): void {
    this.initUserSettings();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.applyUserSettingsChanges(changes);
  }

  ngOnDestroy(): void {
    this.destroyUserSettings();
  }
}
