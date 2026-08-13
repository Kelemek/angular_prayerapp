import { describe, it, expect } from "vitest";
import { communityPrayerRowToPrayerRequest } from "./community-prayer-row-mapper";

describe("communityPrayerRowToPrayerRequest", () => {
  it("maps approved updates and defaults title/requester", () => {
    const prayer = communityPrayerRowToPrayerRequest({
      id: "p1",
      prayer_for: "Alex",
      description: "Please pray",
      status: "current",
      created_at: "2026-01-01T00:00:00Z",
      prayer_updates: [
        {
          id: "u1",
          content: "Update",
          author: "Sam",
          created_at: "2026-01-02T00:00:00Z",
          approval_status: "approved",
        },
        {
          id: "u2",
          content: "Pending",
          author: "Sam",
          created_at: "2026-01-03T00:00:00Z",
          approval_status: "pending",
        },
      ],
    });

    expect(prayer.title).toBe("Prayer for Alex");
    expect(prayer.requester).toBe("");
    expect(prayer.updates).toHaveLength(1);
    expect(prayer.updates[0].id).toBe("u1");
    expect(prayer.date_requested).toBe("2026-01-01T00:00:00Z");
  });
});
