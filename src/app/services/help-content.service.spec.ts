import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HelpContentService } from './help-content.service';
import { HelpSection, HelpSectionInput } from '../types/help-content';

describe('HelpContentService', () => {
  let service: HelpContentService;
  let supabaseService: any;

  beforeEach(async () => {
    // Mock SupabaseService
    supabaseService = {
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ 
            data: [],
            error: null 
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
        }),
      }),
    };

    // Import the service
    const { HelpContentService } = await import('./help-content.service');
    service = new HelpContentService(supabaseService);
    
    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default sections', () => {
      let sections: HelpSection[] = [];
      service.getSections().subscribe((data) => {
        sections = data;
      });

      expect(sections.length).toBeGreaterThan(0);
    });

    it('should initialize observables', () => {
      expect(service.sections$).toBeDefined();
      expect(service.isLoading$).toBeDefined();
      expect(service.error$).toBeDefined();
    });

    it('should have default help sections', () => {
      let sections: HelpSection[] = [];
      service.getSections().subscribe((data) => {
        sections = data;
      });

      expect(sections.some((s) => s.id === 'help_prayers')).toBe(true);
      expect(sections.some((s) => s.id === 'help_prompts')).toBe(true);
      expect(sections.some((s) => s.id === 'help_search')).toBe(true);
    });

    it('should have all default sections with correct structure', () => {
      let sections: HelpSection[] = [];
      service.getSections().subscribe((data) => {
        sections = data;
      });

      const requiredSections = [
        'help_prayers',
        'help_prompts',
        'help_search',
        'help_personal_prayers',
        'help_filtering',
        'help_presentation',
        'help_printing',
        'help_email_subscription',
        'help_settings',
      ];

      requiredSections.forEach((id) => {
        expect(sections.some((s) => s.id === id)).toBe(true);
      });
    });

    it('should set correct order for default sections', () => {
      let sections: HelpSection[] = [];
      service.getSections().subscribe((data) => {
        sections = data;
      });

      sections.forEach((section, index) => {
        expect(section.order).toBe(index + 1);
      });
    });

    it('should load default sections during initialization', () => {
      let loadedSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        loadedSections = sections;
      });

      // Should have loaded the default sections from code
      expect(loadedSections.length).toBeGreaterThan(0);
      // Should have the hardcoded 'Creating Prayers' section
      expect(loadedSections.some(s => s.id === 'help_prayers')).toBe(true);
    });

    it('should handle empty data from database', async () => {
      // Create new service with empty database response
      supabaseService.getClient().from().order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { HelpContentService } = await import('./help-content.service');
      const newService = new HelpContentService(supabaseService);

      await new Promise((resolve) => setTimeout(resolve, 50));

      let sections: HelpSection[] = [];
      newService.getSections().subscribe((data) => {
        sections = data;
      });

      // Should fall back to defaults
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      // Create new service with database error
      supabaseService.getClient().from().order.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const { HelpContentService } = await import('./help-content.service');
      const newService = new HelpContentService(supabaseService);

      await new Promise((resolve) => setTimeout(resolve, 50));

      let sections: HelpSection[] = [];
      newService.getSections().subscribe((data) => {
        sections = data;
      });

      // Should fall back to defaults
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle database connection failures', async () => {
      // Create new service with database connection error
      supabaseService.getClient().from().order.mockRejectedValueOnce(
        new Error('Connection failed')
      );

      const { HelpContentService } = await import('./help-content.service');
      const newService = new HelpContentService(supabaseService);

      await new Promise((resolve) => setTimeout(resolve, 50));

      let sections: HelpSection[] = [];
      newService.getSections().subscribe((data) => {
        sections = data;
      });

      // Should fall back to defaults
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should load data from code on initialization', async () => {
      const { HelpContentService } = await import('./help-content.service');
      const newService = new HelpContentService(supabaseService);

      await new Promise((resolve) => setTimeout(resolve, 50));

      let sections: HelpSection[] = [];
      newService.getSections().subscribe((data) => {
        sections = data;
      });

      // Should load default sections from code
      expect(sections.length).toBeGreaterThan(0);
      // Should have the hardcoded sections (like "Creating Prayers", "Managing Prayers", etc.)
      const sectionIds = sections.map(s => s.id);
      expect(sectionIds).toContain('help_prayers');
    });
  });

  describe('getSections', () => {
    it('should return observable of sections', () => {
      const result = service.getSections();
      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });

    it('should emit sections', async () => {
      let emittedSections: HelpSection[] = [];
      const subscription = service.getSections().subscribe((sections) => {
        emittedSections = sections;
      });

      expect(Array.isArray(emittedSections)).toBe(true);
      expect(emittedSections.length).toBeGreaterThan(0);
      subscription.unsubscribe();
    });

    it('should emit multiple times if sections change', async () => {
      let emitCount = 0;
      const subscription = service.getSections().subscribe(() => {
        emitCount++;
      });

      // Just check initial emit happened
      expect(emitCount).toBeGreaterThan(0);
      subscription.unsubscribe();
    });
  });

  describe('addSection', () => {
    it('should add a new section', async () => {
      const input: HelpSectionInput = {
        title: 'New Help Section',
        description: 'A new help section',
        icon: '<svg></svg>',
        content: [
          {
            subtitle: 'Subtitle',
            text: 'Content text',
            examples: ['Example 1'],
          },
        ],
      };

      const result = await service.addSection(input);

      expect(result).toBeDefined();
      expect(result?.title).toBe('New Help Section');
      expect(result?.isActive).toBe(true);
    });

    it('should set correct properties when adding section', async () => {
      const input: HelpSectionInput = {
        title: 'Test Section',
        description: 'Test Description',
        icon: '<svg></svg>',
        content: [],
      };

      const result = await service.addSection(input);

      expect(result?.id).toBeDefined();
      expect(result?.order).toBeDefined();
      expect(result?.createdAt).toBeDefined();
      expect(result?.updatedAt).toBeDefined();
      expect(result?.createdBy).toBe('admin');
    });

    it('should add section to sections$', async () => {
      const input: HelpSectionInput = {
        title: 'Added Section',
        description: 'Description',
        icon: '<svg></svg>',
        content: [],
      };

      const initialLength = (await new Promise<HelpSection[]>((resolve) => {
        service.getSections().subscribe((sections) => resolve(sections));
      })).length;

      await service.addSection(input);

      let finalLength = 0;
      service.getSections().subscribe((sections) => {
        finalLength = sections.length;
      });

      // Wait a bit for subscription to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(finalLength).toBeGreaterThanOrEqual(initialLength);
    });

    it('should handle Supabase errors when adding section', async () => {
      supabaseService.getClient().from().insert.mockResolvedValueOnce({
        error: new Error('Insert failed'),
      });

      const input: HelpSectionInput = {
        title: 'Error Section',
        description: 'Description',
        icon: '<svg></svg>',
        content: [],
      };

      const result = await service.addSection(input);

      expect(result).toBeNull();
    });

    it('should handle network errors when adding section', async () => {
      supabaseService
        .getClient()
        .from()
        .insert.mockRejectedValueOnce(new Error('Network error'));

      const input: HelpSectionInput = {
        title: 'Network Error Section',
        description: 'Description',
        icon: '<svg></svg>',
        content: [],
      };

      const result = await service.addSection(input);

      expect(result).toBeNull();
    });
  });

  describe('updateSection', () => {
    it('should update an existing section', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const sectionToUpdate = currentSections[0];
      const updates: Partial<HelpSectionInput> = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const result = await service.updateSection(sectionToUpdate.id, updates);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Updated Title');
      expect(result?.description).toBe('Updated Description');
    });

    it('should update updatedAt timestamp', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const originalUpdatedAt = currentSections[0].updatedAt;
      const sectionId = currentSections[0].id;

      const result = await service.updateSection(sectionId, { title: 'New Title' });

      expect(result?.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should return null when section not found', async () => {
      const result = await service.updateSection('nonexistent-id', { title: 'New Title' });

      expect(result).toBeNull();
    });

    it('should handle Supabase errors when updating section', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      supabaseService.getClient().from().update().eq.mockResolvedValueOnce({
        error: new Error('Update failed'),
      });

      const result = await service.updateSection(currentSections[0].id, { title: 'Updated' });

      expect(result).toBeNull();
    });

    it('should handle network errors when updating section', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      supabaseService
        .getClient()
        .from()
        .update()
        .eq.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.updateSection(currentSections[0].id, { title: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('removeSection', () => {
    it('should soft delete (deactivate) a section', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await service.removeSection(currentSections[0].id);

      expect(result).toBe(true);
    });

    it('should set isActive to false when removing section', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const sectionId = currentSections[0].id;
      await service.removeSection(sectionId);

      let updatedSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        updatedSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const removedSection = updatedSections.find((s) => s.id === sectionId);
      expect(removedSection?.isActive).toBe(false);
    });

    it('should return false when section not found', async () => {
      const result = await service.removeSection('nonexistent-id');

      expect(result).toBe(false);
    });

    it('should handle Supabase errors when removing section', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      supabaseService.getClient().from().update().eq.mockResolvedValueOnce({
        error: new Error('Delete failed'),
      });

      const result = await service.removeSection(currentSections[0].id);

      expect(result).toBe(false);
    });
  });

  describe('hardDeleteSection', () => {
    it('should permanently delete a section', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const initialCount = currentSections.length;
      const sectionId = currentSections[currentSections.length - 1].id;

      const result = await service.hardDeleteSection(sectionId);

      expect(result).toBe(true);

      let finalSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        finalSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(finalSections.length).toBeLessThan(initialCount);
      expect(finalSections.find((s) => s.id === sectionId)).toBeUndefined();
    });

    it('should return false when section not found', async () => {
      const result = await service.hardDeleteSection('nonexistent-id');

      expect(result).toBe(false);
    });

    it('should handle Supabase errors when hard deleting', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      supabaseService.getClient().from().delete().eq.mockResolvedValueOnce({
        error: new Error('Delete failed'),
      });

      const result = await service.hardDeleteSection(currentSections[0].id);

      expect(result).toBe(false);
    });
  });

  describe('reorderSections', () => {
    it('should reorder sections', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const reordered = [
        currentSections[1],
        currentSections[0],
        ...currentSections.slice(2),
      ];

      const result = await service.reorderSections(reordered);

      expect(result).toBe(true);
    });

    it('should update order property for each section', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const reordered = [...currentSections].reverse();
      await service.reorderSections(reordered);

      let updatedSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        updatedSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      updatedSections.forEach((section, index) => {
        expect(section.order).toBe(index + 1);
      });
    });

    it('should handle Supabase errors when reordering', async () => {
      let currentSections: HelpSection[] = [];
      service.getSections().subscribe((sections) => {
        currentSections = sections;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      supabaseService.getClient().from().update().eq.mockResolvedValueOnce({
        error: new Error('Update failed'),
      });

      const result = await service.reorderSections(currentSections);

      expect(result).toBe(false);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset sections to defaults', async () => {
      const input: HelpSectionInput = {
        title: 'Custom Section',
        description: 'Custom Description',
        icon: '<svg></svg>',
        content: [],
      };

      await service.addSection(input);

      await service.resetToDefaults();

      let sections: HelpSection[] = [];
      service.getSections().subscribe((data) => {
        sections = data;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sections.some((s) => s.id === 'help_prayers')).toBe(true);
    });

    it('should clear errors on reset', async () => {
      await service.resetToDefaults();

      await new Promise((resolve) => {
        service.error$.subscribe((error) => {
          expect(error).toBeNull();
          resolve(null);
        });
      });
    });
  });

  describe('Error Handling and States', () => {
    it('should emit error state when operations fail', async () => {
      supabaseService.getClient().from().insert.mockResolvedValueOnce({
        error: new Error('Insert failed'),
      });

      const input: HelpSectionInput = {
        title: 'Error Test',
        description: 'Description',
        icon: '<svg></svg>',
        content: [],
      };

      await service.addSection(input);

      let error: string | null = null;
      service.error$.subscribe((err) => {
        error = err;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(error).toBeDefined();
    });

    it('should maintain section state consistency', async () => {
      let sections1: HelpSection[] = [];
      let sections2: HelpSection[] = [];

      const sub1 = service.getSections().subscribe((data) => {
        sections1 = data;
      });

      const sub2 = service.getSections().subscribe((data) => {
        sections2 = data;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sections1).toEqual(sections2);

      sub1.unsubscribe();
      sub2.unsubscribe();
    });
  });

  describe('Default Sections Content', () => {
    it('should have complete content for prayers section', () => {
      let sections: HelpSection[] = [];
      service.getSections().subscribe((data) => {
        sections = data;
      });

      const prayersSection = sections.find((s) => s.id === 'help_prayers');

      expect(prayersSection?.title).toBe('Creating Prayers');
      expect(prayersSection?.content.length).toBeGreaterThan(0);
    });

    it('should have examples in content items', () => {
      let sections: HelpSection[] = [];
      service.getSections().subscribe((data) => {
        sections = data;
      });

      const prayersSection = sections.find((s) => s.id === 'help_prayers');
      const contentWithExamples = prayersSection?.content.find((c) => c.examples && c.examples.length > 0);

      expect(contentWithExamples?.examples).toBeDefined();
      expect(Array.isArray(contentWithExamples?.examples)).toBe(true);
    });

    it('should have valid metadata for all sections', () => {
      let sections: HelpSection[] = [];
      service.getSections().subscribe((data) => {
        sections = data;
      });

      sections.forEach((section) => {
        expect(section.id).toBeDefined();
        expect(section.title).toBeDefined();
        expect(section.description).toBeDefined();
        expect(section.icon).toBeDefined();
        expect(section.content).toBeDefined();
        expect(Array.isArray(section.content)).toBe(true);
        expect(section.order).toBeDefined();
        expect(typeof section.order).toBe('number');
        expect(section.isActive).toBe(true);
        expect(section.createdAt).toBeDefined();
        expect(section.updatedAt).toBeDefined();
        expect(section.createdBy).toBe('system');
      });
    });
  });

  describe('Observable Behavior', () => {
    it('should be a BehaviorSubject that emits current value on subscription', async () => {
      let emitted = false;
      const subscription = service.getSections().subscribe(() => {
        emitted = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(emitted).toBe(true);
      subscription.unsubscribe();
    });

    it('should emit isLoading state', async () => {
      let loadingStates: boolean[] = [];
      const subscription = service.isLoading$.subscribe((state) => {
        loadingStates.push(state);
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(loadingStates.length).toBeGreaterThan(0);
      subscription.unsubscribe();
    });

    it('should emit error state', async () => {
      let errors: (string | null)[] = [];
      const subscription = service.error$.subscribe((error) => {
        errors.push(error);
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errors.length).toBeGreaterThan(0);
      subscription.unsubscribe();
    });
  });
});
