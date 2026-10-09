import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { UserSettingsPrintSectionComponent } from './user-settings-print-section.component';

describe('UserSettingsPrintSectionComponent', () => {
  let component: UserSettingsPrintSectionComponent;
  let mockPrintService: {
    downloadPrintablePrayerList: ReturnType<typeof vi.fn>;
    downloadPrintablePromptList: ReturnType<typeof vi.fn>;
    downloadPrintablePersonalPrayerList: ReturnType<typeof vi.fn>;
    downloadPrintableMemorizationCards: ReturnType<typeof vi.fn>;
  };
  let mockPrayerService: { getUniqueCategoriesForUser: ReturnType<typeof vi.fn> };
  let mockPromptService: { getActivePromptTypeNames: ReturnType<typeof vi.fn> };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    delete (window as { Capacitor?: unknown }).Capacitor;
    vi.spyOn(window, 'open').mockReturnValue({
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
    } as unknown as Window);
    mockPrintService = {
      downloadPrintablePrayerList: vi.fn(() => Promise.resolve()),
      downloadPrintablePromptList: vi.fn(() => Promise.resolve()),
      downloadPrintablePersonalPrayerList: vi.fn(() => Promise.resolve()),
      downloadPrintableMemorizationCards: vi.fn(() => Promise.resolve()),
    };
    mockPrayerService = {
      getUniqueCategoriesForUser: vi.fn(() => Promise.resolve(['Health'])),
    };
    mockPromptService = {
      getActivePromptTypeNames: vi.fn(() => Promise.resolve(['Healing'])),
    };
    mockCdr = { markForCheck: vi.fn() };

    component = new UserSettingsPrintSectionComponent(
      mockPrintService as any,
      mockPrayerService as any,
      mockPromptService as any,
      mockCdr as unknown as ChangeDetectorRef,
    );
  });

  it('setPrintRange updates printRange', () => {
    component.setPrintRange('month');
    expect(component.printRange).toBe('month');
  });

  it('handlePrint calls print service with current range', async () => {
    component.printRange = 'year';
    await component.handlePrint();
    expect(mockPrintService.downloadPrintablePrayerList).toHaveBeenCalledWith(
      'year',
      expect.anything(),
    );
    expect(component.printBusyJob).toBeNull();
  });

  it('loads prompt types when opened', async () => {
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    await Promise.all([
      mockPromptService.getActivePromptTypeNames.mock.results[0]?.value,
      mockPrayerService.getUniqueCategoriesForUser.mock.results[0]?.value,
    ]);
    await Promise.resolve();
    expect(mockPromptService.getActivePromptTypeNames).toHaveBeenCalled();
    expect(component.promptTypes).toEqual(['Healing']);
    expect(component.personalCategories).toEqual(['Health']);
  });

  it('togglePromptType adds and removes types', () => {
    component.togglePromptType('Healing');
    expect(component.selectedPromptTypes).toEqual(['Healing']);
    component.togglePromptType('Healing');
    expect(component.selectedPromptTypes).toEqual([]);
  });

  it('handlePrintPrompts passes selected types to print service', async () => {
    component.selectedPromptTypes = ['Healing'];
    await component.handlePrintPrompts();
    expect(mockPrintService.downloadPrintablePromptList).toHaveBeenCalledWith(
      ['Healing'],
      expect.anything(),
    );
    expect(component.printBusyJob).toBeNull();
  });

  it('handlePrintPersonalPrayers passes categories and range', async () => {
    component.selectedPersonalCategories = ['Family'];
    component.printRange = 'month';
    await component.handlePrintPersonalPrayers();
    expect(mockPrintService.downloadPrintablePersonalPrayerList).toHaveBeenCalledWith(
      ['Family'],
      expect.anything(),
      'month',
    );
  });

  it('handlePrintMemorizationCards calls print service with sheet style', async () => {
    component.memorizationSheetStyle = 'foldable';
    await component.handlePrintMemorizationCards();
    expect(mockPrintService.downloadPrintableMemorizationCards).toHaveBeenCalledWith(
      expect.anything(),
      'foldable',
    );
    expect(component.printBusyJob).toBeNull();
  });

  it('printFromOptionsModal for verses closes modal and prints', async () => {
    component.openPrintOptionsModal('verses');
    component.memorizationSheetStyle = 'duplex';
    await component.printFromOptionsModal();
    expect(component.printOptionsModal).toBeNull();
    expect(mockPrintService.downloadPrintableMemorizationCards).toHaveBeenCalledWith(
      expect.anything(),
      'duplex',
    );
  });

  it('openPrintOptionsModal starts the prayer chooser', () => {
    component.openPrintOptionsModal('prayers');
    expect(component.printOptionsModal).toBe('prayers');
    expect(component.prayerPrintStep).toBe('source');
    component.closePrintOptionsModal();
    expect(component.printOptionsModal).toBeNull();
  });

  it('printFromOptionsModal closes modal and prints church prayers', async () => {
    const mockWindow = {} as Window;
    vi.spyOn(window, 'open').mockReturnValue(mockWindow);
    component.openPrintOptionsModal('prayers');
    component.choosePrayerPrintSource('church');
    component.printRange = 'year';
    await component.printFromOptionsModal();
    expect(component.printOptionsModal).toBeNull();
    expect(mockPrintService.downloadPrintablePrayerList).toHaveBeenCalledWith(
      'year',
      mockWindow,
    );
  });

  it('personal asks for a category then a timeframe', () => {
    component.openPrintOptionsModal('prayers');
    component.choosePrayerPrintSource('personal');
    expect(component.prayerPrintStep).toBe('category');
    component.choosePrintPersonalCategory('Health');
    expect(component.selectedPersonalCategories).toEqual(['Health']);
    expect(component.prayerPrintStep).toBe('timeframe');
  });

  it('ignores print data loaded after settings closes', async () => {
    let resolvePrompts!: (names: string[]) => void;
    mockPromptService.getActivePromptTypeNames = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvePrompts = resolve;
        }),
    );

    component.isOpen = true;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    component.isOpen = false;
    component.ngOnChanges({
      isOpen: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    resolvePrompts(['Late']);
    await Promise.resolve();

    expect(component.promptTypes).toEqual([]);
  });

  it('closes print options modal when settings section closes', () => {
    component.openPrintOptionsModal('prayers');
    component.ngOnChanges({
      isOpen: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(component.printOptionsModal).toBeNull();
  });
});
