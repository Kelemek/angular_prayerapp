import type { Observable } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import type { PresentationSettings } from '../types/presentation';
import { presentationSettingsEqual } from '../types/presentation';
import type { UserSessionData } from '../services/user-session.service';
import type { PresentationSettingsPageState } from '../services/presentation-settings.coordinator';
import { applyRemotePresentationSettingsToPage } from './presentation-remote-client-prefs';

export interface PresentationClientPreferencesSyncOptions {
  userSession$: Observable<UserSessionData | null>;
  destroy$: Observable<void>;
  page: PresentationSettingsPageState;
  getHandoffActive: () => boolean;
  getEditedThisVisit: () => boolean;
  markForCheck: () => void;
  snapshotPageSettings: () => PresentationSettings;
  afterRemoteSettingsApplied: () => void | Promise<void>;
}

/** Apply synced Pray page settings from session without overwriting local edits this visit. */
export function wirePresentationClientPreferencesSync(
  options: PresentationClientPreferencesSyncOptions
): void {
  options.userSession$
    .pipe(
      map((session) => session?.clientPreferences?.presentationSettings),
      distinctUntilChanged(presentationSettingsEqual),
      takeUntil(options.destroy$)
    )
    .subscribe((settings) => {
      if (!settings || options.getEditedThisVisit()) {
        return;
      }
      const before = options.snapshotPageSettings();
      applyRemotePresentationSettingsToPage(options.page, settings, {
        handoffActive: options.getHandoffActive(),
      });
      if (!presentationSettingsEqual(before, settings)) {
        void options.afterRemoteSettingsApplied();
      }
      options.markForCheck();
    });
}
