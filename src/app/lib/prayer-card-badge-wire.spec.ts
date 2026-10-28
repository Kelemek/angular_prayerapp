import { describe, it, expect, vi } from "vitest";
import { PrayerCardBadgeWire } from "./prayer-card-badge-wire";
import type { PrayerRequest } from "../services/prayer.service";

const prayer = (id: string, updateIds: string[] = []): PrayerRequest =>
  ({
    id,
    prayer_for: "Someone",
    description: "Please pray",
    status: "current",
    created_at: "2026-01-01",
    updates: updateIds.map((updateId) => ({
      id: updateId,
      content: "Update",
      created_at: "2026-01-02",
    })),
  }) as PrayerRequest;

describe("PrayerCardBadgeWire", () => {
  it("rebinds prayer and update badges when virtual scroll reuses a row for another prayer", () => {
    let currentPrayer = prayer("prayer-a", ["update-a"]);
    const badgeService = {
      isPrayerUnread: vi.fn((id: string) => id === "prayer-b"),
      isUpdateUnread: vi.fn((id: string) => id === "update-b"),
      getUpdateBadgesChanged$: vi.fn(),
    };

    const wire = new PrayerCardBadgeWire(
      badgeService as any,
      () => currentPrayer
    );

    wire.rebindPrayer(prayer("prayer-a", ["update-a"]));
    expect(wire.updateBadges$.has("update-a")).toBe(true);
    expect(wire.updateBadges$.get("update-a")?.value).toBe(false);

    currentPrayer = prayer("prayer-b", ["update-b"]);
    wire.rebindPrayer(currentPrayer);

    expect(wire.updateBadges$.has("update-a")).toBe(false);
    expect(wire.updateBadges$.has("update-b")).toBe(true);
    expect(badgeService.isPrayerUnread).toHaveBeenCalledWith("prayer-b", undefined);
    expect(badgeService.isUpdateUnread).toHaveBeenCalledWith("update-b", undefined);
  });

  it("passes requester and update author emails so own content is not badged", () => {
    const ownPrayer = {
      ...prayer("prayer-a"),
      email: "me@example.com",
      updates: [
        { id: "update-a", content: "Update", created_at: "2026-01-02", author_email: "me@example.com" },
      ],
    } as PrayerRequest;
    const badgeService = {
      isPrayerUnread: vi.fn(() => false),
      isUpdateUnread: vi.fn(() => false),
      getUpdateBadgesChanged$: vi.fn(),
    };

    const wire = new PrayerCardBadgeWire(badgeService as any, () => ownPrayer);
    wire.rebindPrayer(ownPrayer);

    expect(badgeService.isPrayerUnread).toHaveBeenCalledWith("prayer-a", "me@example.com");
    expect(badgeService.isUpdateUnread).toHaveBeenCalledWith("update-a", "me@example.com");
  });

  it("clears stale unread state before syncing the new prayer on id change", () => {
    let currentPrayer = prayer("prayer-a");
    const badgeService = {
      isPrayerUnread: vi.fn(() => false),
      isUpdateUnread: vi.fn(() => false),
      getUpdateBadgesChanged$: vi.fn(),
    };

    const wire = new PrayerCardBadgeWire(
      badgeService as any,
      () => currentPrayer
    );
    wire.rebindPrayer(currentPrayer);
    (wire as any).prayerBadgeSubject$.next(true);

    currentPrayer = prayer("prayer-b");
    wire.onPrayerChanged(prayer("prayer-a"), currentPrayer);

    let latest = false;
    wire.prayerBadge$.subscribe((value) => {
      latest = value;
    });
    expect(latest).toBe(false);
  });
});
