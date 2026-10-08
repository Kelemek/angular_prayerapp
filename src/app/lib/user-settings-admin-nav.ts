import { take } from 'rxjs';
import type { UserSettingsFacade } from './user-settings-facade';

export function runUserSettingsNavigateToAdmin(host: UserSettingsFacade): void {
  host.deps.adminAuthService.isAdmin$.pipe(take(1)).subscribe((isAdmin) => {
    if (isAdmin) {
      void host.deps.router.navigate(['/admin']);
      return;
    }
    showUserSettingsAdminMfaLogin(host);
  });
}

function resolveUserSettingsAdminMfaEmail(host: UserSettingsFacade): string {
  const fromSession = host.getCurrentUserEmail()?.trim();
  if (fromSession) {
    return fromSession;
  }
  const mfaEmail = localStorage.getItem('mfa_authenticated_email')?.trim();
  if (mfaEmail) {
    return mfaEmail;
  }
  return localStorage.getItem('approvalAdminEmail')?.trim() ?? '';
}

function showUserSettingsAdminMfaLogin(host: UserSettingsFacade): void {
  const userEmail = resolveUserSettingsAdminMfaEmail(host);

  if (!userEmail) {
    host.deps.toastService.error('Email not found. Please log in again.');
    return;
  }

  void host.deps.router.navigate(['/login'], {
    queryParams: {
      email: userEmail,
      sessionExpired: true,
    },
  });
}
