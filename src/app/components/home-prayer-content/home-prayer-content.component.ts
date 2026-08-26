import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { DragDropModule } from "@angular/cdk/drag-drop";
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from "@angular/cdk/scrolling";
import { ScrollingModule as ExperimentalScrollingModule } from "@angular/cdk-experimental/scrolling";
import { Observable } from "rxjs";
import { PrayerCardComponent } from "../prayer-card/prayer-card.component";
import { PromptCardComponent } from "../prompt-card/prompt-card.component";
import { MemorizePassagesPanelComponent } from "../memorize-passages-panel/memorize-passages-panel.component";
import type { PrayerFilters } from "../prayer-filters/prayer-filters.component";
import type { PrayerPrompt } from "../prompt-card/prompt-card.component";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import type { AllowanceLevel } from "../../types/prayer";
import { PrayerRequest } from "../../services/prayer.service";
import type { MemorizedItem } from "../../types/memorization";
import type { HomePrayerContentHandlers } from "../../lib/home-prayer-content-handlers";
import { isCommunityPrayerFilter } from "../../lib/home-community-filter";
import {
  HOME_PRAYER_VIRTUAL_SCROLL_ITEM_CLASSES,
  HOME_PROMPT_VIRTUAL_SCROLL_ITEM_CLASSES,
  HOME_SHELL_STACK_GAP_CLASSES,
} from "../../lib/home-shell-spacing";
import {
  HOME_PROMPT_VIRTUAL_SCROLL_MAX_BUFFER_PX,
  HOME_PROMPT_VIRTUAL_SCROLL_MIN_BUFFER_PX,
  scrollHomePromptVirtualViewportToIndex,
  reconcileHomeVirtualScrollTotalSizeAtTail,
  shouldUseHomePromptVirtualScroll,
} from "../../lib/home-prompt-virtual-scroll";
import {
  HOME_PRAYER_VIRTUAL_SCROLL_MAX_BUFFER_PX,
  HOME_PRAYER_VIRTUAL_SCROLL_MIN_BUFFER_PX,
  scrollHomePrayerVirtualViewportToIndex,
} from "../../lib/home-prayer-virtual-scroll";

export type HomePersonalCategoryPickerOpenChange = {
  prayerId: string;
  open: boolean;
};

@Component({
  selector: "app-home-prayer-content",
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    ScrollingModule,
    ExperimentalScrollingModule,
    PrayerCardComponent,
    PromptCardComponent,
    MemorizePassagesPanelComponent,
  ],
  templateUrl: "./home-prayer-content.component.html",
  styleUrl: "./home-prayer-content.component.css",
})
export class HomePrayerContentComponent implements OnChanges {
  @Input({ required: true }) contentHidden!: boolean;
  @Input({ required: true }) activeFilter!: HomeActiveFilter;
  @Input({ required: true }) filters!: PrayerFilters;
  @Input({ required: true }) prayers$!: Observable<PrayerRequest[]>;
  @Input({ required: true }) prompts$!: Observable<PrayerPrompt[]>;
  @Input({ required: true }) loading$!: Observable<boolean>;
  @Input({ required: true }) error$!: Observable<string | null>;
  @Input({ required: true }) deletionsAllowed!: AllowanceLevel;
  @Input({ required: true }) updatesAllowed!: AllowanceLevel;
  @Input({ required: true }) personalCategoryPickerPrayerId!: string | null;
  @Input({ required: true }) personalWalkthroughPrayerFor!: string;
  @Input({ required: true }) personalWalkthroughDescription!: string;
  @Input({ required: true }) filteredPersonalPrayers!: PrayerRequest[];
  @Input({ required: true }) filteredPlanningCenterPrayers!: PrayerRequest[];
  @Input({ required: true }) displayedPublicPrayers!: PrayerRequest[];
  @Input({ required: true }) displayedPrompts!: PrayerPrompt[];
  @Input({ required: true }) loadingPersonalPrayers$!: Observable<boolean>;
  @Input({ required: true }) canReorderPersonalPrayers!: boolean;
  @Input({ required: true }) selectedPromptTypes!: string[];
  @Input({ required: true }) memorizedItems!: MemorizedItem[];
  @Input({ required: true }) memorizeLoading$!: Observable<boolean>;
  @Input({ required: true }) showAddMemorizedVerse!: boolean;
  @Input({ required: true }) showAddMemorizedBibleBooks!: boolean;
  @Input({ required: true }) showMemorizationRecommendations!: boolean;
  @Input({ required: true }) handlers!: HomePrayerContentHandlers;
  @Input() isAdmin = false;
  @Input() showPrayForButton = true;
  @Input() showPrayingCount = true;
  @Input() prayerEncouragementEnabled = true;

