import type { Theme } from '../services/theme.service';
import type { TextSize } from '../services/text-size.service';
import type { PresentationSettings } from './presentation';
import type { BibleTranslation } from './memorization';
import type { MemorizeListView, MemorizeTableSortPrefs } from '../lib/memorization/memorization-list-prefs';
import type { MemorizeListenSpeed } from '../lib/memorization/memorizeListenSpeedStorage';

export interface ClientPreferences {
  skipPrayForExplanationModal?: boolean;
  presentationSettings?: PresentationSettings;
  theme?: Theme;
  textSize?: TextSize;
  memorizeListView?: MemorizeListView;
  memorizeTableSort?: MemorizeTableSortPrefs;
  memorizeListenSpeed?: MemorizeListenSpeed;
  preferredBibleTranslation?: BibleTranslation;
}

export function clientPreferencesEqual(
  a: ClientPreferences | undefined,
  b: ClientPreferences | undefined
): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
