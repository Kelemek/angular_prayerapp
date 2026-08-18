import type { SimpleChanges } from '@angular/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { TextSize } from '../services/text-size.service';
import {
  closeUserSettingsDeleteAccountVerification,
  runUserSettingsDeleteAccountAndPrayers,
  runUserSettingsDeleteAccountKeepPrayers,
  runUserSettingsLogout,
} from './user-settings-account-run';
import { runUserSettingsOpenChange } from './user-settings-facade-open';
import { runUserSettingsGitHubFeedbackLoad } from './user-settings-github-fetch';
import {
  runUserSettingsHandlePrint,
  runUserSettingsHandlePrintPersonalPrayers,
  runUserSettingsHandlePrintPrompts,
  runUserSettingsLoadPersonalCategories,
  runUserSettingsLoadPromptTypes,
  toggleUserSettingsPersonalCategory,
  toggleUserSettingsPromptType,
} from './user-settings-print';
import {
  runUserSettingsBadgeFunctionalityToggle,
  runUserSettingsDefaultViewChange,
  runUserSettingsMemorizationStrictModeToggle,
  runUserSettingsNotificationToggle,
  runUserSettingsPersonalPrayerCooldownSave,
  runUserSettingsPushNotificationToggle,
  runUserSettingsShowPrayForButtonToggle,
  runUserSettingsShowPrayingCountToggle,
} from './user-settings-preference-toggle-run';
import { markUserSettingsAllItemsAsRead } from './user-settings-badge-mark-read';
import { runUserSettingsPreferencesLoad } from './user-settings-preferences-load';
import {
  USER_SETTINGS_PRINT_RANGE_OPTIONS,
  USER_SETTINGS_THEME_OPTIONS,
  type PrintRange,
  type ThemeOption,
} from './user-settings-types';
import {
  getUserSettingsDisplayName,
  getUserSettingsUserInfo,
} from './user-settings-user-info';
import type { UserSettingsFacadeDeps } from './user-settings-facade-host';

export class UserSettingsFacade {
  isOpen = false;
  scrollToSectionId: string | null = null;

  name = '';
  email = '';
  receiveNotifications: boolean | null = null;
  receivePushNotifications: boolean | null = null;
  badgeFunctionalityEnabled: boolean | null = null;
  showPrayForButton: boolean | null = null;
  showPrayingCount: boolean | null = null;
  personalPrayerCooldownHours = 4;
  personalPrayerCooldownEdited = false;
  theme: ThemeOption = 'system';
  textSize: TextSize = 'normal';
  saving = false;
  savingNotification = false;
  savingPushNotification = false;
  savingBadge = false;
  savingShowPrayForButton = false;
  savingShowPrayingCount = false;
  savingPersonalPrayerCooldown = false;
  successPushNotification: string | null = null;
  savingDefaultView = false;
  error: string | null = null;
  success: string | null = null;
  successNotification: string | null = null;
  successBadge: string | null = null;
  successPrayerEncouragementUi: string | null = null;
  successDefaultView: string | null = null;
  successMemorizationStrictMode: string | null = null;
  preferencesLoaded = false;
  badgePreferencesLoaded = false;
  prayerEncouragementUiLoaded = false;
  defaultViewPreferencesLoaded = false;
  memorizationStrictModeLoaded = false;
  defaultPrayerView: 'current' | 'personal' | null = null;
  memorizationStrictMode = false;
  savingMemorizationStrictMode = false;

  isPrinting = false;
  isPrintingPrompts = false;
  isPrintingPersonal = false;
  printRange: PrintRange = 'week';
  showPrintDropdown = false;
  showPromptTypesDropdown = false;
  showPrintPersonalDropdown = false;
  promptTypes: string[] = [];
  selectedPromptTypes: string[] = [];
  personalCategories: string[] = [];
  selectedPersonalCategories: string[] = [];
  githubFeedbackEnabled = false;
  showDeleteAccountVerification = false;
  deletingAccount = false;

