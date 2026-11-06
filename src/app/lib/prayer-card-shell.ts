import { joinCardShellClassParts } from './card-shell-chrome';
import { isMemberPrayerId } from './prayer-card-kind';
import {
  getPrayerCardVariantLayout,
  type PrayerCardVariant,
  type PrayerCardVariantLayout,
} from './prayer-card-layout';
import {
  getPrayerStatusBorderClasses,
  PERSONAL_PRAYER_BORDER_CLASSES,
} from './prayer-status-header';

/** Same 2px church-blue outline as Current cards (`getPrayerStatusBorderClasses('current')`). */
export const PLANNING_CENTER_MEMBER_BORDER_CLASS =
  '!border-[#0047AB] dark:!border-[#0047AB]';

export function getPrayerCardBorderClass(
  prayerId: string,
  prayerStatus: string,
  isPersonal: boolean
): string {
  if (isPersonal) {
    return PERSONAL_PRAYER_BORDER_CLASSES;
  }
  if (isMemberPrayerId(prayerId)) {
    return PLANNING_CENTER_MEMBER_BORDER_CLASS;
  }
  return getPrayerStatusBorderClasses(prayerStatus);
}

export function getPrayerCardShellClasses(
  variant: PrayerCardVariant,
  borderClass: string
): string {
  const layout = getPrayerCardVariantLayout(variant);
  const border = variant === 'presentation' ? '' : borderClass;
  return joinCardShellClassParts(layout.shellBaseClasses, layout, border);
}

export function getPrayerCardShellClassesFromPrayer(
  variant: PrayerCardVariant,
  prayerId: string,
  prayerStatus: string,
  isPersonal: boolean
): string {
  const borderClass = getPrayerCardBorderClass(
    prayerId,
    prayerStatus,
    isPersonal
  );
  return getPrayerCardShellClasses(variant, borderClass);
}

export type { PrayerCardVariantLayout };
