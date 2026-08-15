import { Injectable } from "@angular/core";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import type { PrayerRequest } from "./prayer.service";
import type { PrayerService } from "./prayer.service";
import type { PersonalCategoryColorService } from "./personal-category-color.service";
import type { ToastService } from "./toast.service";
import type { PersonalCategoryFilterMode } from "../types/presentation";
import {
  lockHomePersonalCategoryDragScroll,
  unlockHomePersonalCategoryDragScroll,
} from "../lib/personal-category-drag-scroll";
import {
  clearBrowserTextSelection,
  isPersonalCategoryDragHandleTarget,
  PERSONAL_CATEGORY_LONG_PRESS_MS,
  PERSONAL_CATEGORY_LONG_PRESS_MOVE_PX,
  PERSONAL_CATEGORY_CLICK_SUPPRESS_MS,
} from "../lib/personal-category-long-press";
import { HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS } from "../lib/home-sub-filter-chip-classes";
import { namedPersonalCategoryNamesFromPrayers } from "../lib/personal-category-order";
import {
  renamePersonalCategoryWithColors,
  type RenamePersonalCategoryWithColorsResult,
} from "../lib/personal-category-rename";

export interface HomePersonalCategoryHost {
  getPersonalPrayers(): PrayerRequest[];
  setPersonalPrayers(prayers: PrayerRequest[]): void;
  getFilteredPersonalPrayers(): PrayerRequest[];
  markForCheck(): void;
  detectChanges(): void;
  onFilterStateChanged(): void;
  setIsReorderingPersonalPrayers(value: boolean): void;
}

export interface HomePersonalCategoryReturnContext {
  personalCategoryFilterMode?: PersonalCategoryFilterMode;
  selectedPersonalCategories?: string[];
}

@Injectable()
export class HomePersonalCategoryController {
  personalCategoryFilterMode: PersonalCategoryFilterMode = "current";
  selectedPersonalCategories: string[] = [];
  isCategoryDragging = false;
  private categoryDragScrollLockTarget: HTMLElement | null = null;
  private pendingCategoryOrder: string[] | null = null;
  private swappingCategories = new Set<string>();
  showRenamePersonalCategory = false;
  renamingPersonalCategory: string | null = null;
  isRenamingPersonalCategory = false;
  isReorderingPersonalPrayers = false;

  readonly personalCategoryActiveClass = HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS;

  private host: HomePersonalCategoryHost | null = null;
  private prayerService: PrayerService | null = null;
  private personalCategoryColorService: PersonalCategoryColorService | null =
    null;
  private toastService: ToastService | null = null;
  private personalCategoryRenameGeneration = 0;
  private suppressPersonalCategoryClickFor: string | null = null;
  private personalCategoryClickSuppressTimer: ReturnType<
    typeof setTimeout
  > | null = null;
  private personalCategoryLongPressTimer: ReturnType<typeof setTimeout> | null =
    null;
  private personalCategoryLongPressTriggered = false;
  private personalCategoryLongPressReleaseGuard: (() => void) | null = null;
  private personalCategoryPressStartX = 0;
  private personalCategoryPressStartY = 0;

  bindHost(
    host: HomePersonalCategoryHost,
    deps: {
      prayerService: PrayerService;
      personalCategoryColorService: PersonalCategoryColorService;
      toastService: ToastService;
    }
  ): void {
    this.host = host;
    this.prayerService = deps.prayerService;
    this.personalCategoryColorService = deps.personalCategoryColorService;
    this.toastService = deps.toastService;
  }

  dispose(): void {
    this.clearPersonalCategoryLongPress();
    this.clearPersonalCategoryLongPressReleaseGuard();
    this.clearPersonalCategoryClickSuppress();
  }

  get canReorderPersonalPrayers(): boolean {
    return (
      this.personalCategoryFilterMode === "named" &&
      this.selectedPersonalCategories.length === 1
    );
  }

  personalCurrentPrayersCount(prayers: PrayerRequest[]): number {
    return prayers.filter((p) => p.category !== "Answered").length;
  }

  personalAnsweredPrayersCount(prayers: PrayerRequest[]): number {
    return prayers.filter((p) => p.category === "Answered").length;
  }

