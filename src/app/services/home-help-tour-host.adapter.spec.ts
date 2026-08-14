import { describe, it, expect, vi, beforeEach } from "vitest";
import { of } from "rxjs";
import { HomeHelpTourHostAdapter } from "./home-help-tour-host.adapter";
import { PERSONAL_PRAYER_WALKTHROUGH_CATEGORY } from "./help-driver-tour.service";

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

  beforeEach(() => {
    vi.clearAllMocks();
    refreshHomeCatalog.mockClear();
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

  it("narrowToWalkthroughCategoryFilter updates personal category bindings", () => {
    adapter.narrowToWalkthroughCategoryFilter();
    expect(bindings.setPersonalCategoryFilterMode).toHaveBeenCalledWith("named");
    expect(bindings.setSelectedPersonalCategories).toHaveBeenCalledWith([
      PERSONAL_PRAYER_WALKTHROUGH_CATEGORY,
    ]);
    expect(refreshHomeCatalog).toHaveBeenCalled();
  });
});
