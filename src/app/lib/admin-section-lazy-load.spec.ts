import { describe, it, expect, vi } from 'vitest';
import {
  applyAdminSectionToggle,
  toggleAdminSectionLazyLoad,
} from './admin-section-lazy-load';

describe('toggleAdminSectionLazyLoad', () => {
  it('expands collapsed section without initial load when already loaded', () => {
    const result = toggleAdminSectionLazyLoad({
      sectionExpanded: false,
      sectionInitialLoadDone: true,
    });
    expect(result.gate.sectionExpanded).toBe(true);
    expect(result.gate.sectionInitialLoadDone).toBe(true);
    expect(result.shouldInitialLoad).toBe(false);
  });

  it('runs initial load on first expand', () => {
    const result = toggleAdminSectionLazyLoad({
      sectionExpanded: false,
      sectionInitialLoadDone: false,
    });
    expect(result.gate.sectionExpanded).toBe(true);
    expect(result.gate.sectionInitialLoadDone).toBe(true);
    expect(result.shouldInitialLoad).toBe(true);
  });

  it('collapses without clearing initial load flag', () => {
    const result = toggleAdminSectionLazyLoad({
      sectionExpanded: true,
      sectionInitialLoadDone: true,
    });
    expect(result.gate.sectionExpanded).toBe(false);
    expect(result.gate.sectionInitialLoadDone).toBe(true);
    expect(result.shouldInitialLoad).toBe(false);
  });
});

describe('applyAdminSectionToggle', () => {
  it('runs initial load callback on first expand', () => {
    const host = {
      sectionExpanded: false,
      sectionInitialLoadDone: false,
      markForCheck: vi.fn(),
    };
    const onInitialLoad = vi.fn();

    applyAdminSectionToggle(host, onInitialLoad);

    expect(host.sectionExpanded).toBe(true);
    expect(host.sectionInitialLoadDone).toBe(true);
    expect(onInitialLoad).toHaveBeenCalled();
    expect(host.markForCheck).toHaveBeenCalled();
  });
});
