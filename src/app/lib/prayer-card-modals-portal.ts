export interface PrayerCardModalsPortalAnchor {
  parent: Node;
  nextSibling: ChildNode | null;
}

export function prayerCardModalsStackHasOpenModal(state: {
  showAddUpdateForm: boolean;
  showDeleteRequestForm: boolean;
  showUpdateDeleteRequestForm: string | null;
  showConfirmationDialog: boolean;
  showUpdateConfirmationDialog: boolean;
  personalAnsweredStatusModalMode: unknown;
  showReminderModal: boolean;
  showPrayForModal: boolean;
}): boolean {
  return (
    state.showAddUpdateForm ||
    state.showDeleteRequestForm ||
    state.showUpdateDeleteRequestForm !== null ||
    state.showConfirmationDialog ||
    state.showUpdateConfirmationDialog ||
    state.personalAnsweredStatusModalMode !== null ||
    state.showReminderModal ||
    state.showPrayForModal
  );
}

export function isInsideCdkVirtualScrollContent(host: HTMLElement): boolean {
  return !!host.closest(".cdk-virtual-scroll-content-wrapper");
}

export function portalPrayerCardModalsHostToBody(
  host: HTMLElement,
  anchor: PrayerCardModalsPortalAnchor | null
): PrayerCardModalsPortalAnchor {
  if (host.parentElement === document.body && anchor) {
    return anchor;
  }

  const saved: PrayerCardModalsPortalAnchor = anchor ?? {
    parent: host.parentNode!,
    nextSibling: host.nextSibling,
  };
  document.body.appendChild(host);
  return saved;
}

export function restorePrayerCardModalsHostFromBody(
  host: HTMLElement,
  anchor: PrayerCardModalsPortalAnchor | null
): void {
  if (!anchor || host.parentElement !== document.body) {
    return;
  }
  anchor.parent.insertBefore(host, anchor.nextSibling);
}
