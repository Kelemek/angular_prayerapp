import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanningCenterRestService } from './planning-center-rest.service';
import * as planningCenter from '../../lib/planning-center';

vi.mock('../../environments/environment', () => ({
  environment: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'anon-key',
  },
}));

describe('PlanningCenterRestService', () => {
  let service: PlanningCenterRestService;
  const mockSupabase = {
    getRestAuthorizationBearer: vi.fn().mockResolvedValue('user-jwt'),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlanningCenterRestService(mockSupabase as never);
  });

  it('lookupPersonByEmail uses Supabase bearer and passes JWT', async () => {
    const spy = vi.spyOn(planningCenter, 'lookupPersonByEmail').mockResolvedValue({
      people: [],
      count: 0,
    });

    await service.lookupPersonByEmail('a@b.com', true);

    expect(mockSupabase.getRestAuthorizationBearer).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(
      'a@b.com',
      'https://test.supabase.co',
      'anon-key',
      true,
      'user-jwt'
    );
  });
});
