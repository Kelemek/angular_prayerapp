import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrayerEncouragementSettingsComponent } from './prayer-encouragement-settings.component';
import { SupabaseService } from '../../services/supabase.service';
import { PrayerEncouragementService } from '../../services/prayer-encouragement.service';

describe('PrayerEncouragementSettingsComponent', () => {
  let component: PrayerEncouragementSettingsComponent;
  let mockSupabase: any;
  let mockPrayerEncouragementService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { prayer_encouragement_enabled: true, prayer_encouragement_cooldown_hours: 4 },
      error: null
    });
    mockSupabase = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
        })
      }
    };

    mockPrayerEncouragementService = {
      invalidateFlagCache: vi.fn()
    };

    component = new PrayerEncouragementSettingsComponent(
      mockSupabase,
      mockPrayerEncouragementService,
      { markForCheck: vi.fn() } as any
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default state', () => {
    expect(component.sectionExpanded).toBe(false);
    expect(component.prayerEncouragementEnabled).toBe(false);
    expect(component.cooldownHours).toBe(4);
    expect(component.isSaving).toBe(false);
    expect(component.successMessage).toBe('');
    expect(component.errorMessage).toBe('');
  });

  describe('onSectionToggle', () => {
    it('loads settings on first expand', async () => {
      component.onSectionToggle();
      await vi.waitFor(() => {
        expect(mockSupabase.client.from).toHaveBeenCalledWith('admin_settings');
        expect(component.prayerEncouragementEnabled).toBe(true);
      });
    });
  });

  describe('loadSettings', () => {
    it('should set prayerEncouragementEnabled from response', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { prayer_encouragement_enabled: false, prayer_encouragement_cooldown_hours: 6 },
              error: null
            })
          })
        })
      });
      await component.loadSettings();
      expect(component.prayerEncouragementEnabled).toBe(false);
      expect(component.cooldownHours).toBe(6);
    });

    it('should set errorMessage when load fails', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('Network error'))
          })
        })
      });
      await component.loadSettings();
      expect(component.errorMessage).toBe('Failed to load settings.');
      expect(component.sectionExpanded).toBe(true);
    });
  });

  describe('submitSettings', () => {
    it('should update admin_settings and call invalidateFlagCache on success', async () => {
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { prayer_encouragement_enabled: true, prayer_encouragement_cooldown_hours: 4 },
              error: null
            })
          })
        }),
        update: mockUpdate
      });

      component.prayerEncouragementEnabled = true;
      component.cooldownHours = 4;
      await component.submitSettings();

      expect(mockSupabase.client.from).toHaveBeenCalledWith('admin_settings');
      expect(mockUpdate).toHaveBeenCalledWith({
        prayer_encouragement_enabled: true,
        prayer_encouragement_cooldown_hours: 4
      });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 1);
      expect(mockPrayerEncouragementService.invalidateFlagCache).toHaveBeenCalled();
      expect(component.successMessage).toBe('Prayer Encouragement settings saved.');
      expect(component.isSaving).toBe(false);
    });

    it('should set errorMessage when save fails', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') })
        })
      });
      await component.submitSettings();
      expect(component.errorMessage).toBe('Failed to save settings. Please try again.');
      expect(component.isSaving).toBe(false);
    });
  });
});
