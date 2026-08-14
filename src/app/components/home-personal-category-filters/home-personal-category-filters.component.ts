import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  CdkDragDrop,
  DragDropModule,
} from "@angular/cdk/drag-drop";
import type { PersonalCategoryFilterMode } from "../../types/presentation";
import {
  HOME_PERSONAL_CATEGORY_CHIP_FLEX_CLASS,
  HOME_PERSONAL_CATEGORY_CHIP_SOLO_FLEX_CLASS,
  HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS,
  HOME_SUB_FILTER_CHIP_DRAG_SOLO_STRETCH_CLASS,
  HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import {
  computePersonalCategoryChipLayout,
  personalCategoryChipLayoutEqual,
  personalCategoryLayoutSignature,
  type PersonalCategoryChipLayout,
} from "../../lib/home-personal-category-chip-layout";
import { HOME_SHELL_SECTION_GAP_CLASSES } from "../../lib/home-shell-spacing";
import { HomeSubFilterChipComponent } from "../home-sub-filter-chip/home-sub-filter-chip.component";

@Component({
  selector: "app-home-personal-category-filters",
  standalone: true,
  imports: [CommonModule, DragDropModule, HomeSubFilterChipComponent],
  templateUrl: "./home-personal-category-filters.component.html",
})
export class HomePersonalCategoryFiltersComponent
  implements AfterViewInit, OnChanges, OnDestroy, DoCheck
{
  @Input({ required: true }) personalPrayersCount!: number;
  @Input({ required: true }) filterMode!: PersonalCategoryFilterMode;
  @Input({ required: true }) personalCategoryActiveClass!: string;
  @Input({ required: true }) uniqueCategories!: string[];
  @Input({ required: true }) isCategoryDropListDisabled!: boolean;
  @Input({ required: true }) personalCurrentCount!: number;
  @Input({ required: true }) personalAnsweredCount!: number;
  @Input({ required: true }) isCategorySwapping!: (category: string) => boolean;
  @Input({ required: true }) isPersonalCategorySelected!: (
    category: string
  ) => boolean;
  @Input({ required: true }) getCategoryCount!: (category: string) => number;

  @Output() selectFilterMode = new EventEmitter<
    Exclude<PersonalCategoryFilterMode, "named">
  >();
  @Output() toggleCategory = new EventEmitter<string>();
  @Output() categoryDrop = new EventEmitter<CdkDragDrop<string[]>>();
  @Output() categoryDragStarted = new EventEmitter<void>();
  @Output() categoryDragEnded = new EventEmitter<void>();
  @Output() categoryPointerDown = new EventEmitter<{
    event: PointerEvent;
    category: string;
  }>();
  @Output() categoryPointerMove = new EventEmitter<PointerEvent>();
  @Output() categoryPointerUp = new EventEmitter<void>();
  @Output() categoryContextMenu = new EventEmitter<{
    event: MouseEvent;
    category: string;
  }>();

  @ViewChild("categoryDropList")
  categoryDropList?: ElementRef<HTMLElement>;

  truncatedCategories = new Set<string>();
  soloRowCategories = new Set<string>();

  readonly namedChipStretchClass = HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS;
  readonly namedChipSoloStretchClass = HOME_SUB_FILTER_CHIP_DRAG_SOLO_STRETCH_CLASS;
  readonly categoryChipFlexClass = HOME_PERSONAL_CATEGORY_CHIP_FLEX_CLASS;
  readonly categoryChipSoloFlexClass = HOME_PERSONAL_CATEGORY_CHIP_SOLO_FLEX_CLASS;
  readonly namedChipInactiveClass = HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS;
  readonly sectionGapClass = HOME_SHELL_SECTION_GAP_CLASSES;

  private layout: PersonalCategoryChipLayout = {
    soloRowCategories: new Set(),
    truncatedCategories: new Set(),
  };

  private resizeObserver?: ResizeObserver;
  private layoutSignature = "";

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    const container = this.categoryDropList?.nativeElement;
    if (container && typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => this.updateTruncation());
      });
      this.resizeObserver.observe(container);
    }
    this.scheduleTruncationUpdate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["uniqueCategories"]) {
      this.scheduleTruncationUpdate();
    }
  }

  ngDoCheck(): void {
    const signature = personalCategoryLayoutSignature(
      this.uniqueCategories,
      (category) => this.getCategoryCount(category)
    );
    if (signature === this.layoutSignature) {
      return;
    }
    this.layoutSignature = signature;
    this.scheduleTruncationUpdate();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  shouldTruncateCategory(category: string): boolean {
    return this.truncatedCategories.has(category);
  }

  isSoloRowCategory(category: string): boolean {
    return this.soloRowCategories.has(category);
  }

  categoryChipHostClass(category: string): string {
    return this.isSoloRowCategory(category)
      ? this.categoryChipSoloFlexClass
      : this.categoryChipFlexClass;
  }

  categoryChipButtonClass(category: string): string {
    const base = this.isSoloRowCategory(category)
      ? this.namedChipSoloStretchClass
      : this.namedChipStretchClass;
    return (
      base +
      (this.isPersonalCategorySelected(category)
        ? " " + this.personalCategoryActiveClass
        : " " + this.namedChipInactiveClass) +
      (this.isCategorySwapping(category)
        ? " opacity-50 cursor-not-allowed"
        : " cursor-pointer")
    );
  }

  categoryChipLabel(category: string): string {
    return `${category} (${this.getCategoryCount(category)})`;
  }

  onCategoryDrop(event: CdkDragDrop<string[]>): void {
    this.categoryDrop.emit(event);
    this.scheduleTruncationUpdate();
  }

  onCategoryDragEnded(): void {
    this.categoryDragEnded.emit();
    this.scheduleTruncationUpdate();
  }

  private scheduleTruncationUpdate(): void {
    queueMicrotask(() => {
      requestAnimationFrame(() => this.updateTruncation());
    });
  }

  private updateTruncation(): void {
    const container = this.categoryDropList?.nativeElement;
    if (!container) {
      return;
    }

    const next = computePersonalCategoryChipLayout(container);
    if (personalCategoryChipLayoutEqual(next, this.layout)) {
      return;
    }
    this.layout = next;
    this.soloRowCategories = next.soloRowCategories;
    this.truncatedCategories = next.truncatedCategories;
    this.cdr.markForCheck();
  }
}
