/** Header toolbar actions wired from Home. */
export interface HomeHeaderHandlers {
  openLogoutConfirmation(): void;
  openHelp(): void;
  toggleSearchPanel(): void;
  openUserSettings(): void;
  openPrayerForm(): void;
  navigateToAdmin(): void;
  onPresentationLinkClick(event: MouseEvent): void;
}
