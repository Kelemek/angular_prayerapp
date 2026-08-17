import type { AdminSectionLazyGate } from './admin-section-lazy-load';

export interface EmailSubscribersTourInitialUi {
  sectionExpanded: boolean;
  showAddForm: boolean;
  showCSVUpload: boolean;
  error: null;
}

export function emailSubscribersTourInitialUi(): EmailSubscribersTourInitialUi {
  return {
    sectionExpanded: true,
    showAddForm: false,
    showCSVUpload: false,
    error: null,
  };
}

export interface EmailSubscribersOverviewTourPrep {
  gate: AdminSectionLazyGate;
  searchQuery: string;
}

export function emailSubscribersOverviewTourListPrep(
  gate: AdminSectionLazyGate,
): EmailSubscribersOverviewTourPrep {
  return {
    gate: {
      sectionExpanded: true,
      sectionInitialLoadDone: true,
    },
    searchQuery: 'app-test',
  };
}

export interface EmailSubscribersAddFormTourUi {
  showAddForm: boolean;
  showCSVUpload: boolean;
  error: null;
}

export function emailSubscribersAddFormTourUi(): EmailSubscribersAddFormTourUi {
  return {
    showAddForm: true,
    showCSVUpload: false,
    error: null,
  };
}