  readonly destroy$ = new Subject<void>();
  readonly emailChange$ = new Subject<string>();
  isInitialLoad = false;
  scrollToSectionTimer: ReturnType<typeof setTimeout> | null = null;

  readonly themeOptions = USER_SETTINGS_THEME_OPTIONS;
  readonly printRangeOptions = USER_SETTINGS_PRINT_RANGE_OPTIONS;

  constructor(public readonly deps: UserSettingsFacadeDeps) {}

  get prayerEncouragementEnabled$() {
    return this.deps.prayerEncouragementService.getPrayerEncouragementEnabled$();
  }

  get userSessionService() {
    return this.deps.userSessionService;
  }

  get capacitorService() {
    return this.deps.capacitorService;
  }

  get badgeService() {
    return this.deps.badgeService;
  }

  markForCheck(): void {
    this.deps.markForCheck();
  }

  initUserSettings(): void {
    this.theme = this.deps.themeService.getTheme() as ThemeOption;
    this.textSize = this.deps.textSizeService.getTextSize();

    const userInfo = getUserSettingsUserInfo();
    if (userInfo.firstName && userInfo.lastName) {
      this.name = `${userInfo.firstName} ${userInfo.lastName}`;
    }
    this.email = userInfo.email;

    void runUserSettingsGitHubFeedbackLoad(this);

    this.emailChange$
      .pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged())
      .subscribe((email) => {
        if (!this.isInitialLoad) {
          void this.loadPreferencesAutomatically(email);
        }
      });

