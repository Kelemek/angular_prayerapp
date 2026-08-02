import { describe, it, expect, vi } from 'vitest';
import { renamePersonalCategoryWithColors } from './personal-category-rename';
import type { PrayerService } from '../services/prayer.service';
import type { PersonalCategoryColorService } from '../services/personal-category-color.service';
import type { ToastService } from '../services/toast.service';

function makeColorService(
  colors: Record<string, string> = {}
): PersonalCategoryColorService {
  return {
    getColorsSnapshot: vi.fn().mockReturnValue(colors),
    renameCategory: vi.fn().mockResolvedValue(true),
  } as unknown as PersonalCategoryColorService;
}

describe('renamePersonalCategoryWithColors', () => {
  it('returns success when prayer and color renames succeed', async () => {
    const prayerService = {
      renamePersonalCategory: vi.fn().mockResolvedValue(true),
    } as unknown as PrayerService;
    const personalCategoryColorService = makeColorService();
    const toastService = {
      error: vi.fn(),
    } as unknown as ToastService;

    const result = await renamePersonalCategoryWithColors(
      prayerService,
      personalCategoryColorService,
      toastService,
      'Evening',
      'Night'
    );

    expect(result).toEqual({ status: 'success' });
    expect(prayerService.renamePersonalCategory).toHaveBeenCalledWith(
      'Evening',
      'Night',
      { reservedCategoryNames: [] }
    );
    expect(personalCategoryColorService.renameCategory).toHaveBeenCalledWith(
      'Evening',
      'Night'
    );
    expect(toastService.error).not.toHaveBeenCalled();
  });

  it('passes saved color names as reserved category names', async () => {
    const prayerService = {
      renamePersonalCategory: vi.fn().mockResolvedValue(false),
    } as unknown as PrayerService;
    const personalCategoryColorService = makeColorService({
      Legacy: '#ff0000',
    });
    const toastService = {
      error: vi.fn(),
    } as unknown as ToastService;

    await renamePersonalCategoryWithColors(
      prayerService,
      personalCategoryColorService,
      toastService,
      'Evening',
      'Legacy'
    );

    expect(prayerService.renamePersonalCategory).toHaveBeenCalledWith(
      'Evening',
      'Legacy',
      { reservedCategoryNames: ['Legacy'] }
    );
  });

  it('calls onPrayersRenamed after prayers rename succeeds', async () => {
    const prayerService = {
      renamePersonalCategory: vi.fn().mockResolvedValue(true),
    } as unknown as PrayerService;
    const personalCategoryColorService = makeColorService();
    const toastService = {
      error: vi.fn(),
    } as unknown as ToastService;
    const onPrayersRenamed = vi.fn();

    await renamePersonalCategoryWithColors(
      prayerService,
      personalCategoryColorService,
      toastService,
      'Evening',
      'Night',
      { onPrayersRenamed }
    );

    expect(onPrayersRenamed).toHaveBeenCalledWith('Night');
  });

  it('rolls back prayers and returns failed when color rename fails', async () => {
    const prayerService = {
      renamePersonalCategory: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true),
    } as unknown as PrayerService;
    const personalCategoryColorService = {
      getColorsSnapshot: vi.fn().mockReturnValue({}),
      renameCategory: vi.fn().mockResolvedValue(false),
    } as unknown as PersonalCategoryColorService;
    const toastService = {
      error: vi.fn(),
    } as unknown as ToastService;

    const result = await renamePersonalCategoryWithColors(
      prayerService,
      personalCategoryColorService,
      toastService,
      'Evening',
      'Night'
    );

    expect(result).toEqual({ status: 'failed' });
    expect(prayerService.renamePersonalCategory).toHaveBeenNthCalledWith(
      1,
      'Evening',
      'Night',
      { reservedCategoryNames: [] }
    );
    expect(prayerService.renamePersonalCategory).toHaveBeenNthCalledWith(
      2,
      'Night',
      'Evening'
    );
    expect(toastService.error).toHaveBeenCalledWith(
      'Failed to rename category. Changes were reverted.'
    );
  });

  it('returns partial when color rename and prayer rollback both fail', async () => {
    const prayerService = {
      renamePersonalCategory: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    } as unknown as PrayerService;
    const personalCategoryColorService = {
      getColorsSnapshot: vi.fn().mockReturnValue({}),
      renameCategory: vi.fn().mockResolvedValue(false),
    } as unknown as PersonalCategoryColorService;
    const toastService = {
      error: vi.fn(),
    } as unknown as ToastService;

    const result = await renamePersonalCategoryWithColors(
      prayerService,
      personalCategoryColorService,
      toastService,
      'Evening',
      'Night'
    );

    expect(result).toEqual({ status: 'partial', appliedCategory: 'Night' });
    expect(toastService.error).toHaveBeenCalledWith(
      'Prayers were renamed but the category color could not be updated. Please refresh and try again.'
    );
  });

  it('returns cancelled and rolls back prayers when cancelled after prayer rename', async () => {
    const prayerService = {
      renamePersonalCategory: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true),
    } as unknown as PrayerService;
    const personalCategoryColorService = makeColorService();
    const toastService = {
      error: vi.fn(),
    } as unknown as ToastService;

    const result = await renamePersonalCategoryWithColors(
      prayerService,
      personalCategoryColorService,
      toastService,
      'Evening',
      'Night',
      { isCancelled: () => true }
    );

    expect(result).toEqual({ status: 'cancelled' });
    expect(prayerService.renamePersonalCategory).toHaveBeenNthCalledWith(
      2,
      'Night',
      'Evening'
    );
    expect(personalCategoryColorService.renameCategory).not.toHaveBeenCalled();
  });

  it('returns partial when cancel rollback fails', async () => {
    const prayerService = {
      renamePersonalCategory: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    } as unknown as PrayerService;
    const personalCategoryColorService = makeColorService();
    const toastService = {
      error: vi.fn(),
    } as unknown as ToastService;

    const result = await renamePersonalCategoryWithColors(
      prayerService,
      personalCategoryColorService,
      toastService,
      'Evening',
      'Night',
      { isCancelled: () => true }
    );

    expect(result).toEqual({ status: 'partial', appliedCategory: 'Night' });
    expect(toastService.error).toHaveBeenCalledWith(
      'Could not undo the category rename. Please refresh and try again.'
    );
    expect(personalCategoryColorService.renameCategory).not.toHaveBeenCalled();
  });

  it('does not rename colors when prayer rename fails', async () => {
    const prayerService = {
      renamePersonalCategory: vi.fn().mockResolvedValue(false),
    } as unknown as PrayerService;
    const personalCategoryColorService = makeColorService();
    const toastService = {
      error: vi.fn(),
    } as unknown as ToastService;
    const onPrayersRenamed = vi.fn();

    const result = await renamePersonalCategoryWithColors(
      prayerService,
      personalCategoryColorService,
      toastService,
      'Evening',
      'Night',
      { onPrayersRenamed }
    );

    expect(result).toEqual({ status: 'failed' });
    expect(personalCategoryColorService.renameCategory).not.toHaveBeenCalled();
    expect(onPrayersRenamed).not.toHaveBeenCalled();
  });
});