  /** True while any named category chip is persisting a reorder. */
  get isCategoryDropListDisabled(): boolean {
    return this.swappingCategories.size > 0;
  }

  isCategorySwapping(category: string): boolean {
    return this.swappingCategories.has(category);
  }

  get uniquePersonalCategories(): string[] {
    if (this.pendingCategoryOrder !== null) {
      return this.pendingCategoryOrder;
    }
    return namedPersonalCategoryNamesFromPrayers(
      this.requirePrayerService().getPersonalPrayersSnapshot()
    );
  }

  async syncCategoriesFromPrayers(_prayers?: PrayerRequest[]): Promise<void> {
    this.pendingCategoryOrder = null;
    this.requireHost().markForCheck();
  }

  selectPersonalCategoryFilterMode(
    mode: Exclude<PersonalCategoryFilterMode, "named">
  ): void {
    this.personalCategoryFilterMode = mode;
    this.selectedPersonalCategories = [];
    this.requireHost().onFilterStateChanged();
  }

  togglePersonalCategory(category: string): void {
    if (this.suppressPersonalCategoryClickFor === category) {
      this.clearPersonalCategoryClickSuppress();
      return;
    }

    if (
      this.personalCategoryFilterMode === "named" &&
      this.selectedPersonalCategories.length === 1 &&
      this.selectedPersonalCategories[0] === category
    ) {
      this.selectPersonalCategoryFilterMode("current");
    } else {
      this.personalCategoryFilterMode = "named";
      this.selectedPersonalCategories = [category];
      this.requireHost().onFilterStateChanged();
    }
  }

  isPersonalCategorySelected(category: string): boolean {
    return (
      this.personalCategoryFilterMode === "named" &&
      this.selectedPersonalCategories.includes(category)
    );
  }

  onCategoryDragStarted(): void {
    this.isCategoryDragging = true;
    document.body.style.cursor = "grabbing";
    this.categoryDragScrollLockTarget = lockHomePersonalCategoryDragScroll();
  }

  onCategoryDragEnded(): void {
    this.isCategoryDragging = false;
    document.body.style.cursor = "";
    unlockHomePersonalCategoryDragScroll(this.categoryDragScrollLockTarget);
    this.categoryDragScrollLockTarget = null;
  }

