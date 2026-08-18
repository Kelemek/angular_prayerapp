import { describe, it, expect, vi } from 'vitest';
import {
  runEmailSubscribersOverviewTourListState,
  runEmailSubscribersTourInitialState,
} from './admin-email-subscribers-facade-tour';

describe('runEmailSubscribersTourInitialState', () => {
  it('resets tour UI and calls resetAddForm', () => {
    const resetAddForm = vi.fn();
    const markForCheck = vi.fn();
    const host = {
      sectionExpanded: false,
      showAddForm: true,
      showCSVUpload: true,
      error: 'err',
      markForCheck,
      resetAddForm,
    };

    runEmailSubscribersTourInitialState(host);

    expect(host.sectionExpanded).toBe(true);
    expect(host.showAddForm).toBe(false);
    expect(host.showCSVUpload).toBe(false);
    expect(host.error).toBeNull();
    expect(resetAddForm).toHaveBeenCalled();
    expect(markForCheck).toHaveBeenCalled();
  });
});

describe('runEmailSubscribersOverviewTourListState', () => {
  it('sets app-test query and awaits search', async () => {
    const handleSearch = vi.fn().mockResolvedValue(undefined);
    const prepareTourInitialState = vi.fn();
    const clearListSearchDebouncer = vi.fn();
    const markForCheck = vi.fn();
    const host = {
      sectionExpanded: false,
      sectionInitialLoadDone: false,
      searchQuery: '',
      markForCheck,
      prepareTourInitialState,
      clearListSearchDebouncer,
      handleSearch,
    };

    await runEmailSubscribersOverviewTourListState(host);

    expect(host.searchQuery).toBe('app-test');
    expect(host.sectionExpanded).toBe(true);
    expect(host.sectionInitialLoadDone).toBe(true);
    expect(prepareTourInitialState).toHaveBeenCalled();
    expect(clearListSearchDebouncer).toHaveBeenCalled();
    expect(handleSearch).toHaveBeenCalled();
    expect(markForCheck).toHaveBeenCalled();
  });
});