  @Output() personalCategoryPickerOpenChange =
    new EventEmitter<HomePersonalCategoryPickerOpenChange>();

  @ViewChild("promptVirtualScrollViewport")
  private promptVirtualScrollViewport?: CdkVirtualScrollViewport;

  @ViewChild("publicVirtualScrollViewport")
  private publicVirtualScrollViewport?: CdkVirtualScrollViewport;

  readonly stackGapClass = HOME_SHELL_STACK_GAP_CLASSES;
  readonly promptVirtualScrollItemClass =
    HOME_PROMPT_VIRTUAL_SCROLL_ITEM_CLASSES;
  readonly prayerVirtualScrollItemClass =
    HOME_PRAYER_VIRTUAL_SCROLL_ITEM_CLASSES;
  readonly promptVirtualScrollMinBufferPx =
    HOME_PROMPT_VIRTUAL_SCROLL_MIN_BUFFER_PX;
  readonly promptVirtualScrollMaxBufferPx =
    HOME_PROMPT_VIRTUAL_SCROLL_MAX_BUFFER_PX;
  readonly prayerVirtualScrollMinBufferPx =
    HOME_PRAYER_VIRTUAL_SCROLL_MIN_BUFFER_PX;
  readonly prayerVirtualScrollMaxBufferPx =
    HOME_PRAYER_VIRTUAL_SCROLL_MAX_BUFFER_PX;
  readonly isCommunityPrayerFilter = isCommunityPrayerFilter;
  readonly shouldUsePromptVirtualScroll = shouldUseHomePromptVirtualScroll;

  private promptTailReconciledContentEnd: number | null = null;
  private promptTailReconcileHandle: ReturnType<typeof setTimeout> | null =
    null;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes["displayedPrompts"] ||
      (changes["activeFilter"] && this.activeFilter === "prompts")
    ) {
      this.promptTailReconciledContentEnd = null;
      this.schedulePromptVirtualScrollTailReconcile();
    }
  }

  isPromptTypeSelected(type: string): boolean {
    return this.selectedPromptTypes.includes(type);
  }

  onCategoryPickerOpenChange(prayerId: string, open: boolean): void {
    this.personalCategoryPickerOpenChange.emit({ prayerId, open });
  }

  trackPrompt(_index: number, prompt: PrayerPrompt): string {
    return prompt.id;
  }

  trackPrayer(_index: number, prayer: PrayerRequest): string {
    return prayer.id;
  }

  scrollPromptIntoView(promptId: string): boolean {
    if (this.activeFilter !== "prompts") {
      return false;
    }
    const elementId = `prompt-card-${promptId}`;
    if (
      typeof document !== "undefined" &&
      document.getElementById(elementId)
    ) {
      return true;
    }
    const index = this.displayedPrompts.findIndex(
      (prompt) => prompt.id === promptId
    );
    if (index < 0) {
      return false;
    }
    if (!shouldUseHomePromptVirtualScroll(this.displayedPrompts.length)) {
      return false;
    }
    const viewport = this.promptVirtualScrollViewport;
    if (!viewport) {
      return false;
    }
    return scrollHomePromptVirtualViewportToIndex(
      viewport,
      index,
      elementId
    );
  }

  scrollPrayerIntoView(prayerId: string): boolean {
    if (!isCommunityPrayerFilter(this.activeFilter)) {
      return false;
    }
    const index = this.displayedPublicPrayers.findIndex(
      (prayer) => prayer.id === prayerId
    );
    if (index < 0) {
      return false;
    }
    const viewport = this.publicVirtualScrollViewport;
    if (!viewport) {
      return false;
    }
    return scrollHomePrayerVirtualViewportToIndex(
      viewport,
      index,
      `prayer-card-${prayerId}`
    );
  }

  reconcilePromptVirtualScrollSize(): void {
    if (this.activeFilter !== "prompts") {
      return;
    }
    if (!shouldUseHomePromptVirtualScroll(this.displayedPrompts.length)) {
      return;
    }
    const viewport = this.promptVirtualScrollViewport;
    if (!viewport) {
      return;
    }
    this.promptTailReconciledContentEnd =
      reconcileHomeVirtualScrollTotalSizeAtTail(
        viewport,
        this.promptTailReconciledContentEnd
      );
  }

  private schedulePromptVirtualScrollTailReconcile(): void {
    if (this.activeFilter !== "prompts") {
      return;
    }
    if (!shouldUseHomePromptVirtualScroll(this.displayedPrompts.length)) {
      return;
    }
    if (this.promptTailReconcileHandle != null) {
      clearTimeout(this.promptTailReconcileHandle);
    }
    this.promptTailReconcileHandle = setTimeout(() => {
      this.promptTailReconcileHandle = null;
      this.reconcilePromptVirtualScrollSize();
    }, 0);
  }
}
