import { describe, it, expect, vi, beforeEach } from "vitest";
import { of } from "rxjs";
import { HomeHelpTourHostAdapter } from "./home-help-tour-host.adapter";
import {
  GROUPS_WALKTHROUGH_GROUP_NAME,
  PERSONAL_PRAYER_WALKTHROUGH_CATEGORY,
} from "./help-driver-tour.service";
import type { GroupsWalkthroughCleanupGroup } from "../lib/groups-walkthrough-cleanup";

describe("HomeHelpTourHostAdapter", () => {
  const bindings = {
    getActiveFilter: vi.fn(() => "current" as const),
    getPromptsCount: vi.fn(() => 3),
    getMemorizedItemsCount: vi.fn(() => 2),
    getSelectedPromptTypes: vi.fn(() => ["Morning"]),
    setSelectedPromptTypes: vi.fn(),
    getPersonalCategoryFilterMode: vi.fn(() => "current" as const),
    setPersonalCategoryFilterMode: vi.fn(),
    getSelectedPersonalCategories: vi.fn(() => [] as string[]),
    setSelectedPersonalCategories: vi.fn(),
    closeHelp: vi.fn(),
    openPrayerForm: vi.fn(),
    closePrayerForm: vi.fn(),
    closeWalkthroughPersonalEdit: vi.fn(),
  };

  let adapter: HomeHelpTourHostAdapter;
  const refreshHomeCatalog = vi.fn();
  const groups: GroupsWalkthroughCleanupGroup[] = [];
  const deleteGroup = vi.fn(async (id: string) => {
    const index = groups.findIndex((group) => group.id === id);
    if (index >= 0) {
      groups.splice(index, 1);
    }
  });
  const refreshCatalogAfterWrite = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    refreshHomeCatalog.mockClear();
    groups.splice(0, groups.length);
    adapter = new HomeHelpTourHostAdapter({
      bindings,
      router: { navigate: vi.fn() } as any,
      userSessionService: { getCurrentSession: vi.fn(() => null) } as any,
      prayers$: of([]),
      prayerCardActions: { deleteCard: vi.fn() } as any,
      markForCheck: vi.fn(),
      setFilter: vi.fn(),
      openUserSettings: vi.fn(),
      closeUserSettings: vi.fn(),
      openEditModal: vi.fn(),
      getFilteredPersonalPrayers: vi.fn(() => []),
      getPrayerFormHooks: vi.fn(() => null),
      refreshHomeCatalog,
      prayerGroupService: {
        getGroupsSnapshot: () => groups,
        deleteGroup,
        refreshCatalogAfterWrite,
      },
      getGroupsPanel: () => null,
      openNewGroupPrayer: vi.fn(),
    });
  });

  it("delegates modal state through bindings", () => {
    adapter.closeHelp();
    adapter.openPrayerForm();
    adapter.closePrayerForm();
    expect(bindings.closeHelp).toHaveBeenCalled();
    expect(bindings.openPrayerForm).toHaveBeenCalled();
    expect(bindings.closePrayerForm).toHaveBeenCalled();
  });

  it("clearSelectedPromptTypes rebuilds catalog", () => {
    adapter.clearSelectedPromptTypes();
    expect(bindings.setSelectedPromptTypes).toHaveBeenCalledWith([]);
    expect(refreshHomeCatalog).toHaveBeenCalled();
  });

  it("deletes only a solo owner walkthrough group, and a second run deletes nothing", async () => {
    groups.push(
      {
        id: "sample",
        name: GROUPS_WALKTHROUGH_GROUP_NAME,
        role: "owner",
        memberCount: 1,
      },
      { id: "family", name: "Family", role: "owner", memberCount: 1 },
      {
        id: "shared-name",
        name: GROUPS_WALKTHROUGH_GROUP_NAME,
        role: "owner",
        memberCount: 2,
      },
      {
        id: "member-sample",
        name: GROUPS_WALKTHROUGH_GROUP_NAME,
        role: "member",
        memberCount: 1,
      },
    );

    await adapter.deleteWalkthroughSampleGroups();
    await adapter.deleteWalkthroughSampleGroups();

    expect(deleteGroup.mock.calls.map((call) => call[0])).toEqual(["sample"]);
    expect(groups.map((group) => group.id)).toEqual([
      "family",
      "shared-name",
      "member-sample",
    ]);
  });

  it("still deletes a listed sample group when the catalog reload fails", async () => {
    groups.push({
      id: "sample",
      name: GROUPS_WALKTHROUGH_GROUP_NAME,
      role: "owner",
      memberCount: 1,
    });
    refreshCatalogAfterWrite.mockRejectedValueOnce(new Error("offline"));

    await adapter.deleteWalkthroughSampleGroups();

    expect(groups.map((group) => group.id)).toEqual([]);
  });

  it("finds the sample group only after the catalog reload lists it", async () => {
    groups.push({ id: "family", name: "Family", role: "owner", memberCount: 1 });
    refreshCatalogAfterWrite.mockImplementationOnce(async () => {
      groups.push({
        id: "sample",
        name: GROUPS_WALKTHROUGH_GROUP_NAME,
        role: "owner",
        memberCount: 1,
      });
    });

    expect(await adapter.findWalkthroughGroupId()).toBe("sample");
  });

  it("narrowToWalkthroughCategoryFilter updates personal category bindings", () => {
    adapter.narrowToWalkthroughCategoryFilter();
    expect(bindings.setPersonalCategoryFilterMode).toHaveBeenCalledWith("named");
    expect(bindings.setSelectedPersonalCategories).toHaveBeenCalledWith([
      PERSONAL_PRAYER_WALKTHROUGH_CATEGORY,
    ]);
    expect(refreshHomeCatalog).toHaveBeenCalled();
  });
});
