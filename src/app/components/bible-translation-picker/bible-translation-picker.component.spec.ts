import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BibleTranslationPickerComponent } from './bible-translation-picker.component';
import { MemorizationService } from '../../services/memorization.service';

describe('BibleTranslationPickerComponent', () => {
  let fixture: ComponentFixture<BibleTranslationPickerComponent>;
  let component: BibleTranslationPickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BibleTranslationPickerComponent],
      providers: [
        {
          provide: MemorizationService,
          useValue: {
            setPreferredTranslation: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BibleTranslationPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('anchors the fixed menu to the trigger when the list exceeds the CSS max height', () => {
    component.escapeOverflowContainer = true;
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      'button[aria-haspopup="listbox"]'
    ) as HTMLButtonElement;
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 700,
      bottom: 744,
      left: 16,
      right: 416,
      width: 400,
      height: 44,
      x: 16,
      y: 700,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(430);

    trigger.click();
    fixture.detectChanges();

    const listbox = fixture.nativeElement.querySelector(
      '[role="listbox"]'
    ) as HTMLElement;
    const top = Number.parseFloat(listbox.style.top);
    const maxHeight = Number.parseFloat(listbox.style.maxHeight);
    expect(top + maxHeight + 4).toBe(700);
  });
});
