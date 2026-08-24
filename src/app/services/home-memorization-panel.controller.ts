import { Injectable } from "@angular/core";
import { memorizationNeedsKeyboardOnOpen } from "../lib/memorization/memorizationKeyboardPractice";
import type { ScriptureService } from "./scripture.service";
import type { MemorizationService } from "./memorization.service";
import type { MemorizationRecommendationsService } from "./memorization-recommendations.service";
import type { ToastService } from "./toast.service";
import {
  isBibleTranslation,
  type BibleTranslation,
  type MemorizedItem,
  type MemorizationInProgressSavePayload,
  type MemorizationRecommendation,
  type MemorizationRecommendationCategoryGroup,
} from "../types/memorization";

export interface HomeMemorizationPanelHost {
  markForCheck(): void;
  detectChanges(): void;
  primeKeyboardBridge(): void;
}

@Injectable()
export class HomeMemorizationPanelController {
  memorizedItems: MemorizedItem[] = [];
  memorizedItemsCount = 0;
  memorizationRecommendationGroups: MemorizationRecommendationCategoryGroup[] =
    [];
  memorizationRecommendationOwnedKeys = new Set<string>();
  addingRecommendationId: string | null = null;
  showAddMemorizedVerse = false;
  showAddMemorizedBibleBooks = false;
  showMemorizationRecommendations = false;
  practiceMemorizedItem: MemorizedItem | null = null;
  showRemoveMemorizedConfirm = false;
  memorizedItemToRemove: MemorizedItem | null = null;
  showVerseMemorizationTranslationModal = false;
  pendingVerseMemorizationReference: string | null = null;
  pendingVerseMemorizationSuggestedTranslation: BibleTranslation | null = null;

  private host: HomeMemorizationPanelHost | null = null;
  private memorizationService: MemorizationService | null = null;
  private memorizationRecommendationsService: MemorizationRecommendationsService | null =
    null;
  private scriptureService: ScriptureService | null = null;
  private toastService: ToastService | null = null;

  bindHost(
    host: HomeMemorizationPanelHost,
    deps: {
      memorizationService: MemorizationService;
      memorizationRecommendationsService: MemorizationRecommendationsService;
      scriptureService: ScriptureService;
      toastService: ToastService;
    }
  ): void {
    this.host = host;
    this.memorizationService = deps.memorizationService;
    this.memorizationRecommendationsService =
      deps.memorizationRecommendationsService;
    this.scriptureService = deps.scriptureService;
    this.toastService = deps.toastService;
  }

  syncMemorizedItems(items: MemorizedItem[]): void {
    this.memorizedItems = items;
    this.memorizedItemsCount = items.length;
    this.memorizationRecommendationOwnedKeys = new Set(
      items
        .filter((item) => item.kind === "verse" || item.kind == null)
        .map((item) => `${item.translation}:${item.reference}`)
    );
    this.requireHost().markForCheck();
  }

  syncRecommendationGroups(): void {
    const recommendationsService = this.requireMemorizationRecommendationsService();
    this.memorizationRecommendationGroups =
      recommendationsService.groupedSnapshot;
    this.requireHost().markForCheck();
  }

  onMemorizedVerseAdded(): void {
    this.requireHost().markForCheck();
  }

  openMemorizationRecommendations(): void {
    this.showMemorizationRecommendations = true;
    this.requireHost().markForCheck();
    void this.requireMemorizationRecommendationsService()
      .load(true)
      .then(() => {
        this.syncRecommendationGroups();
      });
  }

  isRecommendationAlreadyAdded(rec: MemorizationRecommendation): boolean {
    return this.memorizedItems.some(
      (item) =>
        (item.kind === "verse" || item.kind == null) &&
        item.reference === rec.reference &&
        item.translation === rec.translation
    );
  }

  async addRecommendedVerse(rec: MemorizationRecommendation): Promise<void> {
    if (this.addingRecommendationId || this.isRecommendationAlreadyAdded(rec)) {
      return;
    }
    this.addingRecommendationId = rec.id;
    this.requireHost().markForCheck();
    try {
      const memorizationService = this.requireMemorizationService();
      const scriptureService = this.requireScriptureService();
      const toastService = this.requireToastService();
      const translation =
        rec.translation ?? memorizationService.getPreferredTranslation();
      const passage = await scriptureService.getPassage(
        rec.reference,
        translation
      );
      const text = passage.text?.trim();
      if (!text) {
        toastService.error("No text returned for this passage.");
        return;
      }

      const result = await memorizationService.addVerse(
        rec.reference,
        translation
      );
      if (result.ok) {
        toastService.success("Added to memorization list.");
      } else if (result.reason === "duplicate") {
        toastService.error(
          "This passage is already in your memorization list."
        );
      } else if (result.reason === "no_user") {
        toastService.error("Sign in to add verses to memorize.");
      } else {
        toastService.error("Could not save this passage.");
      }
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Could not save this passage.";
      this.requireToastService().error(message);
    } finally {
      this.addingRecommendationId = null;
      this.requireHost().markForCheck();
    }
  }

