import { Injectable } from '@angular/core';
import { merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { BadgeService } from './badge.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

const REPORT_DEBOUNCE_MS = 2000;

type ReportedIconBadge = {
  email: string;
  unread: number;
  badgesEnabled: boolean;
};

function sessionEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase() ?? '';
  return normalized || null;
}

function sameReport(a: ReportedIconBadge, b: ReportedIconBadge): boolean {
  return a.email === b.email && a.unread === b.unread && a.badgesEnabled === b.badgesEnabled;
}

/**
 * Reports the signed-in person's unread total so a later push can set the
 * home-screen icon while this app is closed. Pending approvals stay on the server.
 */
@Injectable({
  providedIn: 'root',
})
export class IconBadgeReportService {
  private started = false;
  private lastReported: ReportedIconBadge | null = null;
  private flight = 0;

  constructor(
    private badgeService: BadgeService,
    private userSessionService: UserSessionService,
    private supabase: SupabaseService,
  ) {}

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    // Null logout must reach distinctUntilChanged. A filter that drops it first
    // would hide re-login with the same email.
    const email$ = this.userSessionService.userSession$.pipe(
      map((session) => sessionEmail(session?.email)),
      distinctUntilChanged(),
    );

    email$.subscribe((email) => {
      if (email) {
        return;
      }
      this.lastReported = null;
      this.flight += 1;
    });

    merge(
      email$,
      this.badgeService.getUpdateBadgesChanged$(),
      this.badgeService.getBadgeFunctionalityEnabled$(),
    )
      .pipe(debounceTime(REPORT_DEBOUNCE_MS))
      .subscribe(() => {
        void this.reportCurrent();
      });
  }

  private async reportCurrent(): Promise<void> {
    const email = sessionEmail(this.userSessionService.getUserEmail());
    if (!email || !this.badgeService.isDisplayedTotalResolved()) {
      return;
    }

    const snapshot: ReportedIconBadge = {
      email,
      unread: this.badgeService.getDisplayedBadgeTotal(),
      badgesEnabled: this.badgeService.isBadgeFunctionalityEnabled(),
    };
    if (this.lastReported && sameReport(this.lastReported, snapshot)) {
      return;
    }

    const flight = ++this.flight;
    try {
      const { error } = await this.supabase.rpc('report_icon_badge_unread', {
        p_user_email: snapshot.email,
        p_unread: snapshot.unread,
        p_badges_enabled: snapshot.badgesEnabled,
      });
      if (flight !== this.flight) {
        return;
      }
      if (sessionEmail(this.userSessionService.getUserEmail()) !== snapshot.email) {
        return;
      }
      if (error) {
        console.warn('[IconBadgeReport] Failed to report icon badge:', error);
        return;
      }
      this.lastReported = snapshot;
    } catch (error) {
      console.warn('[IconBadgeReport] Failed to report icon badge:', error);
    }
  }
}
