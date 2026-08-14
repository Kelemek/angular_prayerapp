import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HomeFilterCoordinator } from "../../services/home-filter.coordinator";
import { HomeCatalogStore } from "../../services/home-catalog.store";
import { BadgeService } from "../../services/badge.service";

@Component({
  selector: "app-home-prompt-type-filters",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./home-prompt-type-filters.component.html",
})
export class HomePromptTypeFiltersComponent {
  @Input({ required: true }) promptsCount!: number;
  @Input({ required: true }) selectedPromptTypes!: string[];
  @Input({ required: true }) promptTypeActiveClass!: string;
  @Input({ required: true }) promptTypeInactiveClass!: string;

  constructor(
    readonly filter: HomeFilterCoordinator,
    readonly catalog: HomeCatalogStore,
    readonly badgeService: BadgeService
  ) {}
}
