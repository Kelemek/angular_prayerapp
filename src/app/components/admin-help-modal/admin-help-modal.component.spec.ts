import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { AdminHelpModalComponent } from './admin-help-modal.component';
import { AdminHelpContentService } from '../../services/admin-help-content.service';
import { AdminHelpDriverTourService } from '../../services/admin-help-driver-tour.service';
import type { AdminHelpSection } from '../../types/admin-help-content';

describe('AdminHelpModalComponent', () => {
  let mockAdminHelp: {
    getSections: ReturnType<typeof vi.fn>;
    isLoading$: ReturnType<typeof of>;
  };
  let sanitizer: DomSanitizer;
  const cdr = { markForCheck: vi.fn() };

  beforeEach(() => {
    mockAdminHelp = {
      getSections: vi.fn(),
      isLoading$: of(false),
    };
    TestBed.configureTestingModule({});
    sanitizer = TestBed.inject(DomSanitizer);
  });

  function createSection(overrides: Partial<AdminHelpSection> = {}): AdminHelpSection {
    const now = new Date();
    return {
      id: 'test_section',
      title: 'Test topic',
      description: 'Desc',
      icon: '<svg></svg>',
      content: [{ subtitle: 'A', text: 'Body' }],
      order: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'test',
      ...overrides,
    };
  }

  function createComponent(): AdminHelpModalComponent {
    mockAdminHelp.getSections.mockReturnValue(of([createSection()]));
    const mockTour = { destroy: vi.fn() } as unknown as AdminHelpDriverTourService;
    return new AdminHelpModalComponent(
      mockAdminHelp as unknown as AdminHelpContentService,
      sanitizer,
      cdr as never,
      mockTour
    );
  }

  it('getTrustedEmbedUrl returns null when no video URL', () => {
    const comp = createComponent();
    expect(comp.getTrustedEmbedUrl(createSection())).toBeNull();
  });

  it('getTrustedEmbedUrl returns trusted URL for valid embed', () => {
    const comp = createComponent();
    const section = createSection({
      videoEmbedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
    expect(comp.getTrustedEmbedUrl(section)).not.toBeNull();
  });

  it('toggleVideo toggles visibility and stops propagation', () => {
    const comp = createComponent();
    const ev = { stopPropagation: vi.fn() } as unknown as Event;
    expect(comp.isVideoOpen('x')).toBe(false);
    comp.toggleVideo('x', ev);
    expect(comp.isVideoOpen('x')).toBe(true);
    comp.toggleVideo('x', ev);
    expect(comp.isVideoOpen('x')).toBe(false);
    expect(ev.stopPropagation).toHaveBeenCalled();
  });

  it('ngOnChanges clears state when modal closes', () => {
    const comp = createComponent();
    comp.isOpen = true;
    (comp as unknown as { expandedSection: string | null }).expandedSection = 'a';
    (comp as unknown as { videoOpen: Record<string, boolean> }).videoOpen = { a: true };
    comp.searchQuery = 'q';
    comp.isOpen = false;
    comp.ngOnChanges({
      isOpen: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect((comp as unknown as { expandedSection: string | null }).expandedSection).toBeNull();
    expect((comp as unknown as { videoOpen: Record<string, boolean> }).videoOpen).toEqual({});
    expect(comp.searchQuery).toBe('');
  });

  it('onStartEmailSubscribersOverviewTour emits and stops propagation', () => {
    const comp = createComponent();
    const emitSpy = vi.fn();
    comp.startEmailSubscribersOverviewTour.subscribe(emitSpy);
    const ev = { stopPropagation: vi.fn() } as unknown as Event;
    comp.onStartEmailSubscribersOverviewTour(ev);
    expect(ev.stopPropagation).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('onStartPrayerPromptsTypesTour emits and stops propagation', () => {
    const comp = createComponent();
    const emitSpy = vi.fn();
    comp.startPrayerPromptsTypesTour.subscribe(emitSpy);
    const ev = { stopPropagation: vi.fn() } as unknown as Event;
    comp.onStartPrayerPromptsTypesTour(ev);
    expect(ev.stopPropagation).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });
});
