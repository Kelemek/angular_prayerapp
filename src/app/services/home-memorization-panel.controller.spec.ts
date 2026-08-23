import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomeMemorizationPanelController } from "./home-memorization-panel.controller";
import type { MemorizedItem } from "../types/memorization";

describe("HomeMemorizationPanelController", () => {
  let controller: HomeMemorizationPanelController;
  let host: {
    markForCheck: ReturnType<typeof vi.fn>;
    detectChanges: ReturnType<typeof vi.fn>;
    primeKeyboardBridge: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    controller = new HomeMemorizationPanelController();
    host = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
      primeKeyboardBridge: vi.fn(),
    };
    controller.bindHost(host, {
      memorizationService: {
        getPreferredTranslation: vi.fn(() => "esv"),
        loadItems: vi.fn().mockResolvedValue(undefined),
        addVerse: vi.fn().mockResolvedValue({ ok: true }),
        items: [],
        updatePracticeStats: vi.fn(),
        saveInProgress: vi.fn(),
        clearInProgress: vi.fn(),
        removeItem: vi.fn(),
      } as any,
      memorizationRecommendationsService: {
        load: vi.fn().mockResolvedValue(undefined),
        groupedSnapshot: [],
      } as any,
      scriptureService: {
        getPassage: vi.fn().mockResolvedValue({ text: "For God so loved..." }),
      } as any,
      toastService: {
        success: vi.fn(),
        error: vi.fn(),
      } as any,
    });
  });

  it("syncMemorizedItems updates counts and owned recommendation keys", () => {
    controller.syncMemorizedItems([
      {
        id: "1",
        reference: "John 3:16",
        translation: "esv",
        kind: "verse",
      } as MemorizedItem,
    ]);
    expect(controller.memorizedItemsCount).toBe(1);
    expect(controller.memorizationRecommendationOwnedKeys).toEqual(
      new Set(["esv:John 3:16"])
    );
  });

  it("openMemorizationPractice primes keyboard bridge for in-progress type sessions", () => {
    const item = {
      id: "v1",
      inProgressPractice: { phase: { kind: "inRound" }, practiceMode: "type" },
    } as MemorizedItem;
    controller.openMemorizationPractice(item);
    expect(host.primeKeyboardBridge).toHaveBeenCalled();
    expect(controller.practiceMemorizedItem).toEqual(item);
    expect(host.detectChanges).toHaveBeenCalled();
  });

  it("closeMemorizationPractice clears active practice item", () => {
    controller.practiceMemorizedItem = { id: "v1" } as MemorizedItem;
    controller.closeMemorizationPractice();
    expect(controller.practiceMemorizedItem).toBeNull();
  });

  it("startVerseMemorization adds verse and opens practice when missing", async () => {
    const memorizationService = controller["memorizationService"] as any;
    memorizationService.items = [];
    memorizationService.addVerse = vi.fn().mockImplementation(async (reference: string, translation: string) => {
      memorizationService.items = [
        {
          id: "new-verse",
          reference,
          translation,
          kind: "verse",
        } as MemorizedItem,
      ];
      return { ok: true };
    });

    await controller.startVerseMemorization("John 3:16", "esv");

    expect(memorizationService.addVerse).toHaveBeenCalledWith("John 3:16", "esv");
    expect(controller.practiceMemorizedItem?.id).toBe("new-verse");
  });

  it("startVerseMemorization opens practice for duplicate verse without error", async () => {
    const memorizationService = controller["memorizationService"] as any;
    const existing = {
      id: "existing-verse",
      reference: "John 3:16",
      translation: "esv",
      kind: "verse",
    } as MemorizedItem;
    memorizationService.addVerse = vi
      .fn()
      .mockResolvedValue({ ok: false, reason: "duplicate" });
    memorizationService.items = [existing];

    await controller.startVerseMemorization("John 3:16", "esv");

    expect(controller.practiceMemorizedItem).toEqual(existing);
  });
});
