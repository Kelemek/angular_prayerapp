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

export interface AdminSectionLazyHost extends AdminSectionLazyGate {
  markForCheck: () => void;
}

export function applyAdminSectionToggle(
  host: AdminSectionLazyHost,
  onInitialLoad: () => void,
): void {
  const toggled = toggleAdminSectionLazyLoad({
    sectionExpanded: host.sectionExpanded,
    sectionInitialLoadDone: host.sectionInitialLoadDone,
  });
  host.sectionExpanded = toggled.gate.sectionExpanded;
  host.sectionInitialLoadDone = toggled.gate.sectionInitialLoadDone;
  if (toggled.shouldInitialLoad) {
    onInitialLoad();
  }
  host.markForCheck();
}
