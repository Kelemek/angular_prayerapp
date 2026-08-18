import { describe, it, expect, vi } from 'vitest';
import { runPromptManagerTourInitialState } from './admin-prompt-manager-facade-tour';

describe('runPromptManagerTourInitialState', () => {
  it('resets UI and bootstraps when section was collapsed', async () => {
    const cancelEdit = vi.fn();
    const resetCreateForm = vi.fn();
    const resetCsvPanel = vi.fn();
    const clearPromptSearchDebouncer = vi.fn();
    const bootstrapPromptSection = vi.fn().mockResolvedValue(undefined);
    const markForCheck = vi.fn();
    const host = {
      sectionExpanded: false,
      sectionInitialLoadDone: false,
      showAddForm: true,
      showCSVUpload: true,
      markForCheck,
      cancelEdit,
      resetCreateForm,
      resetCsvPanel,
      clearPromptSearchDebouncer,
      bootstrapPromptSection,
    };

    await runPromptManagerTourInitialState(host);

    expect(cancelEdit).toHaveBeenCalled();
    expect(host.showAddForm).toBe(false);
    expect(host.showCSVUpload).toBe(false);
    expect(resetCreateForm).toHaveBeenCalled();
    expect(resetCsvPanel).toHaveBeenCalled();
    expect(clearPromptSearchDebouncer).toHaveBeenCalled();
    expect(host.sectionExpanded).toBe(true);
    expect(host.sectionInitialLoadDone).toBe(true);
    expect(bootstrapPromptSection).toHaveBeenCalled();
    expect(markForCheck).toHaveBeenCalled();
  });
});