  async onCategoryDrop(event: CdkDragDrop<string[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    if (this.isCategoryDropListDisabled) {
      return;
    }

    const originalCategories = [...this.uniquePersonalCategories];
    const isAdjacentSwap =
      Math.abs(event.previousIndex - event.currentIndex) === 1;
    const categoriesInvolved = isAdjacentSwap
      ? [
          originalCategories[event.previousIndex],
          originalCategories[event.currentIndex],
        ]
      : [...originalCategories];

    const reorderedCategories = [...originalCategories];
    moveItemInArray(
      reorderedCategories,
      event.previousIndex,
      event.currentIndex
    );
    this.pendingCategoryOrder = reorderedCategories;
    this.setSwappingCategories(categoriesInvolved);
    this.requireHost().markForCheck();

    const prayerService = this.requirePrayerService();
    try {
      let success = false;

      if (isAdjacentSwap) {
        const categoryA = originalCategories[event.previousIndex];
        const categoryB = originalCategories[event.currentIndex];
        success = await prayerService.swapCategoryRanges(
          categoryA,
          categoryB
        );
      } else {
        success = await prayerService.reorderCategories(reorderedCategories);
      }

      if (!success) {
        this.requireToastService().error("Failed to reorder categories");
      }
    } catch (error) {
      console.error("Error reordering categories:", error);
      this.requireToastService().error("Failed to reorder categories");
    } finally {
      this.pendingCategoryOrder = null;
      this.clearSwappingCategories();
      this.requireHost().markForCheck();
    }
  }

  async onPersonalPrayerDrop(
    event: CdkDragDrop<PrayerRequest[]>
  ): Promise<void> {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    if (!this.canReorderPersonalPrayers) {
      this.requireToastService().error("Select a single category to reorder prayers");
      return;
    }

    const host = this.requireHost();
    const prayerService = this.requirePrayerService();
    const originalPersonalPrayers = [...host.getPersonalPrayers()];

    try {
      this.isReorderingPersonalPrayers = true;
      host.setIsReorderingPersonalPrayers(true);

      const filteredPrayers = [...host.getFilteredPersonalPrayers()];
      const movedPrayer = filteredPrayers[event.previousIndex];

      moveItemInArray(filteredPrayers, event.previousIndex, event.currentIndex);

      const personalPrayers = [...host.getPersonalPrayers()];
      const oldIndex = personalPrayers.findIndex((p) => p.id === movedPrayer.id);
      if (oldIndex !== -1) {
        personalPrayers.splice(oldIndex, 1);
      }

      const newPositionInFiltered = event.currentIndex;
      if (newPositionInFiltered === 0) {
        const firstPrayer = filteredPrayers[1];
        if (firstPrayer) {
          const firstIndex = personalPrayers.findIndex(
            (p) => p.id === firstPrayer.id
          );
          personalPrayers.splice(firstIndex, 0, movedPrayer);
        } else {
          personalPrayers.push(movedPrayer);
        }
      } else {
        const previousPrayer = filteredPrayers[newPositionInFiltered - 1];
        const previousIndex = personalPrayers.findIndex(
          (p) => p.id === previousPrayer.id
        );
        personalPrayers.splice(previousIndex + 1, 0, movedPrayer);
      }

      host.setPersonalPrayers(personalPrayers);
      host.onFilterStateChanged();

      const success = await prayerService.updatePersonalPrayerOrder(
        filteredPrayers
      );

      if (success) {
        host.onFilterStateChanged();
      } else {
        this.requireToastService().error("Failed to reorder prayers");
        host.setPersonalPrayers(originalPersonalPrayers);
        host.onFilterStateChanged();
      }
    } catch (error) {
      console.error("Error reordering personal prayers:", error);
      this.requireToastService().error("Failed to reorder prayers");
      host.setPersonalPrayers(originalPersonalPrayers);
      host.onFilterStateChanged();
    } finally {
      this.isReorderingPersonalPrayers = false;
      host.setIsReorderingPersonalPrayers(false);
    }
  }

  onPersonalCategoryPointerDown(event: PointerEvent, category: string): void {
    if (
      this.isCategoryDropListDisabled ||
      this.isCategoryDragging ||
      event.button !== 0
    ) {
      return;
    }
    if (isPersonalCategoryDragHandleTarget(event.target)) {
      return;
    }

    this.clearPersonalCategoryLongPress();
    this.personalCategoryLongPressTriggered = false;
    this.personalCategoryPressStartX = event.clientX;
    this.personalCategoryPressStartY = event.clientY;
    this.personalCategoryLongPressTimer = setTimeout(() => {
      this.personalCategoryLongPressTimer = null;
      this.personalCategoryLongPressTriggered = true;
      clearBrowserTextSelection();
      this.openRenamePersonalCategoryModal(category);
    }, PERSONAL_CATEGORY_LONG_PRESS_MS);
  }

  onPersonalCategoryPointerMove(event: PointerEvent): void {
    if (!this.personalCategoryLongPressTimer) {
      return;
    }
    const dx = event.clientX - this.personalCategoryPressStartX;
    const dy = event.clientY - this.personalCategoryPressStartY;
    if (Math.hypot(dx, dy) > PERSONAL_CATEGORY_LONG_PRESS_MOVE_PX) {
      this.clearPersonalCategoryLongPress();
    }
  }

  onPersonalCategoryPointerUp(event?: PointerEvent): void {
    const wasLongPress = this.personalCategoryLongPressTriggered;
    this.clearPersonalCategoryLongPress();
    if (!wasLongPress) {
      return;
    }
    this.personalCategoryLongPressTriggered = false;
    clearBrowserTextSelection();
    if (event?.cancelable) {
      event.preventDefault();
    }
    event?.stopPropagation();
  }

  onPersonalCategoryContextMenu(event: MouseEvent, category: string): void {
    if (this.isCategoryDropListDisabled || this.isCategoryDragging) {
      return;
    }
    if (isPersonalCategoryDragHandleTarget(event.target)) {
      return;
    }
    event.preventDefault();
    this.clearPersonalCategoryLongPress();
    this.openRenamePersonalCategoryModal(category);
  }

  openRenamePersonalCategoryModal(category: string): void {
    this.clearPersonalCategoryLongPress();
    clearBrowserTextSelection();
    if (this.personalCategoryLongPressTriggered) {
      this.installPersonalCategoryLongPressReleaseGuard();
    }
    this.suppressPersonalCategoryClickFor = category;
    this.schedulePersonalCategoryClickSuppressClear();
    this.renamingPersonalCategory = category;
    this.showRenamePersonalCategory = true;
    this.requireHost().markForCheck();
  }

  closeRenamePersonalCategoryModal(cancelInFlightSave = true): void {
    if (cancelInFlightSave && this.isRenamingPersonalCategory) {
      this.personalCategoryRenameGeneration++;
      this.isRenamingPersonalCategory = false;
    }
    this.personalCategoryLongPressTriggered = false;
    this.clearPersonalCategoryLongPressReleaseGuard();
    this.showRenamePersonalCategory = false;
    this.renamingPersonalCategory = null;
    this.requireHost().markForCheck();
  }

  async saveRenamedPersonalCategory(newName: string): Promise<void> {
    const oldName = this.renamingPersonalCategory;
    if (!oldName) {
      return;
    }

    const trimmedNewName = newName.trim();
    if (!trimmedNewName || trimmedNewName === oldName) {
      this.closeRenamePersonalCategoryModal(false);
      return;
    }

    const generation = this.personalCategoryRenameGeneration;
    const previousSelection = [...this.selectedPersonalCategories];
    const prayerService = this.requirePrayerService();
    const personalCategoryColorService = this.requirePersonalCategoryColorService();
    const toastService = this.requireToastService();

    this.isRenamingPersonalCategory = true;
    this.requireHost().markForCheck();
    try {
      const result = await renamePersonalCategoryWithColors(
        prayerService,
        personalCategoryColorService,
        toastService,
        oldName,
        trimmedNewName,
        {
          onPrayersRenamed: (appliedCategory) => {
            if (generation !== this.personalCategoryRenameGeneration) {
              return;
            }
            this.selectedPersonalCategories =
              this.selectedPersonalCategories.map((category) =>
                category === oldName ? appliedCategory : category
              );
            this.requireHost().markForCheck();
          },
          isCancelled: () =>
            generation !== this.personalCategoryRenameGeneration,
        }
      );
      if (generation !== this.personalCategoryRenameGeneration) {
        this.applyDismissedPersonalCategoryRenameResult(
          result,
          oldName,
          trimmedNewName,
          previousSelection
        );
        return;
      }
      if (result.status === "failed" || result.status === "cancelled") {
        this.selectedPersonalCategories = previousSelection;
        this.requireHost().markForCheck();
        return;
      }

      if (result.status === "success") {
        toastService.success("Category renamed.");
      }
      this.closeRenamePersonalCategoryModal(false);
    } finally {
      if (generation === this.personalCategoryRenameGeneration) {
        this.isRenamingPersonalCategory = false;
      }
      this.requireHost().markForCheck();
    }
  }

  applyReturnContext(context: HomePersonalCategoryReturnContext): void {
    let mode = context.personalCategoryFilterMode ?? "total";
    if (mode === "named" && !context.selectedPersonalCategories?.length) {
      mode = "total";
    }
    this.personalCategoryFilterMode = mode;
    if (mode === "named" && context.selectedPersonalCategories?.length) {
      this.selectedPersonalCategories = [
        ...context.selectedPersonalCategories,
      ];
    } else {
      this.selectedPersonalCategories = [];
    }
    this.requireHost().onFilterStateChanged();
  }

  /** Test hook for long-press timer visibility. */
  getPersonalCategoryLongPressTimerForTests(): ReturnType<
    typeof setTimeout
  > | null {
    return this.personalCategoryLongPressTimer;
  }

  /** Test hook for click-suppress state. */
  setSuppressPersonalCategoryClickForForTests(category: string | null): void {
    this.suppressPersonalCategoryClickFor = category;
  }

  getSuppressPersonalCategoryClickForForTests(): string | null {
    return this.suppressPersonalCategoryClickFor;
  }

  /** Test hook for advancing click-suppress timer. */
  runPersonalCategoryClickSuppressTimerForTests(): void {
    this.clearPersonalCategoryClickSuppressTimer();
    this.suppressPersonalCategoryClickFor = null;
  }

  private applyDismissedPersonalCategoryRenameResult(
    result: RenamePersonalCategoryWithColorsResult,
    oldName: string,
    newName: string,
    previousSelection: string[]
  ): void {
    switch (result.status) {
      case "cancelled":
      case "failed":
        this.selectedPersonalCategories = previousSelection;
        this.requireHost().markForCheck();
        return;
      case "success":
        this.selectedPersonalCategories = previousSelection.map((category) =>
          category === oldName ? newName : category
        );
        this.requireHost().markForCheck();
        return;
      case "partial":
        this.selectedPersonalCategories = previousSelection.map((category) =>
          category === oldName ? result.appliedCategory : category
        );
        this.requireHost().markForCheck();
        return;
      default: {
        const _exhaustive: never = result;
        void _exhaustive;
        return;
      }
    }
  }

  private clearPersonalCategoryLongPress(): void {
    if (this.personalCategoryLongPressTimer) {
      clearTimeout(this.personalCategoryLongPressTimer);
      this.personalCategoryLongPressTimer = null;
    }
  }

  private installPersonalCategoryLongPressReleaseGuard(): void {
    this.clearPersonalCategoryLongPressReleaseGuard();

    const options: AddEventListenerOptions = {
      capture: true,
      passive: false,
    };
    const onRelease = (event: Event) => {
      clearBrowserTextSelection();
      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();
      this.personalCategoryLongPressTriggered = false;
      this.clearPersonalCategoryLongPressReleaseGuard();
    };

    document.addEventListener("pointerup", onRelease, options);
    document.addEventListener("pointercancel", onRelease, options);
    document.addEventListener("touchend", onRelease, options);
    document.addEventListener("touchcancel", onRelease, options);

    this.personalCategoryLongPressReleaseGuard = () => {
      document.removeEventListener("pointerup", onRelease, options);
      document.removeEventListener("pointercancel", onRelease, options);
      document.removeEventListener("touchend", onRelease, options);
      document.removeEventListener("touchcancel", onRelease, options);
    };
  }

  private clearPersonalCategoryLongPressReleaseGuard(): void {
    this.personalCategoryLongPressReleaseGuard?.();
    this.personalCategoryLongPressReleaseGuard = null;
  }

  private schedulePersonalCategoryClickSuppressClear(): void {
    this.clearPersonalCategoryClickSuppressTimer();
    this.personalCategoryClickSuppressTimer = setTimeout(() => {
      this.personalCategoryClickSuppressTimer = null;
      this.suppressPersonalCategoryClickFor = null;
    }, PERSONAL_CATEGORY_CLICK_SUPPRESS_MS);
  }

  private clearPersonalCategoryClickSuppressTimer(): void {
    if (this.personalCategoryClickSuppressTimer) {
      clearTimeout(this.personalCategoryClickSuppressTimer);
      this.personalCategoryClickSuppressTimer = null;
    }
  }

  private clearPersonalCategoryClickSuppress(): void {
    this.suppressPersonalCategoryClickFor = null;
    this.clearPersonalCategoryClickSuppressTimer();
  }

  /** Test hook: simulate in-flight category reorder. */
  setSwappingCategoriesForTests(...categories: string[]): void {
    this.setSwappingCategories(categories);
  }

  private setSwappingCategories(categories: string[]): void {
    this.swappingCategories = new Set(
      categories.filter((category): category is string => !!category)
    );
  }

  private clearSwappingCategories(): void {
    this.swappingCategories.clear();
  }

  private requireHost(): HomePersonalCategoryHost {
    if (!this.host) {
      throw new Error("HomePersonalCategoryController host is not bound");
    }
    return this.host;
  }

  private requirePrayerService(): PrayerService {
    if (!this.prayerService) {
      throw new Error("HomePersonalCategoryController prayerService is not bound");
    }
    return this.prayerService;
  }

  private requirePersonalCategoryColorService(): PersonalCategoryColorService {
    if (!this.personalCategoryColorService) {
      throw new Error(
        "HomePersonalCategoryController personalCategoryColorService is not bound"
      );
    }
    return this.personalCategoryColorService;
  }

  private requireToastService(): ToastService {
    if (!this.toastService) {
      throw new Error("HomePersonalCategoryController toastService is not bound");
    }
    return this.toastService;
  }
}
