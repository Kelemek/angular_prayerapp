export interface PrayerTypesTourSectionGate {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
}

export interface PrayerTypesTourSectionExpandResult {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
  shouldFetch: boolean;
}

export function prayerTypesTourExpandSection(
  gate: PrayerTypesTourSectionGate,
): PrayerTypesTourSectionExpandResult {
  if (!gate.sectionExpanded) {
    const sectionInitialLoadDone = gate.sectionInitialLoadDone;
    return {
      sectionExpanded: true,
      sectionInitialLoadDone,
      shouldFetch: !sectionInitialLoadDone,
    };
  }

  return {
    sectionExpanded: gate.sectionExpanded,
    sectionInitialLoadDone: gate.sectionInitialLoadDone,
    shouldFetch: !gate.sectionInitialLoadDone,
  };
}
