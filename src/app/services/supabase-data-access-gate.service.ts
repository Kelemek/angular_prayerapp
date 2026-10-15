import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  race,
  timer,
} from 'rxjs';
import {
  hasSupabaseJwtSession,
  supabaseDataAccessReady,
} from '../../lib/supabase-jwt-readiness';
import { SupabaseService } from './supabase.service';

const DATA_ACCESS_WAIT_MS = 20_000;

export type DataAccessWaitTimeoutHandler = () => Promise<void>;

/**
 * Tracks whether signed-in users have a Supabase JWT before PostgREST reads (RLS Phase 2).
 * Logged-out callers are always "ready" without waiting.
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseDataAccessGateService {
  private readonly readySubject = new BehaviorSubject<boolean>(false);
  private userAuthenticated = false;
  private timeoutHandler: DataAccessWaitTimeoutHandler | null = null;
  private authenticatedSubscription: Subscription | null = null;

  readonly ready$: Observable<boolean> = this.readySubject.asObservable();

  constructor(private readonly supabase: SupabaseService) {}

  get isReady(): boolean {
    return this.readySubject.value;
  }

  /** AdminAuth registers logout-on-timeout once at startup. */
  registerTimeoutHandler(handler: DataAccessWaitTimeoutHandler): void {
    this.timeoutHandler = handler;
  }

  /** Single subscription — AdminAuth shell changes drive JWT readiness without per-call sync. */
  bindAuthenticatedStream(isAuthenticated$: Observable<boolean>): void {
    this.authenticatedSubscription?.unsubscribe();
    this.authenticatedSubscription = isAuthenticated$
      .pipe(distinctUntilChanged())
      .subscribe((isAuthenticated) => {
        this.userAuthenticated = isAuthenticated;
        void this.refresh();
      });
  }

  /** Imperative refresh after JWT link without an auth boolean change. */
  async syncAuthenticated(isAuthenticated: boolean): Promise<void> {
    this.userAuthenticated = isAuthenticated;
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const hasJwt = await hasSupabaseJwtSession(this.supabase.client);
    const ready = supabaseDataAccessReady(this.userAuthenticated, hasJwt);
    this.readySubject.next(ready);
  }

  async waitForReady(): Promise<void> {
    if (this.readySubject.value) {
      return;
    }
    const outcome = await firstValueFrom(
      race(
        this.ready$.pipe(
          filter((ready) => ready),
          map(() => 'ready' as const)
        ),
        timer(DATA_ACCESS_WAIT_MS).pipe(map(() => 'timeout' as const))
      )
    );
    if (
      outcome === 'timeout' &&
      this.userAuthenticated &&
      !this.readySubject.value &&
      this.timeoutHandler
    ) {
      await this.timeoutHandler();
    }
  }
}
