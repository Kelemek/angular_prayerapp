import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { HomeGroupsPanelComponent } from './home-groups-panel.component';
import type { PrayerGroupService } from '../../services/prayer-group.service';

describe('HomeGroupsPanelComponent groups tab chip state', () => {
  let groupsApi: {
    groups$: BehaviorSubject<unknown[]>;
    prayers$: BehaviorSubject<unknown[]>;
    updates$: BehaviorSubject<unknown[]>;
    loading$: BehaviorSubject<boolean>;
    error$: BehaviorSubject<string | null>;
    groupDeepLinkApply$: Subject<void>;
    groupsTabReturnApplied$: Subject<void>;
    groupsTabFilterMode: 'current' | 'answered' | 'total' | 'named';
    groupsTabSelectedGroupId: string | null;
    preferredGroupId: string | null;
  };

  const deepLinks = {
    peekPendingGroupId: vi.fn(() => null as string | null),
    consumePendingGroupId: vi.fn(),
  };

  function createPanel(): HomeGroupsPanelComponent {
    return new HomeGroupsPanelComponent(
      groupsApi as unknown as PrayerGroupService,
      {} as never,
      { error: vi.fn() } as never,
      {} as never,
      deepLinks as never,
      { markForCheck: vi.fn() } as unknown as ChangeDetectorRef,
      { onDestroy: vi.fn() } as unknown as DestroyRef,
    );
  }

  beforeEach(() => {
    groupsApi = {
      groups$: new BehaviorSubject([]),
      prayers$: new BehaviorSubject([]),
      updates$: new BehaviorSubject([]),
      loading$: new BehaviorSubject(false),
      error$: new BehaviorSubject(null),
      groupDeepLinkApply$: new Subject(),
      groupsTabReturnApplied$: new Subject(),
      groupsTabFilterMode: 'named',
      groupsTabSelectedGroupId: 'group-42',
      preferredGroupId: 'group-42',
      pendingPrayerDeepLinkId: null,
    };
  });

  it('restores chip filter from PrayerGroupService when the panel is created', () => {
    const panel = createPanel();
    expect(panel.filterMode).toBe('named');
    expect(panel.selectedId).toBe('group-42');
  });

  it('restores chip filter when presentation return context is applied', () => {
    const panel = createPanel();
    panel.filterMode = 'current';
    panel.selectedId = null;
    groupsApi.groupsTabFilterMode = 'answered';
    groupsApi.groupsTabSelectedGroupId = null;
    groupsApi.groupsTabReturnApplied$.next();
    expect(panel.filterMode).toBe('answered');
    expect(panel.selectedId).toBeNull();
  });
});
