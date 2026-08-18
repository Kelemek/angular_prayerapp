import type { ChangeDetectorRef, NgZone } from '@angular/core';
import type { ScriptureService } from '../services/scripture.service';
import type { UserSessionService } from '../services/user-session.service';
import type { MemorizationReciteSettingsService } from '../services/memorization-recite-settings.service';

/** Injectable services used by [`MemorizationPracticeSessionFacade`](memorization-practice-session-facade.ts). */
export interface MemorizationPracticeSessionFacadeDeps {
  document: Document;
  cdr: ChangeDetectorRef;
  ngZone: NgZone;
  scripture: ScriptureService;
  userSessionService: UserSessionService;
  reciteSettingsService: MemorizationReciteSettingsService;
}
