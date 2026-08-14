import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DragDropModule } from "@angular/cdk/drag-drop";
import type { PrayerRequest } from "../../services/prayer.service";
import { HomePersonalCategoryController } from "../../services/home-personal-category.controller";
import { HomeCatalogStore } from "../../services/home-catalog.store";

@Component({
  selector: "app-home-personal-category-filters",
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: "./home-personal-category-filters.component.html",
})
export class HomePersonalCategoryFiltersComponent {
  @Input({ required: true }) personalPrayers!: PrayerRequest[];
  @Input({ required: true }) personalPrayersCount!: number;

  constructor(
    readonly personalCategory: HomePersonalCategoryController,
    readonly catalog: HomeCatalogStore
  ) {}
}
