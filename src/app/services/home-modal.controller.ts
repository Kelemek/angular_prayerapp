import { Injectable } from "@angular/core";
import type { PrayerRequest, PrayerUpdate } from "./prayer.service";
import type { AdminAuthService } from "./admin-auth.service";

export interface HomeModalHost {
  markForCheck(): void;
}

@Injectable()
export class HomeModalController {
  showPrayerForm = false;
  showSettings = false;
  settingsScrollToSectionId: string | null = null;
  showHelp = false;
  showLogoutConfirmation = false;
  showEditPersonalPrayer = false;
  editingPrayer: PrayerRequest | null = null;
  showEditPersonalUpdate = false;
  editingUpdate: PrayerUpdate | null = null;
  editingUpdatePrayerId = "";
  showEditMemberUpdate = false;
  editingMemberUpdate: PrayerUpdate | null = null;
  editingMemberUpdatePrayerId = "";

  private host: HomeModalHost | null = null;
  private adminAuthService: AdminAuthService | null = null;
  private reloadMemberPrayerUpdates: ((personId: string) => void) | null = null;

  bindHost(
    host: HomeModalHost,
    deps: {
      adminAuthService: AdminAuthService;
      reloadMemberPrayerUpdates: (personId: string) => void;
    }
  ): void {
    this.host = host;
    this.adminAuthService = deps.adminAuthService;
    this.reloadMemberPrayerUpdates = deps.reloadMemberPrayerUpdates;
  }

  onPrayerFormClose(): void {
    this.showPrayerForm = false;
    this.requireHost().markForCheck();
  }

  openUserSettings(scrollToSectionId: string | null = null): void {
    this.settingsScrollToSectionId = scrollToSectionId;
    this.showSettings = true;
    this.requireHost().markForCheck();
  }

  openSettingsFromReciteFeedback(): void {
    this.openUserSettings("tour-settings-feedback-section");
  }

  closeUserSettings(): void {
    this.showSettings = false;
    this.settingsScrollToSectionId = null;
    this.requireHost().markForCheck();
  }

  onSettingsScrollToSectionComplete(): void {
    this.settingsScrollToSectionId = null;
    this.requireHost().markForCheck();
  }

  async handleLogout(): Promise<void> {
    this.showLogoutConfirmation = false;
    await this.requireAdminAuthService().logout();
    this.requireHost().markForCheck();
  }

  openEditModal(prayer: PrayerRequest): void {
    this.editingPrayer = prayer;
    this.showEditPersonalPrayer = true;
    this.requireHost().markForCheck();
  }

  onPersonalPrayerSaved(): void {
    this.showEditPersonalPrayer = false;
    this.editingPrayer = null;
    this.requireHost().markForCheck();
  }

  openEditUpdateModal(event: { update: PrayerUpdate; prayerId: string }): void {
    this.editingUpdate = event.update;
    this.editingUpdatePrayerId = event.prayerId;
    this.showEditPersonalUpdate = true;
    this.requireHost().markForCheck();
  }

  onPersonalUpdateSaved(): void {
    this.showEditPersonalUpdate = false;
    this.editingUpdate = null;
    this.editingUpdatePrayerId = "";
    this.requireHost().markForCheck();
  }

  openEditMemberUpdateModal(event: {
    update: PrayerUpdate;
    prayerId: string;
  }): void {
    this.editingMemberUpdate = event.update;
    this.editingMemberUpdatePrayerId = event.prayerId;
    this.showEditMemberUpdate = true;
    this.requireHost().markForCheck();
  }

  onMemberUpdateSaved(): void {
    this.showEditMemberUpdate = false;
    const personId = this.editingMemberUpdatePrayerId.substring(
      "pc-member-".length
    );
    this.editingMemberUpdate = null;
    this.editingMemberUpdatePrayerId = "";
    this.requireHost().markForCheck();
    setTimeout(() => this.reloadMemberPrayerUpdates?.(personId), 100);
  }

  private requireHost(): HomeModalHost {
    if (!this.host) {
      throw new Error("HomeModalController host is not bound");
    }
    return this.host;
  }

  private requireAdminAuthService(): AdminAuthService {
    if (!this.adminAuthService) {
      throw new Error("HomeModalController adminAuthService is not bound");
    }
    return this.adminAuthService;
  }
}