    this.deps.userSessionService
      .getPersonalPrayerCooldownHours$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((hours: number) => {
        if (!this.personalPrayerCooldownEdited) {
          this.personalPrayerCooldownHours = hours;
          this.markForCheck();
        }
      });
  }

  applyUserSettingsChanges(changes: SimpleChanges): void {
    runUserSettingsOpenChange(this, changes);
  }

  destroyUserSettings(): void {
    if (this.scrollToSectionTimer) {
      clearTimeout(this.scrollToSectionTimer);
      this.scrollToSectionTimer = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  handleThemeChange(newTheme: ThemeOption): void {
    this.theme = newTheme;
    this.deps.themeService.setTheme(newTheme);
  }

  handleTextSizeChange(size: TextSize): void {
    this.textSize = size;
    this.deps.textSizeService.setTextSize(size);
  }

  setPrintRange(range: PrintRange): void {
    this.printRange = range;
  }

  handlePrint(): Promise<void> {
    return runUserSettingsHandlePrint(this);
  }

  handlePrintPrompts(): Promise<void> {
    return runUserSettingsHandlePrintPrompts(this);
  }

  handlePrintPersonalPrayers(): Promise<void> {
    return runUserSettingsHandlePrintPersonalPrayers(this);
  }

  togglePromptType(type: string): void {
    toggleUserSettingsPromptType(this, type);
  }

  togglePersonalCategory(category: string): void {
    toggleUserSettingsPersonalCategory(this, category);
  }

  loadPromptTypes(): Promise<void> {
    return runUserSettingsLoadPromptTypes(this);
  }

  loadPersonalCategories(): Promise<void> {
    return runUserSettingsLoadPersonalCategories(this);
  }

  getUserInfo(): {
    firstName: string;
    lastName: string;
    email: string;
  } {
    return getUserSettingsUserInfo();
  }

  markAllItemsAsRead(): void {
    markUserSettingsAllItemsAsRead(this.deps.badgeService);
  }

  /** @internal Used by specs and preference-load runner */
  async loadPreferencesAutomatically(emailAddress: string): Promise<void> {
    return runUserSettingsPreferencesLoad(this, emailAddress);
  }

  /** @internal Used by specs */
  async loadGitHubFeedbackStatus(): Promise<void> {
    return runUserSettingsGitHubFeedbackLoad(this);
  }

  onEmailChange(): void {
    this.emailChange$.next(this.email);
  }

  setReceiveNotifications(enabled: boolean): void {
    if (
      !this.preferencesLoaded ||
      this.savingNotification ||
      this.receiveNotifications === enabled
    ) {
      return;
    }
    this.receiveNotifications = enabled;
    void this.onNotificationToggle();
  }

  setReceivePushNotifications(enabled: boolean): void {
    if (
      !this.preferencesLoaded ||
      this.savingPushNotification ||
      this.receivePushNotifications === enabled
    ) {
      return;
    }
    this.receivePushNotifications = enabled;
    void this.onPushNotificationToggle();
  }

  setBadgeFunctionalityEnabled(enabled: boolean): void {
    if (
      !this.badgePreferencesLoaded ||
      this.savingBadge ||
      this.badgeFunctionalityEnabled === enabled
    ) {
      return;
    }
    this.badgeFunctionalityEnabled = enabled;
    void this.onBadgeFunctionalityToggle();
  }

  setMemorizationStrictMode(enabled: boolean): void {
    if (
      !this.memorizationStrictModeLoaded ||
      this.savingMemorizationStrictMode ||
      this.memorizationStrictMode === enabled
    ) {
      return;
    }
    this.memorizationStrictMode = enabled;
    void this.onMemorizationStrictModeToggle();
  }

  setShowPrayForButton(enabled: boolean): void {
    if (
      !this.prayerEncouragementUiLoaded ||
      this.savingShowPrayForButton ||
      this.savingShowPrayingCount ||
      this.showPrayForButton === enabled
    ) {
      return;
    }
    this.showPrayForButton = enabled;
    void this.onShowPrayForButtonToggle();
  }

  setShowPrayingCount(enabled: boolean): void {
    if (
      !this.prayerEncouragementUiLoaded ||
      this.savingShowPrayForButton ||
      this.savingShowPrayingCount ||
      this.showPrayingCount === enabled
    ) {
      return;
    }
    this.showPrayingCount = enabled;
    void this.onShowPrayingCountToggle();
  }

  selectDefaultPrayerView(view: 'current' | 'personal'): void {
    if (
      !this.defaultViewPreferencesLoaded ||
      this.savingDefaultView ||
      this.defaultPrayerView === view
    ) {
      return;
    }
    this.defaultPrayerView = view;
    void this.onDefaultViewChange(view);
  }

  onNotificationToggle(): Promise<void> {
    return runUserSettingsNotificationToggle(this);
  }

  onPushNotificationToggle(): Promise<void> {
    return runUserSettingsPushNotificationToggle(this);
  }

  onBadgeFunctionalityToggle(): Promise<void> {
    return runUserSettingsBadgeFunctionalityToggle(this);
  }

  onMemorizationStrictModeToggle(): Promise<void> {
    return runUserSettingsMemorizationStrictModeToggle(this);
  }

  onShowPrayForButtonToggle(): Promise<void> {
    return runUserSettingsShowPrayForButtonToggle(this);
  }

  onShowPrayingCountToggle(): Promise<void> {
    return runUserSettingsShowPrayingCountToggle(this);
  }

  savePersonalPrayerCooldownHours(): Promise<void> {
    return runUserSettingsPersonalPrayerCooldownSave(this);
  }

  onDefaultViewChange(newView: 'current' | 'personal'): Promise<void> {
    return runUserSettingsDefaultViewChange(this, newView);
  }

  getCurrentUserEmail(): string {
    const userInfo = getUserSettingsUserInfo();
    return userInfo.email || this.email || '';
  }

  getCurrentUserName(): string {
    return getUserSettingsDisplayName(this.name, getUserSettingsUserInfo());
  }

  logout(): Promise<void> {
    return runUserSettingsLogout(this);
  }

  closeDeleteAccountVerification(): void {
    closeUserSettingsDeleteAccountVerification(this);
  }

  deleteAccountKeepPrayers(): Promise<void> {
    return runUserSettingsDeleteAccountKeepPrayers(this);
  }

  deleteAccountAndPrayers(): Promise<void> {
    return runUserSettingsDeleteAccountAndPrayers(this);
  }
}
