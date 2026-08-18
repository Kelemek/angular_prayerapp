import {
  emailSubscribersAddFormTourUi,
  emailSubscribersOverviewTourListPrep,
  emailSubscribersTourInitialUi,
} from './admin-email-subscribers-tour-actions';

export interface EmailSubscribersTourSectionGateHost {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
}

export interface EmailSubscribersTourInitialHost {
  sectionExpanded: boolean;
  showAddForm: boolean;
  showCSVUpload: boolean;
  error: string | null;
  markForCheck: () => void;
  resetAddForm: () => void;
}

export interface EmailSubscribersOverviewTourHost
  extends EmailSubscribersTourSectionGateHost {
  searchQuery: string;
  markForCheck: () => void;
  prepareTourInitialState: () => void;
  clearListSearchDebouncer: () => void;
  handleSearch: () => Promise<void>;
}

export function runEmailSubscribersTourInitialState(
  host: EmailSubscribersTourInitialHost,
): void {
  const ui = emailSubscribersTourInitialUi();
  host.sectionExpanded = ui.sectionExpanded;
  host.showAddForm = ui.showAddForm;
  host.showCSVUpload = ui.showCSVUpload;
  host.error = ui.error;
  host.resetAddForm();
  host.markForCheck();
}

export async function runEmailSubscribersOverviewTourListState(
  host: EmailSubscribersOverviewTourHost,
): Promise<void> {
  const prep = emailSubscribersOverviewTourListPrep({
    sectionExpanded: host.sectionExpanded,
    sectionInitialLoadDone: host.sectionInitialLoadDone,
  });
  host.prepareTourInitialState();
  host.sectionExpanded = prep.gate.sectionExpanded;
  host.sectionInitialLoadDone = prep.gate.sectionInitialLoadDone;
  host.searchQuery = prep.searchQuery;
  host.clearListSearchDebouncer();
  await host.handleSearch();
  host.markForCheck();
}

export function runEmailSubscribersAddFormTourOpen(
  host: Pick<
    EmailSubscribersTourInitialHost,
    'showAddForm' | 'showCSVUpload' | 'error' | 'markForCheck'
  >,
): void {
  const ui = emailSubscribersAddFormTourUi();
  host.showAddForm = ui.showAddForm;
  host.showCSVUpload = ui.showCSVUpload;
  host.error = ui.error;
  host.markForCheck();
}
