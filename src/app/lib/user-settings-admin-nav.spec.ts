import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { runUserSettingsNavigateToAdmin } from './user-settings-admin-nav';
import type { UserSettingsFacade } from './user-settings-facade';

function createHost(overrides: {
  isAdmin?: boolean;
  currentUserEmail?: string;
}): UserSettingsFacade {
  const navigate = vi.fn();
  const error = vi.fn();
  return {
    getCurrentUserEmail: vi.fn(() => overrides.currentUserEmail ?? ''),
    deps: {
      adminAuthService: {
        isAdmin$: of(overrides.isAdmin ?? false),
      },
      router: { navigate },
      toastService: { error },
    },
  } as unknown as UserSettingsFacade;
}

describe('runUserSettingsNavigateToAdmin', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('navigates to admin when isAdmin is true', () => {
    const host = createHost({ isAdmin: true });
    runUserSettingsNavigateToAdmin(host);
    expect(host.deps.router.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('uses getCurrentUserEmail for MFA login when admin session expired', () => {
    localStorage.setItem('prayerapp_user_email', 'stale@example.com');
    const host = createHost({
      isAdmin: false,
      currentUserEmail: 'session@example.com',
    });
    runUserSettingsNavigateToAdmin(host);
    expect(host.deps.router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: {
        email: 'session@example.com',
        sessionExpired: true,
      },
    });
  });

  it('falls back to mfa_authenticated_email when getCurrentUserEmail is empty', () => {
    localStorage.setItem('mfa_authenticated_email', 'mfa@example.com');
    const host = createHost({ isAdmin: false, currentUserEmail: '' });
    runUserSettingsNavigateToAdmin(host);
    expect(host.deps.router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: {
        email: 'mfa@example.com',
        sessionExpired: true,
      },
    });
  });

  it('shows toast when no email can be resolved', () => {
    const host = createHost({ isAdmin: false, currentUserEmail: '' });
    runUserSettingsNavigateToAdmin(host);
    expect(host.deps.toastService.error).toHaveBeenCalledWith(
      'Email not found. Please log in again.'
    );
    expect(host.deps.router.navigate).not.toHaveBeenCalled();
  });
});
