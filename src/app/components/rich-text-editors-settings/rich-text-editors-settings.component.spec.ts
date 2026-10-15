import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wireGatedSupabaseMock } from '../../testing/supabase-service-mock';
import { RichTextEditorsSettingsComponent } from './rich-text-editors-settings.component';
import { SupabaseService } from '../../services/supabase.service';
import { RichTextEditorsSettingsService } from '../../services/rich-text-editors-settings.service';

describe('RichTextEditorsSettingsComponent', () => {
  let component: RichTextEditorsSettingsComponent;
  let mockSupabase: any;
  let mockRichTextEditorsSettings: { invalidateFlagCache: ReturnType<typeof vi.fn> };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { rich_text_editors_enabled: true },
      error: null,
    });
    mockSupabase = wireGatedSupabaseMock({
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      },
    });

    mockRichTextEditorsSettings = {
      invalidateFlagCache: vi.fn(),
    };

    mockCdr = { markForCheck: vi.fn() };

    component = new RichTextEditorsSettingsComponent(
      mockSupabase as SupabaseService,
      mockRichTextEditorsSettings as unknown as RichTextEditorsSettingsService,
      mockCdr as any
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default state', () => {
    expect(component.sectionExpanded).toBe(false);
    expect(component.richTextEditorsEnabled).toBe(true);
    expect(component.isSaving).toBe(false);
    expect(component.successMessage).toBe('');
    expect(component.errorMessage).toBe('');
  });

  describe('onSectionToggle', () => {
    it('loads settings on first expand', async () => {
      component.onSectionToggle();
      await vi.waitFor(() => {
        expect(mockSupabase.client.from).toHaveBeenCalledWith('admin_settings');
        expect(component.richTextEditorsEnabled).toBe(true);
      });
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('does not load again when section is expanded a second time after initial load', async () => {
      component.onSectionToggle();
      await vi.waitFor(() => expect(mockSupabase.client.from).toHaveBeenCalled());
      const callsAfterFirstExpand = mockSupabase.client.from.mock.calls.length;

      component.onSectionToggle();
      expect(component.sectionExpanded).toBe(false);

      component.onSectionToggle();
      await Promise.resolve();
      expect(mockSupabase.client.from.mock.calls.length).toBe(callsAfterFirstExpand);
    });
  });

  describe('loadSettings', () => {
    it('should set richTextEditorsEnabled false when column is false', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { rich_text_editors_enabled: false },
              error: null,
            }),
          }),
        }),
      });
      await component.loadSettings();
      expect(component.richTextEditorsEnabled).toBe(false);
    });

    it('should treat null data as enabled', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });
      await component.loadSettings();
      expect(component.richTextEditorsEnabled).toBe(true);
    });

    it('should set errorMessage when load returns error', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'db error' },
            }),
          }),
        }),
      });
      await component.loadSettings();
      expect(component.errorMessage).toBe('Failed to load settings.');
    });

    it('should set errorMessage when load throws', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      });
      await component.loadSettings();
      expect(component.errorMessage).toBe('Failed to load settings.');
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
              data: { rich_text_editors_enabled: true },
              error: null,
            }),
          }),
        }),
        update: mockUpdate,
      });

      component.richTextEditorsEnabled = false;
      await component.submitSettings();

      expect(mockSupabase.client.from).toHaveBeenCalledWith('admin_settings');
      expect(mockUpdate).toHaveBeenCalledWith({ rich_text_editors_enabled: false });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 1);
      expect(mockRichTextEditorsSettings.invalidateFlagCache).toHaveBeenCalled();
      expect(component.successMessage).toBe('Rich text editor settings saved.');
      expect(component.isSaving).toBe(false);
    });

    it('should set errorMessage when save fails', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
        }),
      });
      await component.submitSettings();
      expect(component.errorMessage).toBe('Failed to save settings. Please try again.');
      expect(component.isSaving).toBe(false);
    });

    it('should clear successMessage after timeout', async () => {
      vi.useFakeTimers();
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
      mockSupabase.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { rich_text_editors_enabled: true },
              error: null,
            }),
          }),
        }),
        update: mockUpdate,
      });

      await component.submitSettings();
      expect(component.successMessage).toBe('Rich text editor settings saved.');

      vi.advanceTimersByTime(5000);
      expect(component.successMessage).toBe('');
    });
  });
});
