import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { MemorizationRecommendationsModalComponent } from './memorization-recommendations-modal.component';
import { MemorizationService } from '../../services/memorization.service';
import { resolveScriptureHoverPreviewComponentResources } from '../scripture-hover-preview/scripture-hover-preview-component-resources.spec-helper';
import type {
  MemorizationRecommendation,
  MemorizationRecommendationCategoryGroup,
} from '../../types/memorization';

beforeAll(async () => {
  await resolveScriptureHoverPreviewComponentResources();
});

const mockMemorization = {
  getPreferredTranslation: vi.fn(() => 'esv' as const),
  setPreferredTranslation: vi.fn(),
};

function createModal(): MemorizationRecommendationsModalComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [MemorizationRecommendationsModalComponent],
    providers: [{ provide: MemorizationService, useValue: mockMemorization }],
  });
  return TestBed.createComponent(MemorizationRecommendationsModalComponent).componentInstance;
}

const sample: MemorizationRecommendation = {
  id: 'r1',
  reference: 'John 3:16',
  translation: 'esv',
  categoryId: 'cat-1',
  displayOrder: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const groups: MemorizationRecommendationCategoryGroup[] = [
  {
    category: {
      id: 'cat-1',
      name: 'Gospel',
      displayOrder: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    items: [sample],
  },
  {
    category: {
      id: 'cat-2',
      name: 'Empty',
      displayOrder: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    items: [],
  },
];

describe('MemorizationRecommendationsModalComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemorization.getPreferredTranslation.mockReturnValue('esv');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.querySelectorAll('.safe-area-viewport').forEach((el) => {
      const html = el as HTMLElement;
      html.style.overflow = '';
      html.style.touchAction = '';
    });
  });

  it('isAlreadyAdded uses selected translation:reference keys', () => {
    const modal = createModal();
    modal.translation = 'niv';
    modal.alreadyAddedReferences = new Set(['niv:John 3:16']);
    expect(modal.isAlreadyAdded(sample)).toBe(true);
    expect(
      modal.isAlreadyAdded({ ...sample, id: 'r2', reference: 'Romans 8:28' })
    ).toBe(false);
  });

  it('onAddRecommendation emits recommendation with selected translation', () => {
    const modal = createModal();
    modal.translation = 'kjv';
    const emit = vi.spyOn(modal.add, 'emit');
    modal.onAddRecommendation(sample);
    expect(emit).toHaveBeenCalledWith({ ...sample, translation: 'kjv' });
  });

  it('onTranslationChanged updates translation and emits translationChange', () => {
    const modal = createModal();
    const changed = vi.spyOn(modal.translationChange, 'emit');
    modal.onTranslationChanged('csb');
    expect(modal.translation).toBe('csb');
    expect(changed).toHaveBeenCalledWith('csb');
  });

  it('groupsWithVerses hides empty categories', () => {
    const modal = createModal();
    modal.groups = groups;
    expect(modal.groupsWithVerses).toHaveLength(1);
    expect(modal.groupsWithVerses[0].category.name).toBe('Gospel');
  });

  it('starts with categories collapsed and toggles expansion', () => {
    const modal = createModal();
    expect(modal.isCategoryExpanded('cat-1')).toBe(false);
    modal.toggleCategory('cat-1');
    expect(modal.isCategoryExpanded('cat-1')).toBe(true);
    modal.toggleCategory('cat-1');
    expect(modal.isCategoryExpanded('cat-1')).toBe(false);
  });

  it('clears expanded categories when the modal closes', () => {
    const modal = createModal();
    modal.isOpen = true;
    modal.toggleCategory('cat-1');
    expect(modal.isCategoryExpanded('cat-1')).toBe(true);

    modal.isOpen = false;
    modal.ngOnChanges({
      isOpen: {
        previousValue: true,
        currentValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(modal.isCategoryExpanded('cat-1')).toBe(false);
  });

  it('locks page scroll while open and restores on close', async () => {
    const viewport = document.createElement('div');
    viewport.className = 'safe-area-viewport';
    viewport.style.overflow = 'auto';
    viewport.style.touchAction = 'auto';
    document.body.appendChild(viewport);

    const { fixture } = await render(MemorizationRecommendationsModalComponent, {
      componentInputs: { isOpen: true, groups },
      container: viewport,
      providers: [{ provide: MemorizationService, useValue: mockMemorization }],
    });

    expect(viewport.style.overflow).toBe('hidden');
    expect(viewport.style.touchAction).toBe('none');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(viewport.style.overflow).toBe('auto');
    expect(viewport.style.touchAction).toBe('auto');
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');

    viewport.remove();
  });

  it('allows touchmove inside the modal scroller and blocks it elsewhere', async () => {
    const { fixture } = await render(MemorizationRecommendationsModalComponent, {
      componentInputs: { isOpen: true, groups },
      providers: [{ provide: MemorizationService, useValue: mockMemorization }],
    });
    const modal = fixture.componentInstance;
    const scroller = fixture.nativeElement.querySelector(
      '[class*="overflow-y-auto"]'
    ) as HTMLElement;
    expect(scroller).toBeTruthy();

    const inside = { preventDefault: vi.fn(), target: scroller };
    modal.onModalTouchMove(inside as unknown as TouchEvent);
    expect(inside.preventDefault).not.toHaveBeenCalled();

    const outside = {
      preventDefault: vi.fn(),
      target: document.createElement('div'),
    };
    modal.onModalTouchMove(outside as unknown as TouchEvent);
    expect(outside.preventDefault).toHaveBeenCalled();
  });

  it('allows touchmove inside a portaled scripture hover preview', async () => {
    const { fixture } = await render(MemorizationRecommendationsModalComponent, {
      componentInputs: { isOpen: true, groups },
      providers: [{ provide: MemorizationService, useValue: mockMemorization }],
    });
    const modal = fixture.componentInstance;

    const popover = document.createElement('div');
    popover.setAttribute('data-scripture-hover-popover', '');
    const inner = document.createElement('div');
    popover.appendChild(inner);
    document.body.appendChild(popover);

    const previewTouch = { preventDefault: vi.fn(), target: inner };
    modal.onModalTouchMove(previewTouch as unknown as TouchEvent);
    expect(previewTouch.preventDefault).not.toHaveBeenCalled();

    const textNode = document.createTextNode('For God so loved the world');
    inner.appendChild(textNode);
    const textTouch = { preventDefault: vi.fn(), target: textNode };
    modal.onModalTouchMove(textTouch as unknown as TouchEvent);
    expect(textTouch.preventDefault).not.toHaveBeenCalled();

    popover.remove();
  });
});