  promptVerseMemorizationTranslation(
    reference: string,
    suggestedTranslation?: BibleTranslation | string | null
  ): void {
    const normalizedRef = reference.trim();
    if (!normalizedRef) {
      return;
    }
    this.pendingVerseMemorizationReference = normalizedRef;
    this.pendingVerseMemorizationSuggestedTranslation =
      this.normalizeRequestedTranslation(suggestedTranslation) ?? null;
    this.showVerseMemorizationTranslationModal = true;
    this.requireHost().markForCheck();
  }

  async beginVerseMemorizationFromCard(
    reference: string,
    suggestedTranslation?: BibleTranslation | string | null
  ): Promise<void> {
    const normalizedRef = reference.trim();
    if (!normalizedRef) {
      return;
    }

    const memorizationService = this.requireMemorizationService();
    await memorizationService.loadItems();

    const existing = this.findExistingVerseMemorizationItem(normalizedRef);
    if (existing) {
      await this.openVerseMemorizationPractice(
        normalizedRef,
        existing.translation,
        { itemsAlreadyLoaded: true }
      );
      return;
    }

    this.promptVerseMemorizationTranslation(
      normalizedRef,
      suggestedTranslation
    );
  }

  confirmVerseMemorizationTranslation(translation: BibleTranslation): void {
    const reference = this.pendingVerseMemorizationReference;
    this.showVerseMemorizationTranslationModal = false;
    this.pendingVerseMemorizationReference = null;
    this.pendingVerseMemorizationSuggestedTranslation = null;
    this.requireHost().markForCheck();
    if (reference) {
      void this.openVerseMemorizationPractice(reference, translation);
    }
  }

  cancelVerseMemorizationTranslation(): void {
    this.showVerseMemorizationTranslationModal = false;
    this.pendingVerseMemorizationReference = null;
    this.pendingVerseMemorizationSuggestedTranslation = null;
    this.requireHost().markForCheck();
  }

  private async openVerseMemorizationPractice(
    reference: string,
    translation: string,
    options?: { itemsAlreadyLoaded?: boolean }
  ): Promise<void> {
    const toastService = this.requireToastService();
    const normalizedRef = reference.trim();
    const trimmedTranslation = translation.trim();
    const normalizedTranslation: BibleTranslation = isBibleTranslation(
      trimmedTranslation
    )
      ? trimmedTranslation
      : this.requireMemorizationService().getPreferredTranslation();

    if (!normalizedRef) {
      return;
    }

    const item = await this.ensureVerseMemorizedItem(
      normalizedRef,
      normalizedTranslation,
      options
    );

    if (!item) {
      toastService.error("Could not open this passage for memorization.");
      return;
    }

    this.syncMemorizedItems(this.requireMemorizationService().items);
    this.openMemorizationPractice(item);
  }

  openMemorizationPractice(item: MemorizedItem): void {
    const host = this.requireHost();
    if (memorizationNeedsKeyboardOnOpen(item)) {
      host.primeKeyboardBridge();
    }
    this.practiceMemorizedItem = item;
    host.markForCheck();
    try {
      host.detectChanges();
    } catch {
      // Test doubles / detached views may not support full CD.
    }
  }

  closeMemorizationPractice(): void {
    this.practiceMemorizedItem = null;
    this.requireHost().markForCheck();
  }

  async onMemorizationPracticeComplete(result: {
    wrongAttempts: number;
    correctKeystrokes: number;
    completed: boolean;
  }): Promise<void> {
    const id = this.practiceMemorizedItem?.id;
    if (!id) {
      return;
    }
    const memorizationService = this.requireMemorizationService();
    await memorizationService.updatePracticeStats(id, result);
    const updated = memorizationService.items.find((item) => item.id === id);
    if (updated) {
      this.practiceMemorizedItem = updated;
      this.requireHost().markForCheck();
    }
  }

