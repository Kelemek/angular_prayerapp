import { describe, it, expect } from "vitest";
import {
  filterPrayersByPresentationTimeFilter,
  presentationTimeFilterStartDate,
  prayerHasActivityInTimeWindow,
} from "./presentation-time-filter";

describe("presentationTimeFilterStartDate", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");

  it("returns null for all", () => {
    expect(presentationTimeFilterStartDate("all", now)).toBeNull();
  });

  it("uses calendar month for month filter", () => {
    const start = presentationTimeFilterStartDate("month", now)!;
    expect(start.getUTCFullYear()).toBe(2026);
    expect(start.getUTCMonth()).toBe(1);
    expect(start.getUTCDate()).toBe(15);
  });

  it("uses calendar year for year filter", () => {
    const start = presentationTimeFilterStartDate("year", now)!;
    expect(start.getUTCFullYear()).toBe(2025);
    expect(start.getUTCMonth()).toBe(2);
    expect(start.getUTCDate()).toBe(15);
  });
});

describe("prayerHasActivityInTimeWindow", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");
  const start = new Date("2026-03-08T12:00:00.000Z");

  it("includes prayers with recent updates even when created earlier", () => {
    expect(
      prayerHasActivityInTimeWindow(
        {
          created_at: "2026-01-01T00:00:00.000Z",
          updates: [{ created_at: "2026-03-10T00:00:00.000Z" }],
        },
        start,
        now
      )
    ).toBe(true);
  });

  it("excludes prayers with no activity in the window", () => {
    expect(
      prayerHasActivityInTimeWindow(
        {
          created_at: "2026-01-01T00:00:00.000Z",
          updates: [{ created_at: "2026-02-01T00:00:00.000Z" }],
        },
        start,
        now
      )
    ).toBe(false);
  });
});

describe("filterPrayersByPresentationTimeFilter", () => {
  it("uses calendar month semantics consistently", () => {
    const now = new Date("2026-03-15T12:00:00.000Z");
    const prayers = [
      {
        created_at: "2026-02-20T00:00:00.000Z",
        updates: [] as Array<{ created_at: string }>,
      },
      {
        created_at: "2026-01-01T00:00:00.000Z",
        updates: [{ created_at: "2026-02-25T00:00:00.000Z" }],
      },
    ];

    const filtered = filterPrayersByPresentationTimeFilter(
      prayers,
      "month",
      now
    );

    expect(filtered).toHaveLength(2);
  });
});
