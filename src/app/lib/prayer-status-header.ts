/** Colored text classes for community prayer status in card meta headers. */
export function getPrayerStatusHeaderTextClasses(status: string): string {
  if (status === 'current') {
    return 'text-[#0047AB] dark:text-[#4A90E2]';
  }
  if (status === 'answered') {
    return 'text-[#39704D] dark:text-[#5FB876]';
  }
  return 'text-[#C9A961] dark:text-[#D4AF85]';
}

/** Personal prayer card outline — matches Personal folder tab `#2F5F54`. */
export const PERSONAL_PRAYER_BORDER_CLASSES =
  '!border-[#2F5F54] dark:!border-[#2F5F54]';

/** Meta header band bottom edge — church green medium on all prayer/prompt/update cards. */
export const META_HEADER_BORDER_BOTTOM_CLASSES =
  'border-b border-[#2F5F54] dark:border-[#2F5F54]';

/** Border classes for home prayer cards by status. */
export function getPrayerStatusBorderClasses(status: string): string {
  if (status === 'current') {
    return '!border-[#0047AB] dark:!border-[#0047AB]';
  }
  if (status === 'answered') {
    return '!border-[#39704D] dark:!border-[#39704D]';
  }
  return '!border-[#C9A961] dark:!border-[#C9A961]';
}

/** Pill/badge classes for presentation and legacy status badges. */
export function getPrayerStatusPillClasses(status: string): string {
  const baseClasses = 'px-5 py-2 rounded-full border ';
  switch (status) {
    case 'current':
      return (
        baseClasses +
        'bg-blue-50 dark:bg-blue-900/20 text-[#0047AB] dark:text-[#4A90E2] border-[#0047AB] dark:border-[#0047AB]'
      );
    case 'answered':
      return (
        baseClasses +
        'bg-green-50 dark:bg-green-900/20 text-[#39704D] dark:text-[#5FB876] border-[#39704D] dark:border-[#39704D]'
      );
    case 'archived':
      return (
        baseClasses +
        'bg-amber-50 dark:bg-amber-900/20 text-[#C9A961] dark:text-[#D4AF85] border-[#C9A961] dark:border-[#C9A961]'
      );
    default:
      return (
        baseClasses +
        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-400 dark:border-gray-600'
      );
  }
}

export function getPrayerStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
