import { describe, expect, it, vi } from "vitest";
import { runPersonalPrayerCatalogLoad } from "./prayer-personal-load-wire";
import type { PrayerRequest } from "./prayer-types";

describe("prayer-personal-load-wire", () => {
  it("runPersonalPrayerCatalogLoad skips DB on silent refresh when cache exists", async () => {
    const fetchFromDb = vi.fn();
    const setPersonalPrayers = vi.fn();
    const cached = [{ id: "1" } as PrayerRequest];

    await runPersonalPrayerCatalogLoad(
      {
        getUserEmail: vi.fn().mockResolvedValue("me@test.com"),
        readCache: () => cached,
        invalidateCache: vi.fn(),
        setLoading: vi.fn(),
        markFetchComplete: vi.fn(),
        setPersonalPrayers,
        clearPersonalPrayersInMemory: vi.fn(),
        cacheSnapshotActions: () => ({
          normalize: (prayers) => prayers,
          setPersonalPrayers,
          dropAnsweredReminders: vi.fn(),
        }),
        fetchFromDb,
        dropAnsweredReminders: vi.fn(),
      },
      true
    );

    expect(fetchFromDb).not.toHaveBeenCalled();
    expect(setPersonalPrayers).toHaveBeenCalledWith(cached);
  });

  it("runPersonalPrayerCatalogLoad fetches from DB when cache miss", async () => {
    const prayers = [{ id: "1" } as PrayerRequest];
    const fetchFromDb = vi.fn().mockResolvedValue(prayers);
    const setPersonalPrayers = vi.fn();

    await runPersonalPrayerCatalogLoad({
      getUserEmail: vi.fn().mockResolvedValue("me@test.com"),
      readCache: () => null,
      invalidateCache: vi.fn(),
      setLoading: vi.fn(),
      markFetchComplete: vi.fn(),
      setPersonalPrayers,
      clearPersonalPrayersInMemory: vi.fn(),
      cacheSnapshotActions: () => ({
        normalize: (prayers) => prayers,
        setPersonalPrayers,
        dropAnsweredReminders: vi.fn(),
      }),
      fetchFromDb,
      dropAnsweredReminders: vi.fn(),
    });

    expect(fetchFromDb).toHaveBeenCalledWith("me@test.com");
    expect(setPersonalPrayers).toHaveBeenCalledWith(prayers);
  });

  it("runPersonalPrayerCatalogLoad discards mismatched cache without writing empty cache", async () => {
    const cached = [
      {
        id: "old",
        email: "other@test.com",
        requester: "other@test.com",
      } as PrayerRequest,
    ];
    const fetchFromDb = vi.fn().mockRejectedValue(new Error("db down"));
    const setPersonalPrayers = vi.fn();
    const clearPersonalPrayersInMemory = vi.fn();
    const invalidateCache = vi.fn();

    await runPersonalPrayerCatalogLoad({
      getUserEmail: vi.fn().mockResolvedValue("me@test.com"),
      readCache: () => cached,
      invalidateCache,
      setLoading: vi.fn(),
      markFetchComplete: vi.fn(),
      setPersonalPrayers,
      clearPersonalPrayersInMemory,
      cacheSnapshotActions: () => ({
        normalize: (prayers) => prayers,
        setPersonalPrayers,
        dropAnsweredReminders: vi.fn(),
      }),
      fetchFromDb,
      dropAnsweredReminders: vi.fn(),
    });

    expect(invalidateCache).toHaveBeenCalled();
    expect(clearPersonalPrayersInMemory).toHaveBeenCalled();
    expect(setPersonalPrayers).not.toHaveBeenCalledWith([]);
  });
});
