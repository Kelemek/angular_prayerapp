import { describe, expect, it } from "vitest";
import type { PrayerRequest } from "../services/prayer.service";
import {
  filterCommunityPrayersByStatus,
  filterPersonalPrayersByStatus,
} from "./presentation-content-filter";

function communityPrayer(
  id: string,
  status: PrayerRequest["status"]
): PrayerRequest {
  return {
    id,
    status,
    title: id,
    description: "",
    requester: "",
    prayer_for: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    date_requested: "2026-01-01T00:00:00.000Z",
    updates: [],
  };
}

describe("filterCommunityPrayersByStatus", () => {
  const prayers = [
    communityPrayer("c", "current"),
    communityPrayer("a", "answered"),
    communityPrayer("ar", "archived"),
  ];

  it("returns only archived prayers when archived is the sole active flag", () => {
    const result = filterCommunityPrayersByStatus(prayers, {
      current: false,
      answered: false,
      archived: true,
    });
    expect(result.map((p) => p.id)).toEqual(["ar"]);
  });

  it("returns all prayers when every status flag is false", () => {
    const result = filterCommunityPrayersByStatus(prayers, {
      current: false,
      answered: false,
      archived: false,
    });
    expect(result).toHaveLength(3);
  });
});

describe("filterPersonalPrayersByStatus", () => {
  it("ignores archived flag (personal uses category Answered)", () => {
    const prayers = [
      { ...communityPrayer("p1", "current"), category: "Morning" },
      { ...communityPrayer("p2", "current"), category: "Answered" },
    ] as PrayerRequest[];

    const result = filterPersonalPrayersByStatus(prayers, {
      current: false,
      answered: false,
      archived: true,
    });
    expect(result).toHaveLength(0);
  });
});
