import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { AdminHelpModalComponent } from './admin-help-modal.component';
import { AdminHelpDriverTourService } from '../../services/admin-help-driver-tour.service';
import type { AdminHelpSection } from '../../types/admin-help-content';
import { ADMIN_HELP_TOUR_IDS } from '../../lib/admin-help-sections';

describe('AdminHelpModalComponent', () => {
  let sanitizer: DomSanitizer;
  const cdr = { markForCheck: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sanitizer = TestBed.inject(DomSanitizer);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createSection(overrides: Partial<AdminHelpSection> = {}): AdminHelpSection {
    return {
      id: 'test_section',
      kind: 'article',
      title: 'Test topic',
      description: 'Desc',
      icon: '<svg></svg>',
      content: [{ subtitle: 'A', text: 'Body' }],
      order: 1,
      isActive: true,
      ...overrides,
    };
  }

  function createComponent(): AdminHelpModalComponent {
    const mockTour = { destroy: vi.fn() } as unknown as AdminHelpDriverTourService;
    return new AdminHelpModalComponent(sanitizer, cdr as never, mockTour);
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

  it('getTrustedEmbedUrl returns null for non-https URL', () => {
    const comp = createComponent();
    expect(
      comp.getTrustedEmbedUrl(
        createSection({ videoEmbedUrl: 'http://www.youtube-nocookie.com/embed/x' }),
      ),
    ).toBeNull();
  });

  it('getTrustedEmbedUrl returns null for disallowed host', () => {
    const comp = createComponent();
    expect(
      comp.getTrustedEmbedUrl(
        createSection({ videoEmbedUrl: 'https://evil.com/embed/x' }),
      ),
    ).toBeNull();
  });

  it('getTrustedEmbedUrl normalizes YouTube watch URL to embed', () => {
    const comp = createComponent();
    const trusted = comp.getTrustedEmbedUrl(
      createSection({
        videoEmbedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
    );
    expect(trusted).not.toBeNull();
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

  it('ngOnChanges does not reset when isOpen is not in changes', () => {
    const comp = createComponent();
    comp.searchQuery = 'keep';
    comp.ngOnChanges({});
    expect(comp.searchQuery).toBe('keep');
  });

  it('ngOnChanges does not clear when opening modal', () => {
    const comp = createComponent();
    comp.searchQuery = 'q';
    comp.isOpen = true;
    comp.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(comp.searchQuery).toBe('q');
  });

  it('onClose destroys driver tour and emits', () => {
    const comp = createComponent();
    const tour = (comp as unknown as { adminHelpDriverTour: AdminHelpDriverTourService }).adminHelpDriverTour;
    const destroySpy = vi.spyOn(tour, 'destroy');
    const closeSpy = vi.fn();
    comp.closeModal.subscribe(closeSpy);
    comp.onClose();
    expect(destroySpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('onStartSectionTour emits the section id and stops propagation', () => {
    const comp = createComponent();
    const spy = vi.fn();
    comp.startSectionTour.subscribe(spy);
    const ev = { stopPropagation: vi.fn() } as unknown as Event;
    comp.onStartSectionTour(ADMIN_HELP_TOUR_IDS.emailSubscribersOverview, ev);
    expect(ev.stopPropagation).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(ADMIN_HELP_TOUR_IDS.emailSubscribersOverview);
  });

  it('getSafeIcon returns trusted HTML', () => {
    const comp = createComponent();
    const html = comp.getSafeIcon('<svg class="x"></svg>');
    expect(html).toBeDefined();
  });

  it('onSearchChange filters the catalog', () => {
    const comp = createComponent();
    expect(comp.filteredSections.length).toBeGreaterThan(1);
    comp.searchQuery = 'Memorize Recommendations';
    comp.onSearchChange();
    expect(comp.filteredSections.map((s) => s.id)).toEqual([ADMIN_HELP_TOUR_IDS.memorizeRecommendations]);
  });

  describe('toggleSection and isSectionExpanded', () => {
    it('toggles expanded section id', () => {
      const comp = createComponent();
      expect(comp.isSectionExpanded('test_section')).toBe(false);
      comp.toggleSection('test_section');
      expect(comp.isSectionExpanded('test_section')).toBe(true);
      comp.toggleSection('test_section');
      expect(comp.isSectionExpanded('test_section')).toBe(false);
    });

    it('scrolls content area when expanding', () => {
      vi.useFakeTimers();
      const comp = createComponent();
      const nativeEl = {
        scrollTop: 5,
        getBoundingClientRect: () => ({ top: 20 }),
      };
      (comp as unknown as { contentArea: { nativeElement: typeof nativeEl } }).contentArea = {
        nativeElement: nativeEl,
      };
      vi.spyOn(document, 'querySelector').mockReturnValue({
        getBoundingClientRect: () => ({ top: 100 }),
      } as unknown as HTMLElement);

      comp.toggleSection('test_section');
      vi.runAllTimers();

      expect(document.querySelector).toHaveBeenCalled();
      expect(nativeEl.scrollTop).toBe(85);
      vi.useRealTimers();
    });
  });
});
