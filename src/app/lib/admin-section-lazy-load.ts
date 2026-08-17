export interface AdminSectionLazyGate {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
}

export interface AdminSectionLazyToggleResult {
  gate: AdminSectionLazyGate;
  shouldInitialLoad: boolean;
}

export function toggleAdminSectionLazyLoad(
  gate: AdminSectionLazyGate,
): AdminSectionLazyToggleResult {
  const sectionExpanded = !gate.sectionExpanded;
  let sectionInitialLoadDone = gate.sectionInitialLoadDone;
  let shouldInitialLoad = false;
  if (sectionExpanded && !sectionInitialLoadDone) {
    sectionInitialLoadDone = true;
    shouldInitialLoad = true;
  }
  return {
    gate: { sectionExpanded, sectionInitialLoadDone },
    shouldInitialLoad,
  };
}
