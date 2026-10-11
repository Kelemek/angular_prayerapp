import { Injectable, OnDestroy } from '@angular/core';
import { merge, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, skip } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';
import { ThemeService } from './theme.service';
import { TextSizeService } from './text-size.service';
import { PresentationSettingsService } from './presentation-settings.service';
import type { ClientPreferences } from '../types/client-preferences';
import { clientPreferencesEqual } from '../types/client-preferences';
import {
  applyClientPreferencesToLocalMirrors,
  buildClientPreferencesFromLocalForPersist,
} from '../lib/client-preferences-local';
import { persistClientPreferencesByEmail } from '../lib/client-preferences-persist';
import {
  isApplyingClientPreferencesFromSession,
  runApplyingClientPreferencesFromSession,
  setClientPreferencesChangeListener,
} from '../lib/client-preferences-notify';
import { clientPreferencesLoadState } from '../lib/client-preferences-load-state';

const PERSIST_DEBOUNCE_MS = 400;

interface PendingPersist {
  email: string;
  prefs: ClientPreferences;
}

@Injectable({
  providedIn: 'root',
})
export class ClientPreferencesService implements OnDestroy {
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingPersist: PendingPersist | null = null;
  private lastAppliedPrefs: ClientPreferences | undefined;
  private subs: Subscription[] = [];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly userSession: UserSessionService,
    private readonly themeService: ThemeService,
    private readonly textSizeService: TextSizeService,
    private readonly presentationSettings: PresentationSettingsService
  ) {
    setClientPreferencesChangeListener(() => this.onLocalPreferenceChanged());

    this.subs.push(
      merge(
        this.themeService.theme$.pipe(skip(1), distinctUntilChanged()),
        this.textSizeService.textSize$.pipe(skip(1), distinctUntilChanged()),
        this.presentationSettings.saved$
      )
        .pipe(filter(() => !isApplyingClientPreferencesFromSession()))
        .subscribe(() => this.onLocalPreferenceChanged())
    );

    this.subs.push(
      this.userSession.isLoading$.subscribe((loading) => {
        if (loading) {
          clientPreferencesLoadState.dirtyDuringLoad = false;
        }
      })
    );

    this.subs.push(
      this.userSession.userSession$
        .pipe(
          distinctUntilChanged((prev, curr) => {
            if (prev?.email !== curr?.email) {
              return false;
            }
            if (prev?.clientPreferencesNeedsDbSeed !== curr?.clientPreferencesNeedsDbSeed) {
              return false;
            }
            return clientPreferencesEqual(
              prev?.clientPreferences,
              curr?.clientPreferences
            );
          })
        )
        .subscribe((session) => {
          if (!session?.email) {
            this.lastAppliedPrefs = undefined;
            this.clearPendingPersist();
            return;
          }
          this.handleSessionPreferences(
            session.email,
            session.clientPreferences,
            session.clientPreferencesNeedsDbSeed
          );
        })
    );
  }

  ngOnDestroy(): void {
    setClientPreferencesChangeListener(null);
    this.clearPendingPersist();
    this.subs.forEach((s) => s.unsubscribe());
  }

  private onLocalPreferenceChanged(): void {
    clientPreferencesLoadState.dirtyDuringLoad = true;
    const email = this.userSession.getUserEmail();
    if (!email) {
      return;
    }
    const sessionPrefs = this.userSession.getCurrentSession()?.clientPreferences;
    const prefs = buildClientPreferencesFromLocalForPersist(email, sessionPrefs);
    if (!prefs) {
      return;
    }
    void this.userSession.updateUserSession({ clientPreferences: prefs });
    this.schedulePersist(email, prefs);
  }

  private schedulePersist(email: string, prefs: ClientPreferences): void {
    this.pendingPersist = {
      email: email.toLowerCase().trim(),
      prefs,
    };
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.flushPendingPersist();
    }, PERSIST_DEBOUNCE_MS);
  }

  private clearPendingPersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.pendingPersist = null;
  }

  private async flushPendingPersist(): Promise<void> {
    const pending = this.pendingPersist;
    this.pendingPersist = null;
    if (!pending) {
      return;
    }
    const currentEmail = this.userSession.getUserEmail()?.toLowerCase().trim();
    if (!currentEmail || currentEmail !== pending.email) {
      return;
    }
    try {
      await persistClientPreferencesByEmail(
        this.supabase.client,
        currentEmail,
        pending.prefs
      );
    } catch (err) {
      console.warn('[ClientPreferences] Failed to persist preferences:', err);
    }
  }

  private handleSessionPreferences(
    email: string,
    prefsFromSession: ClientPreferences | undefined,
    needsDbSeed?: boolean
  ): void {
    if (!prefsFromSession) {
      return;
    }
    const prefs = prefsFromSession;

    if (
      clientPreferencesEqual(prefs, this.lastAppliedPrefs) &&
      !needsDbSeed
    ) {
      return;
    }

    if (!clientPreferencesEqual(prefs, this.lastAppliedPrefs)) {
      runApplyingClientPreferencesFromSession(() => {
        applyClientPreferencesToLocalMirrors(prefs);
        if (prefs.theme) {
          this.themeService.setTheme(prefs.theme);
        }
        if (prefs.textSize) {
          this.textSizeService.setTextSize(prefs.textSize);
        }
        if (prefs.presentationSettings) {
          this.presentationSettings.save(prefs.presentationSettings);
        }
        this.lastAppliedPrefs = prefs;
      });
    }

    if (needsDbSeed) {
      void this.persistInitialSeed(email, prefs);
    }
  }

  private async persistInitialSeed(
    email: string,
    prefs: ClientPreferences
  ): Promise<void> {
    const normalized = email.toLowerCase().trim();
    const currentEmail = this.userSession.getUserEmail()?.toLowerCase().trim();
    if (currentEmail !== normalized) {
      return;
    }
    try {
      await persistClientPreferencesByEmail(
        this.supabase.client,
        normalized,
        prefs
      );
      await this.userSession.updateUserSession({
        clientPreferencesNeedsDbSeed: false,
      });
    } catch (err) {
      console.warn('[ClientPreferences] Failed to seed preferences:', err);
    }
  }
}
