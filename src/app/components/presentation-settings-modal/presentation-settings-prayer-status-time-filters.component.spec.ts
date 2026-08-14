import { describe, it, expect, vi, beforeEach } from "vitest";
import { PresentationSettingsPrayerStatusTimeFiltersComponent } from "./presentation-settings-prayer-status-time-filters.component";
import { PresentationPrayerStatusFilterField } from "../../lib/presentation-settings-prayer-status-filter-field";

describe("PresentationSettingsPrayerStatusTimeFiltersComponent", () => {
  let component: PresentationSettingsPrayerStatusTimeFiltersComponent;

  beforeEach(() => {
    component = new PresentationSettingsPrayerStatusTimeFiltersComponent();
    component.statusField = new PresentationPrayerStatusFilterField({
      getStatusFilters: () => ({ current: true, answered: true }),
      getAvailable: () => ["current", "answered", "archived"],
      emit: vi.fn(),
      closeOther: vi.fn(),
    });
  });

  it("should create with required status field", () => {
    expect(component).toBeTruthy();
    expect(component.statusField).toBeTruthy();
  });
});
