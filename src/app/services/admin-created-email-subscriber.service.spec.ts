import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminCreatedEmailSubscriberService } from './admin-created-email-subscriber.service';
import { SupabaseService } from './supabase.service';
import { PlanningCenterRestService } from './planning-center-rest.service';
import * as adminCreatedLib from '../lib/admin-created-email-subscriber';

describe('AdminCreatedEmailSubscriberService', () => {
  let service: AdminCreatedEmailSubscriberService;
  let mockSupabase: { getClientWhenReady: ReturnType<typeof vi.fn> };
  let mockPc: { lookupPersonByEmail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabase = {
      getClientWhenReady: vi.fn().mockResolvedValue({ from: vi.fn() }),
    };
    mockPc = {
      lookupPersonByEmail: vi.fn().mockResolvedValue({ count: 0, people: [] }),
    };
    service = new AdminCreatedEmailSubscriberService(
      mockSupabase as unknown as SupabaseService,
      mockPc as unknown as PlanningCenterRestService,
    );
  });

  it('validateEmailFormat delegates to shared validator', () => {
    expect(service.validateEmailFormat('bad')).toBe('Please enter a valid email address');
    expect(service.validateEmailFormat('ok@example.com')).toBeNull();
  });

  it('ensure delegates to lib with client and PC lookup', async () => {
    const ensureSpy = vi
      .spyOn(adminCreatedLib, 'ensureAdminCreatedEmailSubscriber')
      .mockResolvedValue({ status: 'created', normalizedEmail: 'jane@example.com' });

    const result = await service.ensure('Jane Doe', 'jane@example.com');

    expect(result.status).toBe('created');
    expect(mockSupabase.getClientWhenReady).toHaveBeenCalled();
    expect(ensureSpy).toHaveBeenCalled();
  });
});
