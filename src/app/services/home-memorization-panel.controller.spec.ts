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

  it("confirmVerseMemorizationTranslation adds verse and opens practice when missing", async () => {
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
    controller.promptVerseMemorizationTranslation("John 3:16");

    controller.confirmVerseMemorizationTranslation("esv");

    await vi.waitFor(() => {
      expect(memorizationService.addVerse).toHaveBeenCalledWith("John 3:16", "esv");
      expect(controller.practiceMemorizedItem?.id).toBe("new-verse");
    });
  });

  it("confirmVerseMemorizationTranslation opens practice for duplicate verse without error", async () => {
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
    controller.promptVerseMemorizationTranslation("John 3:16");

    controller.confirmVerseMemorizationTranslation("esv");

    await vi.waitFor(() => {
      expect(controller.practiceMemorizedItem).toEqual(existing);
    });
  });

  it("beginVerseMemorizationFromCard opens practice when verse is already memorized", async () => {
    const memorizationService = controller["memorizationService"] as any;
    const existing = {
      id: "existing-verse",
      reference: "John 3:16",
      translation: "niv",
      kind: "verse",
      inProgressPractice: { phase: { kind: "inRound" }, practiceMode: "type" },
    } as MemorizedItem;
    memorizationService.items = [existing];

    await controller.beginVerseMemorizationFromCard("John 3:16");

    expect(memorizationService.loadItems).toHaveBeenCalledTimes(1);
    expect(controller.showVerseMemorizationTranslationModal).toBe(false);
    expect(controller.practiceMemorizedItem).toEqual(existing);
    expect(host.primeKeyboardBridge).toHaveBeenCalled();
  });

  it("beginVerseMemorizationFromCard prompts for translation when verse is not memorized", async () => {
    const memorizationService = controller["memorizationService"] as any;
    memorizationService.items = [];
    memorizationService.getPreferredTranslation = vi.fn(() => "esv");

    await controller.beginVerseMemorizationFromCard("Romans 8:28");

    expect(controller.showVerseMemorizationTranslationModal).toBe(true);
    expect(controller.pendingVerseMemorizationReference).toBe("Romans 8:28");
    expect(controller.practiceMemorizedItem).toBeNull();
  });

  it("promptVerseMemorizationTranslation opens modal", () => {
    controller.promptVerseMemorizationTranslation(" Romans 8:28 ");

    expect(controller.showVerseMemorizationTranslationModal).toBe(true);
    expect(controller.pendingVerseMemorizationReference).toBe("Romans 8:28");
    expect(host.markForCheck).toHaveBeenCalled();
  });

  it("confirmVerseMemorizationTranslation starts practice and clears modal state", async () => {
    const memorizationService = controller["memorizationService"] as any;
    memorizationService.getPreferredTranslation = vi.fn(() => "esv");
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
    controller.promptVerseMemorizationTranslation("John 3:16");

    controller.confirmVerseMemorizationTranslation("nlt");

    expect(controller.showVerseMemorizationTranslationModal).toBe(false);
    expect(controller.pendingVerseMemorizationReference).toBeNull();
    await vi.waitFor(() => {
      expect(controller.practiceMemorizedItem?.translation).toBe("nlt");
    });
  });

  it("cancelVerseMemorizationTranslation closes modal without opening practice", () => {
    controller.promptVerseMemorizationTranslation("John 3:16");

    controller.cancelVerseMemorizationTranslation();

    expect(controller.showVerseMemorizationTranslationModal).toBe(false);
    expect(controller.pendingVerseMemorizationReference).toBeNull();
    expect(controller.practiceMemorizedItem).toBeNull();
  });

  it("beginVerseMemorizationFromCard falls back to preferred translation for invalid stored translation", async () => {
    const memorizationService = controller["memorizationService"] as any;
    memorizationService.getPreferredTranslation = vi.fn(() => "csb");
    memorizationService.items = [
      {
        id: "existing-verse",
        reference: "John 3:16",
        translation: "invalid",
        kind: "verse",
      } as MemorizedItem,
    ];
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

    await controller.beginVerseMemorizationFromCard("John 3:16");

    expect(memorizationService.addVerse).toHaveBeenCalledWith("John 3:16", "csb");
  });
});
