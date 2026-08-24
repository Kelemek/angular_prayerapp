import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { VerseMemorizationTranslationModalComponent } from './verse-memorization-translation-modal.component';
import { MemorizationService } from '../../services/memorization.service';

describe('VerseMemorizationTranslationModalComponent', () => {
  let component: VerseMemorizationTranslationModalComponent;
  const getPreferredTranslation = vi.fn(() => 'esv' as const);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [VerseMemorizationTranslationModalComponent],
      providers: [
        {
          provide: MemorizationService,
          useValue: { getPreferredTranslation },
        },
      ],
    });
    component = TestBed.createComponent(
      VerseMemorizationTranslationModalComponent
    ).componentInstance;
  });

  it('resets selected translation from preference when modal opens', () => {
    getPreferredTranslation.mockReturnValue('niv');
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(component.selectedTranslation).toBe('niv');
  });

  it('prefers suggested translation over user preference when modal opens', () => {
    getPreferredTranslation.mockReturnValue('esv');
    component.suggestedTranslation = 'kjv';
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(component.selectedTranslation).toBe('kjv');
  });

  it('updates selected translation when picker changes', () => {
    component.onTranslationChanged('kjv');
    expect(component.selectedTranslation).toBe('kjv');
  });
});
