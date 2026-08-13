import { describe, it, expect, vi } from "vitest";
import { PresentationSettingsCoordinator } from "./presentation-settings.coordinator";

describe("PresentationSettingsCoordinator", () => {
  it("loads persisted settings into page state", () => {
    const service = {
      load: vi.fn(() => ({
        contentTypes: ["prompts"],
        randomize: true,
        smartMode: false,
        displayDuration: 25,
        loop: false,
        timeFilter: "week",
        statusFilters: { current: false, answered: true },
        prayerTimerMinutes: 15,
      })),
      save: vi.fn(),
    };
    const coordinator = new PresentationSettingsCoordinator(service as any);
    const page = {
      contentTypes: ["prayers"] as const,
      randomize: false,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: "all" as const,
      statusFilters: { current: true, answered: true },
      prayerTimerMinutes: 10,
    };

    coordinator.loadInto(page);

    expect(page.contentTypes).toEqual(["prompts"]);
    expect(page.randomize).toBe(true);
    expect(page.displayDuration).toBe(25);
    expect(page.loop).toBe(false);
    expect(page.prayerTimerMinutes).toBe(15);
  });

  it("persists a snapshot of page state", () => {
    const service = { load: vi.fn(), save: vi.fn() };
    const coordinator = new PresentationSettingsCoordinator(service as any);
    const page = {
      contentTypes: ["personal"] as const,
      randomize: false,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: "month" as const,
      statusFilters: { current: true, answered: false },
      prayerTimerMinutes: 20,
    };

    coordinator.persistFrom(page);

    expect(service.save).toHaveBeenCalledWith({
      contentTypes: ["personal"],
      randomize: false,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: "month",
      statusFilters: { current: true, answered: false },
      prayerTimerMinutes: 20,
    });
  });

  it("loadInto copies settings without mutating the service snapshot", () => {
    const loaded = {
      contentTypes: ["prayers", "prompts"] as const,
      randomize: true,
      smartMode: false,
      displayDuration: 12,
      loop: false,
      timeFilter: "week" as const,
      statusFilters: { current: false, answered: true },
      prayerTimerMinutes: 8,
    };
    const service = { load: vi.fn(() => loaded), save: vi.fn() };
    const coordinator = new PresentationSettingsCoordinator(service as any);
    const page = {
      contentTypes: ["personal"] as const,
      randomize: false,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: "all" as const,
      statusFilters: { current: true, answered: true },
      prayerTimerMinutes: 10,
    };

    coordinator.loadInto(page);

    expect(page.contentTypes).toEqual(["prayers", "prompts"]);
    expect(page.contentTypes).not.toBe(loaded.contentTypes);
    expect(page.statusFilters).toEqual({ current: false, answered: true });
    expect(page.statusFilters).not.toBe(loaded.statusFilters);
  });

  it("applyAndPersist patches page state and saves", () => {
    const service = { load: vi.fn(), save: vi.fn() };
    const coordinator = new PresentationSettingsCoordinator(service as any);
    const page = {
      contentTypes: ["prayers"] as const,
      randomize: false,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: "all" as const,
      statusFilters: { current: true, answered: true },
      prayerTimerMinutes: 10,
    };

    coordinator.applyAndPersist(page, { smartMode: false, loop: false });

    expect(page.smartMode).toBe(false);
    expect(page.loop).toBe(false);
    expect(service.save).toHaveBeenCalledWith(
      expect.objectContaining({ smartMode: false, loop: false })
    );
  });
});
