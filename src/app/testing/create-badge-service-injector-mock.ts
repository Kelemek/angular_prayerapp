import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import {
  getBadgeReadPrayersData,
  getBadgeReadPromptsData,
  setBadgeReadPrayersData,
  setBadgeReadPromptsData,
} from '../lib/badge-read-storage';
import { BadgeReadStateService } from '../services/badge-read-state.service';

export function createBadgeServiceInjectorMock(mockUserSessionService: {
  userSession$: unknown;
  getUserEmail?: () => string | null;
}) {
  const syncedEmailSubject = new BehaviorSubject<string | null>('test@example.com');
  const mockBadgeReadStateService = {
    syncedEmail$: syncedEmailSubject.asObservable(),
    syncForCurrentUser: vi.fn().mockResolvedValue(undefined),
    schedulePersist: vi.fn(),
    isSyncedForEmail: vi.fn().mockReturnValue(true),
    isReadyForReads: vi.fn().mockReturnValue(true),
    getReadPrayersData: vi.fn(() => getBadgeReadPrayersData()),
    getReadPromptsData: vi.fn(() => getBadgeReadPromptsData()),
    setReadPrayersData: vi.fn((data: ReturnType<typeof getBadgeReadPrayersData>) => {
      setBadgeReadPrayersData(data);
    }),
    setReadPromptsData: vi.fn((data: ReturnType<typeof getBadgeReadPromptsData>) => {
      setBadgeReadPromptsData(data);
    }),
    flushBeforeLogout: vi.fn().mockResolvedValue(undefined),
    invalidateForEmail: vi.fn(),
  };
  const mockInjector = {
    get: vi.fn((ServiceClass: unknown) => {
      if (ServiceClass === BadgeReadStateService) {
        return mockBadgeReadStateService;
      }
      return mockUserSessionService;
    }),
  };
  return { mockInjector, mockBadgeReadStateService, syncedEmailSubject };
}
