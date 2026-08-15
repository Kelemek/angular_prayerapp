import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { BadgeService } from "../../services/badge.service";
import {
  HOME_PROMPTS_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { buildHomeSubFilterChipButtonClass } from "../../lib/home-sub-filter-chip-button-class";
import { HOME_SHELL_SECTION_GAP_CLASSES } from "../../lib/home-shell-spacing";
import { HomeFilterBadgeButtonComponent } from "../home-filter-badge-button/home-filter-badge-button.component";

@Component({
  selector: "app-home-prompt-type-filters",
  standalone: true,
  imports: [CommonModule, HomeFilterBadgeButtonComponent],
  templateUrl: "./home-prompt-type-filters.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block" },
})
export class HomePromptTypeFiltersComponent {
  @Input({ required: true }) promptsCount!: number;
  @Input({ required: true }) selectedPromptTypes!: string[];
  @Input({ required: true }) uniquePromptTypes!: string[];
  @Input({ required: true }) promptTypeActiveClass!: string;
  @Input({ required: true }) promptTypeInactiveClass!: string;
  @Input({ required: true }) getPromptCountByType!: (type: string) => number;
  @Input({ required: true }) getUnreadPromptCountByType!: (type: string) => number;

  @Output() clearTypes = new EventEmitter<void>();
  @Output() toggleType = new EventEmitter<string>();

  readonly chipHostClass = HOME_WRAP_FILTER_CHIP_FLEX_CLASS;
  readonly chipButtonClass = HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS;
  readonly chipRowClass = HOME_SUB_FILTER_CHIP_ROW_CLASS;
  readonly subFilterGroupClass = HOME_PROMPTS_SUB_FILTER_GROUP_CLASS;
  @Input() sectionGapClass = HOME_SHELL_SECTION_GAP_CLASSES;

  readonly badgeService = inject(BadgeService);
  private readonly destroyRef = inject(DestroyRef);
  /** Bumps when a prompt is marked read so type-chip unread counts refresh. */
  readonly unreadBadgeEpoch = signal(0);

  constructor() {
    this.badgeService
      .getUpdateBadgesChanged$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.unreadBadgeEpoch.update((epoch) => epoch + 1));
  }

  unreadCountForType(type: string): number {
    this.unreadBadgeEpoch();
    return this.getUnreadPromptCountByType(type);
  }

  promptChipButtonClass(active: boolean, hasBadge: boolean): string {
    return buildHomeSubFilterChipButtonClass({
      base: this.chipButtonClass,
      active,
      activeClass: this.promptTypeActiveClass,
      inactiveClass: this.promptTypeInactiveClass,
      relative: hasBadge,
    });
  }
}
