import { promptManagerTourExpandSection } from './admin-prompt-manager-tour-actions';

export interface PromptManagerTourSectionGateHost {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
}

export interface PromptManagerTourInitialHost extends PromptManagerTourSectionGateHost {
  showAddForm: boolean;
  showCSVUpload: boolean;
  markForCheck: () => void;
  cancelEdit: () => void;
  resetCreateForm: () => void;
  resetCsvPanel: () => void;
  clearPromptSearchDebouncer: () => void;
  bootstrapPromptSection: () => Promise<void>;
}

export async function runPromptManagerTourInitialState(
  host: PromptManagerTourInitialHost,
): Promise<void> {
  host.cancelEdit();
  host.showAddForm = false;
  host.showCSVUpload = false;
  host.resetCreateForm();
  host.resetCsvPanel();
  host.clearPromptSearchDebouncer();

  const expand = promptManagerTourExpandSection({
    sectionExpanded: host.sectionExpanded,
    sectionInitialLoadDone: host.sectionInitialLoadDone,
  });
  host.sectionExpanded = expand.sectionExpanded;
  if (expand.shouldBootstrap) {
    host.sectionInitialLoadDone = true;
    await host.bootstrapPromptSection();
  }
  host.markForCheck();
}
