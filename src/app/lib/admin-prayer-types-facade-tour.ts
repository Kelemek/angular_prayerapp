import { prayerTypesTourExpandSection } from './admin-prayer-types-tour-actions';

export interface PrayerTypesTourInitialHost {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
  markForCheck: () => void;
  closeTypeForm: () => void;
  fetchTypes: () => Promise<void>;
}

export async function runPrayerTypesTourInitialState(
  host: PrayerTypesTourInitialHost,
): Promise<void> {
  host.closeTypeForm();

  const expand = prayerTypesTourExpandSection({
    sectionExpanded: host.sectionExpanded,
    sectionInitialLoadDone: host.sectionInitialLoadDone,
  });
  host.sectionExpanded = expand.sectionExpanded;
  if (expand.shouldFetch) {
    host.sectionInitialLoadDone = true;
    await host.fetchTypes();
  }
  host.markForCheck();
}
