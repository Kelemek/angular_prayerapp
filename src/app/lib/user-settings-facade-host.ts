import type { ChangeDetectorRef } from '@angular/core';
import type { ThemeService } from '../services/theme.service';
import type { TextSizeService } from '../services/text-size.service';
import type { SupabaseService } from '../services/supabase.service';
import type { PrintService } from '../services/print.service';
import type { PrayerService } from '../services/prayer.service';
import type { EmailNotificationService } from '../services/email-notification.service';
import type { AdminAuthService } from '../services/admin-auth.service';
import type { GitHubFeedbackService } from '../services/github-feedback.service';
import type { UserSessionService } from '../services/user-session.service';
import type { BadgeService } from '../services/badge.service';
import type { PrayerEncouragementService } from '../services/prayer-encouragement.service';
import type { CapacitorService } from '../services/capacitor.service';

export interface UserSettingsFacadeDeps {
  themeService: ThemeService;
  textSizeService: TextSizeService;
  printService: PrintService;
  supabase: SupabaseService;
  prayerService: PrayerService;
  emailNotification: EmailNotificationService;
  adminAuthService: AdminAuthService;
  githubFeedbackService: GitHubFeedbackService;
  badgeService: BadgeService;
  userSessionService: UserSessionService;
  capacitorService: CapacitorService;
  prayerEncouragementService: PrayerEncouragementService;
  cdr: ChangeDetectorRef;
  markForCheck: () => void;
  emitScrollToSectionComplete?: () => void;
}
