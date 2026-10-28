import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  ChangeDetectorRef,
  DestroyRef,
  ɵresolveComponentResources as resolveComponentResources,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HomeGroupsPanelComponent } from './home-groups-panel.component';
import { TOUR_GROUP_CHIP_FIRST_ID } from '../../lib/help-tour-ids';
import {
  PrayerGroupService,
  type PrayerGroupSummary,
} from '../../services/prayer-group.service';
import {
  modalShellOverlayText,
  modalShellQueryAll,
} from '../modal-shell/modal-shell-test-dom';
import { resetModalShellScrollLockForTests } from '../modal-shell/modal-shell-scroll-lock';

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

  it('includes Settings in the owner overflow menu only', () => {
    const panel = createPanel();
    const ownerItems = panel.overflowItems({
      id: 'g1',
      name: 'Family',
      color: '#2563EB',
      role: 'owner',
      memberCount: 2,
      updatesRequesterOnly: false,
      answeredRequesterOnly: false,
      prayForDisabled: false,
    });
    expect(ownerItems.some((item) => item.id === 'settings')).toBe(true);
    const memberItems = panel.overflowItems({
      id: 'g1',
      name: 'Family',
      color: '#2563EB',
      role: 'member',
      memberCount: 2,
      updatesRequesterOnly: false,
      answeredRequesterOnly: false,
      prayForDisabled: false,
    });
    expect(memberItems.some((item) => item.id === 'settings')).toBe(false);
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

describe('HomeGroupsPanelComponent add chooser', () => {
  const componentDir = dirname(fileURLToPath(import.meta.url));
  const resourcesByName = new Map<string, string[]>();

  beforeAll(async () => {
    const stack = [join(process.cwd(), 'src')];
    while (stack.length > 0) {
      const dir = stack.pop();
      if (!dir) continue;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue;
          stack.push(full);
          continue;
        }
        const matches = resourcesByName.get(entry.name) ?? [];
        matches.push(full);
        resourcesByName.set(entry.name, matches);
      }
    }
    await resolveComponentResources((url) => {
      const local = join(componentDir, url);
      if (existsSync(local)) {
        return Promise.resolve(readFileSync(local, 'utf-8'));
      }
      const base = url.split('/').pop() ?? url;
      const matches = resourcesByName.get(base) ?? [];
      if (matches.length !== 1) {
        throw new Error(`Component resource not found: ${url}`);
      }
      return Promise.resolve(readFileSync(matches[0], 'utf-8'));
    });
  });

  afterEach(() => {
    resetModalShellScrollLockForTests();
    document.body.style.overflow = '';
  });

  function summary(id: string, name: string): PrayerGroupSummary {
    return {
      id,
      name,
      color: '#2563EB',
      role: 'owner',
      memberCount: 2,
      updatesRequesterOnly: false,
      answeredRequesterOnly: false,
      prayForDisabled: false,
    };
  }

  function choiceButton(label: string): HTMLButtonElement {
    const match = modalShellQueryAll<HTMLButtonElement>('button').find((button) =>
      button.textContent?.includes(label),
    );
    if (!match) {
      throw new Error(`missing choice ${label}`);
    }
    return match;
  }

  async function renderPanel(options: {
    groups: PrayerGroupSummary[];
    selectedId: string | null;
    preferredGroupId: string | null;
    isChurchMember?: boolean;
    loading?: boolean;
  }) {
    const groupsApi = {
      groups$: new BehaviorSubject(options.groups),
      prayers$: new BehaviorSubject([]),
      updates$: new BehaviorSubject([]),
      loading$: new BehaviorSubject(options.loading ?? false),
      error$: new BehaviorSubject<string | null>(null),
      groupDeepLinkApply$: new Subject<void>(),
      groupsTabReturnApplied$: new Subject<void>(),
      groupsTabFilterMode: 'current' as const,
      groupsTabSelectedGroupId: options.selectedId,
      preferredGroupId: options.preferredGroupId,
      pendingPrayerDeepLinkId: null as string | null,
    };
    const panel = new HomeGroupsPanelComponent(
      groupsApi as unknown as PrayerGroupService,
      {} as never,
      { error: vi.fn(), success: vi.fn() } as never,
      {} as never,
      { peekPendingGroupId: () => null, consumePendingGroupId: vi.fn() } as never,
      { markForCheck: vi.fn() } as unknown as ChangeDetectorRef,
      { onDestroy: vi.fn() } as unknown as DestroyRef,
    );
    panel.isChurchMember = options.isChurchMember ?? true;
    const cmp = (
      HomeGroupsPanelComponent as unknown as {
        ɵcmp: { factory: () => HomeGroupsPanelComponent };
      }
    ).ɵcmp;
    const previousFactory = cmp.factory;
    // Vitest strips constructor tokens, so TestBed cannot inject this class.
    cmp.factory = () => panel;
    let fixture: ReturnType<typeof TestBed.createComponent<HomeGroupsPanelComponent>>;
    try {
      TestBed.configureTestingModule({ imports: [HomeGroupsPanelComponent] });
      fixture = TestBed.createComponent(HomeGroupsPanelComponent);
    } finally {
      cmp.factory = previousFactory;
    }
    fixture.detectChanges();
    return fixture;
  }

  it('marks group peer chips for mobile nav text lock', async () => {
    const fixture = await renderPanel({
      groups: [summary('g1', 'testing')],
      selectedId: 'g1',
      preferredGroupId: 'g1',
    });
    const labelButton = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((el: HTMLButtonElement) =>
      el.textContent?.includes('testing'),
    ) as HTMLButtonElement;
    expect(labelButton).toBeTruthy();
    expect(labelButton.parentElement?.className).toContain(
      'home-nav-chip-text-lock',
    );
    expect(fixture.nativeElement.querySelector(`#${TOUR_GROUP_CHIP_FIRST_ID}`)).toBe(
      labelButton.parentElement?.parentElement,
    );
    fixture.destroy();
  });

  it('opens the chooser from + without creating a group', async () => {
    const fixture = await renderPanel({
      groups: [summary('g1', 'Family')],
      selectedId: 'g1',
      preferredGroupId: 'g1',
    });
    const add = fixture.nativeElement.querySelector(
      '#tour-filter-add-group',
    ) as HTMLButtonElement;
    expect(add.getAttribute('aria-label')).toBe('Add a prayer or group');
    add.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.createOpen).toBe(false);
    expect(modalShellOverlayText()).toContain('Add to Groups');
    expect(modalShellOverlayText()).toContain('New prayer');
    expect(modalShellOverlayText()).toContain('New group');
    fixture.destroy();
  });

  it('opens the create-group flow when New group is chosen', async () => {
    const fixture = await renderPanel({
      groups: [summary('g1', 'Family')],
      selectedId: 'g1',
      preferredGroupId: 'g1',
    });
    (
      fixture.nativeElement.querySelector('#tour-filter-add-group') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    choiceButton('New group').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.createOpen).toBe(true);
    fixture.destroy();
  });

  it('emits the selected group when New prayer is chosen', async () => {
    const fixture = await renderPanel({
      groups: [summary('g1', 'Family'), summary('g2', 'Work')],
      selectedId: 'g1',
      preferredGroupId: 'g2',
    });
    const addPrayer = vi.fn();
    fixture.componentInstance.addPrayer.subscribe(addPrayer);
    (
      fixture.nativeElement.querySelector('#tour-filter-add-group') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    choiceButton('New prayer').click();
    expect(addPrayer).toHaveBeenCalledWith({ groupId: 'g1' });
    fixture.destroy();
  });

  it('emits the preferred group when no group chip is selected', async () => {
    const fixture = await renderPanel({
      groups: [summary('g-pref', 'Family')],
      selectedId: null,
      preferredGroupId: 'g-pref',
    });
    const addPrayer = vi.fn();
    fixture.componentInstance.addPrayer.subscribe(addPrayer);
    (
      fixture.nativeElement.querySelector('#tour-filter-add-group') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    choiceButton('New prayer').click();
    expect(addPrayer).toHaveBeenCalledWith({ groupId: 'g-pref' });
    fixture.destroy();
  });

  it('disables New prayer and emits nothing when there are no groups', async () => {
    const fixture = await renderPanel({
      groups: [],
      selectedId: null,
      preferredGroupId: null,
    });
    const addPrayer = vi.fn();
    fixture.componentInstance.addPrayer.subscribe(addPrayer);
    (
      fixture.nativeElement.querySelector('#tour-filter-add-group') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const prayer = choiceButton('New prayer');
    expect(prayer.disabled).toBe(true);
    expect(prayer.textContent).toContain('Create a group first');
    prayer.click();
    expect(addPrayer).not.toHaveBeenCalled();
    expect(fixture.componentInstance.createOpen).toBe(false);
    fixture.destroy();
  });

  it('says groups are loading instead of create a group first while the catalog loads', async () => {
    const fixture = await renderPanel({
      groups: [],
      selectedId: null,
      preferredGroupId: null,
      loading: true,
    });
    (
      fixture.nativeElement.querySelector('#tour-filter-add-group') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const prayer = choiceButton('New prayer');
    expect(prayer.disabled).toBe(true);
    expect(prayer.textContent).toContain('Loading groups');
    expect(prayer.textContent).not.toContain('Create a group first');
    fixture.destroy();
  });

  it('hides + for a person who is not a church member', async () => {
    const fixture = await renderPanel({
      groups: [],
      selectedId: null,
      preferredGroupId: null,
      isChurchMember: false,
    });
    expect(fixture.nativeElement.querySelector('#tour-filter-add-group')).toBeNull();
    fixture.destroy();
  });
});