  onMemorizationPersistInProgress(
    payload: MemorizationInProgressSavePayload
  ): void {
    const id = this.practiceMemorizedItem?.id;
    if (!id) {
      return;
    }
    void this.requireMemorizationService().saveInProgress(id, payload);
  }

  onMemorizationClearInProgress(): void {
    const id = this.practiceMemorizedItem?.id;
    if (!id) {
      return;
    }
    void this.requireMemorizationService().clearInProgress(id);
  }

  confirmRemoveMemorizedItem(item: MemorizedItem): void {
    this.memorizedItemToRemove = item;
    this.showRemoveMemorizedConfirm = true;
    this.requireHost().markForCheck();
  }

  async removeMemorizedItemConfirmed(): Promise<void> {
    const item = this.memorizedItemToRemove;
    this.showRemoveMemorizedConfirm = false;
    this.memorizedItemToRemove = null;
    if (!item) {
      return;
    }
    if (this.practiceMemorizedItem?.id === item.id) {
      this.practiceMemorizedItem = null;
    }
    await this.requireMemorizationService().removeItem(item.id);
    this.requireHost().markForCheck();
  }

  private requireHost(): HomeMemorizationPanelHost {
    if (!this.host) {
      throw new Error("HomeMemorizationPanelController host is not bound");
    }
    return this.host;
  }

  private requireMemorizationService(): MemorizationService {
    if (!this.memorizationService) {
      throw new Error(
        "HomeMemorizationPanelController memorizationService is not bound"
      );
    }
    return this.memorizationService;
  }

  private requireMemorizationRecommendationsService(): MemorizationRecommendationsService {
    if (!this.memorizationRecommendationsService) {
      throw new Error(
        "HomeMemorizationPanelController memorizationRecommendationsService is not bound"
      );
    }
    return this.memorizationRecommendationsService;
  }

  private requireScriptureService(): ScriptureService {
    if (!this.scriptureService) {
      throw new Error(
        "HomeMemorizationPanelController scriptureService is not bound"
      );
    }
    return this.scriptureService;
  }

  private requireToastService(): ToastService {
    if (!this.toastService) {
      throw new Error("HomeMemorizationPanelController toastService is not bound");
    }
    return this.toastService;
  }

  private normalizeRequestedTranslation(
    translation?: BibleTranslation | string | null
  ): BibleTranslation | undefined {
    const trimmed = translation?.trim();
    if (trimmed && isBibleTranslation(trimmed)) {
      return trimmed;
    }
    return undefined;
  }

  private async ensureVerseMemorizedItem(
    reference: string,
    translation: BibleTranslation,
    options?: { itemsAlreadyLoaded?: boolean }
  ): Promise<MemorizedItem | null> {
    const memorizationService = this.requireMemorizationService();
    const toastService = this.requireToastService();

    if (!options?.itemsAlreadyLoaded) {
      await memorizationService.loadItems();
    }

    const existing = this.findVerseMemorizationItem(reference, translation);
    if (existing) {
      return existing;
    }

    const result = await memorizationService.addVerse(reference, translation);
    if (!result.ok && result.reason === "no_user") {
      toastService.error("Sign in to add verses to memorize.");
      return null;
    }
    if (!result.ok && result.reason !== "duplicate") {
      toastService.error("Could not save this passage.");
      return null;
    }

    return this.findVerseMemorizationItem(reference, translation);
  }

  private findVerseMemorizationItem(
    reference: string,
    translation: BibleTranslation
  ): MemorizedItem | null {
    const memorizationService = this.requireMemorizationService();
    return (
      memorizationService.items.find(
        (item) =>
          (item.kind === "verse" || item.kind == null) &&
          item.reference === reference &&
          item.translation === translation
      ) ?? null
    );
  }

  private findExistingVerseMemorizationItem(
    reference: string
  ): MemorizedItem | null {
    // Match by reference only (any translation); prefer in-progress, then preferred.
    const memorizationService = this.requireMemorizationService();
    const verseItems = memorizationService.items.filter(
      (item) =>
        (item.kind === "verse" || item.kind == null) &&
        item.reference === reference
    );
    if (verseItems.length === 0) {
      return null;
    }

    const inProgress = verseItems.find((item) => item.inProgressPractice);
    if (inProgress) {
      return inProgress;
    }

    const preferred = memorizationService.getPreferredTranslation();
    const preferredMatch = verseItems.find(
      (item) => item.translation === preferred
    );
    return preferredMatch ?? verseItems[0];
  }
}
