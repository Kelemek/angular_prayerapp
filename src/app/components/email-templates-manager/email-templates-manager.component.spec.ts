import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailTemplatesManagerComponent } from './email-templates-manager.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { DomSanitizer } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';

describe('EmailTemplatesManagerComponent', () => {
  let component: EmailTemplatesManagerComponent;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockSanitizer: any;
  let mockCdr: any;

  const sampleTemplate = {
    id: 'tpl-1',
    name: 'Welcome',
    template_key: 'welcome_email',
    subject: 'Hello',
    html_body: '<p>Hi</p>',
    text_body: 'Hi',
    description: 'desc',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseService = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [sampleTemplate], error: null })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: sampleTemplate, error: null })
              })
            })
          })
        })
      }
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockSanitizer = {
      bypassSecurityTrustHtml: vi.fn().mockReturnValue('safe-html' as any)
    };

    mockCdr = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn()
    };

    component = new EmailTemplatesManagerComponent(
      mockSupabaseService as unknown as SupabaseService,
      mockToastService as unknown as ToastService,
      mockSanitizer as unknown as DomSanitizer,
      mockCdr as unknown as ChangeDetectorRef
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit calls loadTemplates', () => {
    const spy = vi.spyOn(component, 'loadTemplates');
    component.ngOnInit();
    expect(spy).toHaveBeenCalled();
  });

  describe('getSafeHtml', () => {
    it('returns sanitized html', () => {
      const result = component.getSafeHtml('<b>x</b>');
      expect(mockSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<b>x</b>');
      expect(result).toBe('safe-html');
    });
  });

  describe('loadTemplates', () => {
    it('loads templates successfully', async () => {
      await component.loadTemplates();
      expect(component.loading).toBe(false);
      expect(component.templates).toEqual([sampleTemplate]);
      expect(component.error).toBeNull();
    });

    it('sets error when no templates returned', async () => {
      mockSupabaseService.client.from().select().order.mockResolvedValue({ data: [], error: null });
      await component.loadTemplates();
      expect(component.templates).toEqual([]);
      expect(component.error).toContain('No templates found');
    });

    it('handles fetch error with message property', async () => {
      mockSupabaseService.client.from().select().order.mockResolvedValue({ data: null, error: new Error('boom') });
      await component.loadTemplates();
      expect(component.error).toContain('Failed to load templates');
      expect(component.error).toContain('boom');
    });

    it('handles fetch error without message property', async () => {
      mockSupabaseService.client.from().select().order.mockResolvedValue({ data: null, error: 'string error' });
      await component.loadTemplates();
      expect(component.error).toContain('Failed to load templates');
    });
  });

  describe('handleSelectTemplate', () => {
    it('selects template and prepares editedTemplate', () => {
      component.templates = [sampleTemplate];
      component.handleSelectTemplate(sampleTemplate as any);
      expect(component.selectedTemplate?.id).toBe(sampleTemplate.id);
      expect(component.editedTemplate?.id).toBe(sampleTemplate.id);
      expect(component.showPreview).toBe(false);
      expect(component.success).toBeNull();
      expect(component.error).toBeNull();
    });

    it('toggles off when selecting same template', () => {
      component.selectedTemplate = sampleTemplate as any;
      component.editedTemplate = { ...sampleTemplate } as any;
      component.handleSelectTemplate(sampleTemplate as any);
      expect(component.selectedTemplate).toBeNull();
      expect(component.editedTemplate).toBeNull();
    });
  });

  describe('handleSave', () => {
    it('does nothing when no editedTemplate', async () => {
      component.editedTemplate = null;
      await component.handleSave();
      expect(component.saving).toBe(false);
    });

    it('saves template successfully', async () => {
      component.templates = [sampleTemplate as any];
      component.selectedTemplate = sampleTemplate as any;
      component.editedTemplate = { ...sampleTemplate } as any;

      const toastSpy = vi.spyOn(mockToastService, 'success');

      await component.handleSave();

      expect(component.saving).toBe(false);
      expect(component.success).toBe('Template saved successfully!');
      expect(toastSpy).toHaveBeenCalled();
      expect(component.templates[0].id).toBe(sampleTemplate.id);
    });

    it('handles save error', async () => {
      component.editedTemplate = { ...sampleTemplate } as any;
      mockSupabaseService.client.from().update().eq().select().single.mockResolvedValue({ data: null, error: new Error('save fail') });
      const toastSpy = vi.spyOn(mockToastService, 'error');

      await component.handleSave();

      expect(component.saving).toBe(false);
      expect(component.error).toBe('Failed to save template');
      expect(toastSpy).toHaveBeenCalled();
    });

    it('handles save error with non-Error object', async () => {
      component.editedTemplate = { ...sampleTemplate } as any;
      mockSupabaseService.client.from().update().eq().select().single.mockResolvedValue({ data: null, error: { some: 'error' } });
      const toastSpy = vi.spyOn(mockToastService, 'error');

      await component.handleSave();

      expect(component.saving).toBe(false);
      expect(component.error).toBe('Failed to save template');
      expect(toastSpy).toHaveBeenCalled();
    });
  });

  describe('handleRevert', () => {
    it('reverts editedTemplate to selectedTemplate', () => {
      component.selectedTemplate = sampleTemplate as any;
      component.editedTemplate = { ...sampleTemplate, name: 'changed' } as any;
      component.success = 'ok';
      component.error = 'err';

      component.handleRevert();

      expect(component.editedTemplate?.name).toBe(sampleTemplate.name);
      expect(component.success).toBeNull();
      expect(component.error).toBeNull();
    });
  });
});
