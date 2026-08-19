import type { PromptCardVariantLayout } from './prayer-card-layout';

export function getPromptCardShellClasses(
  layout: PromptCardVariantLayout
): string {
  return [layout.shellBaseClasses, layout.shellPaddingClasses, layout.shellOuterMargin]
    .filter(Boolean)
    .join(' ');
}

export function showPromptCardPrayedForBadge(
  prayedForCount: number | null | undefined
): boolean {
  return (prayedForCount ?? 0) > 0;
}

export function prayedForCountLabelForPromptCard(
  prayedForCount: number | null | undefined
): string {
  return (prayedForCount ?? 0) === 1 ? 'Prayer' : 'Prayers';
}

export function promptCardTypeHeaderTextClasses(isTypeSelected: boolean): string {
  if (isTypeSelected) {
    return 'text-[#988F83] dark:text-[#988F83]';
  }
  return 'text-gray-700 dark:text-gray-300 hover:text-[#988F83] dark:hover:text-[#988F83]';
}

export function showPromptCardReminderButton(
  sessionEmail: string,
  promptId: string | null | undefined
): boolean {
  return !!sessionEmail && !!promptId;
}
