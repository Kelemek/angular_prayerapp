import type { PrayerService } from '../services/prayer.service';
import type { PersonalCategoryColorService } from '../services/personal-category-color.service';

export interface PrayerFormSubmitInput {
  description: string;
  prayer_for: string;
  is_anonymous: boolean;
  is_personal: boolean;
  category: string;
}

export interface PrayerFormSubmitPayload {
  title: string;
  description: string;
  requester: string;
  prayer_for: string;
  email: string;
  is_anonymous: boolean;
  category?: string;
  status: 'current';
}

export function buildPrayerFormSubmitPayload(
  formData: PrayerFormSubmitInput,
  currentUserEmail: string,
  fullName: string
): PrayerFormSubmitPayload {
  return {
    title: `Prayer for ${formData.prayer_for}`,
    description: formData.description,
    requester: fullName,
    prayer_for: formData.prayer_for,
    email: currentUserEmail,
    is_anonymous: formData.is_anonymous,
    category: formData.category || undefined,
    status: 'current',
  };
}

export type PrayerFormSubmitResult =
  | { ok: true; isPersonal: boolean }
  | { ok: false; reason: 'category-color-failed' | 'prayer-not-added' };

export async function submitPrayerFormRequest(
  prayerService: PrayerService,
  personalCategoryColorService: PersonalCategoryColorService,
  formData: PrayerFormSubmitInput,
  prayerData: PrayerFormSubmitPayload,
  categoryColor: string,
  categoryColorDirty: boolean
): Promise<PrayerFormSubmitResult> {
  const isPersonal = formData.is_personal;
  const success = isPersonal
    ? await prayerService.addPersonalPrayer(prayerData)
    : await prayerService.addPrayer(prayerData);

  if (!success) {
    return { ok: false, reason: 'prayer-not-added' };
  }

  if (isPersonal && formData.category.trim() && categoryColorDirty) {
    const colorSaved = await personalCategoryColorService.setColor(
      formData.category,
      categoryColor
    );
    if (!colorSaved) {
      return { ok: false, reason: 'category-color-failed' };
    }
  }

  return { ok: true, isPersonal };
}

export const EMPTY_PRAYER_FORM_FIELDS = {
  title: '',
  description: '',
  prayer_for: '',
  is_anonymous: false,
  is_personal: false,
  category: '',
};
