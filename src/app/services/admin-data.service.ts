import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { EMPTY_ADMIN_DATA, type AdminData } from '../types/admin-data';
import type { PrayerRequest, PrayerUpdate } from '../types/prayer';
import { PrayerService } from './prayer.service';
import { AdminDataCommandService } from './admin-data-command.service';
import { AdminDataNotifyService } from './admin-data-notify.service';
import { AdminDataReadService } from './admin-data-read.service';

export type { AdminData } from '../types/admin-data';

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private readonly dataSubject = new BehaviorSubject<AdminData>({ ...EMPTY_ADMIN_DATA });
  public readonly data$: Observable<AdminData> = this.dataSubject.asObservable();
  private isFetching = false;

  constructor(
    private readonly read: AdminDataReadService,
    private readonly command: AdminDataCommandService,
    private readonly notify: AdminDataNotifyService,
    private readonly prayerService: PrayerService,
  ) {}

  async fetchAdminData(silent = false, force = false): Promise<void> {
    if (this.isFetching && !force) {
      return;
    }

    try {
      this.isFetching = true;

      if (!silent) {
        this.dataSubject.next({
          ...this.dataSubject.value,
          loading: true,
          error: null,
        });
      }

      const pending = await this.read.fetchPendingSnapshot();
      this.dataSubject.next({
        ...pending,
        approvedPrayers: [],
        approvedUpdates: [],
        deniedPrayers: [],
        deniedUpdates: [],
        deniedDeletionRequests: [],
        deniedUpdateDeletionRequests: [],
        approvedPrayersCount: 0,
        approvedUpdatesCount: 0,
        deniedPrayersCount: 0,
        deniedUpdatesCount: 0,
        loading: false,
        error: null,
      });

      void this.loadApprovedAndDeniedDataAsync();
    } catch (error: unknown) {
      console.error('Error fetching admin data:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch admin data';
      this.dataSubject.next({
        ...this.dataSubject.value,
        loading: false,
        error: message,
      });
    } finally {
      this.isFetching = false;
    }
  }

  async loadApprovedAndDeniedDataAsync(): Promise<void> {
    try {
      const snapshot = await this.read.fetchApprovedDeniedSnapshot();
      this.dataSubject.next({
        ...this.dataSubject.value,
        ...snapshot,
      });
    } catch (error) {
      console.error('Error fetching approved/denied data:', error);
    }
  }

  async approvePrayer(id: string): Promise<void> {
    await this.command.approvePrayer(id);
    const prayer = await this.command.tryFetchPrayerById(id);
    if (prayer) {
      this.notify.notifyPrayerApproved(prayer);
    }
    await this.refreshAfterMutation();
  }

  async sendApprovedPrayerEmails(id: string): Promise<void> {
    const prayer = await this.command.fetchPrayerById(id);
    this.notify.sendApprovedPrayerBroadcast(prayer);
  }

  async denyPrayer(id: string, reason: string): Promise<void> {
    const prayer = await this.command.denyPrayer(id, reason);
    this.notify.notifyPrayerDenied(prayer, reason);
    await this.refreshAfterMutation();
  }

  async editPrayer(id: string, updates: Partial<PrayerRequest>): Promise<void> {
    await this.command.editPrayer(id, updates);
    await this.refreshAfterMutation();
  }

  async sendBroadcastNotificationForNewPrayer(id: string): Promise<void> {
    const prayer = await this.command.fetchPrayerById(id);
    this.notify.sendNewPrayerBroadcast(prayer);
  }

  async approveUpdate(id: string): Promise<void> {
    const update = await this.command.approveUpdate(id);
    if (update) {
      this.notify.notifyUpdateApproved(update);
    }
    await this.refreshAfterMutation();
  }

  async sendApprovedUpdateEmails(id: string): Promise<void> {
    const update = await this.command.fetchUpdateForBroadcast(id);
    this.notify.sendApprovedUpdateBroadcast(update);
  }

  async denyUpdate(id: string, reason: string): Promise<void> {
    const update = await this.command.denyUpdate(id, reason);
    this.notify.notifyUpdateDenied(update, reason);
    await this.refreshAfterMutation();
  }

  async editUpdate(id: string, updates: Partial<PrayerUpdate>): Promise<void> {
    await this.command.editUpdate(id, updates);
    await this.refreshAfterMutation(false);
  }

  async sendBroadcastNotificationForNewUpdate(id: string): Promise<void> {
    const update = await this.command.fetchUpdateForBroadcast(id);
    const appliedStatus = await this.command.applyPrayerStatusForBroadcast(update);
    const subscriberStatus = this.notify.subscriberPrayerStatusForUpdate(update, appliedStatus);
    this.notify.sendNewUpdateBroadcast(update, subscriberStatus);
  }

  async approveDeletionRequest(id: string): Promise<void> {
    await this.command.approveDeletionRequest(id);
    await this.refreshAfterMutation();
  }

  async denyDeletionRequest(id: string, reason: string): Promise<void> {
    await this.command.denyDeletionRequest(id, reason);
    await this.refreshAfterMutation();
  }

  async approveUpdateDeletionRequest(id: string): Promise<void> {
    await this.command.approveUpdateDeletionRequest(id);
    await this.refreshAfterMutation();
  }

  async denyUpdateDeletionRequest(id: string, reason: string): Promise<void> {
    await this.command.denyUpdateDeletionRequest(id, reason);
    await this.refreshAfterMutation();
  }

  async approveAccountRequest(id: string): Promise<void> {
    const request = await this.command.approveAccountRequest(id);
    await this.notify.notifyAccountApproved(request);
    await this.fetchAdminData(true, true);
  }

  async denyAccountRequest(id: string, reason: string): Promise<void> {
    const request = await this.command.denyAccountRequest(id);
    await this.notify.notifyAccountDenied(request);
    await this.fetchAdminData(true, true);
  }

  silentRefresh(): void {
    void this.fetchAdminData(true);
  }

  refresh(): void {
    void this.fetchAdminData(false);
  }

  async sendSubscriberWelcomeEmail(email: string): Promise<void> {
    try {
      await this.notify.sendSubscriberWelcomeEmail(email);
    } catch (error) {
      console.error('Error sending subscriber welcome email:', error);
      throw error;
    }
  }

  private async refreshAfterMutation(force = true): Promise<void> {
    await this.fetchAdminData(true, force);
    await this.prayerService.loadPrayers();
  }
}
