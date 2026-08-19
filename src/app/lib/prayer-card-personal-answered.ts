import type { PrayerService, PrayerStatus } from '../services/prayer.service';

export async function applyPersonalPrayerCategoryUpdate(
  prayerService: PrayerService,
  prayerId: string,
  category: string | null
): Promise<{ category: string | null; status: PrayerStatus } | null> {
  const success = await prayerService.updatePersonalPrayer(prayerId, {
    category,
  });
  if (!success) {
    return null;
  }
  const newStatus: PrayerStatus =
    category === 'Answered' ? 'answered' : 'current';
  return { category, status: newStatus };
}
