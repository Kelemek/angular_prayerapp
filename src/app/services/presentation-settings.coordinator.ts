import { Injectable } from "@angular/core";
import { PresentationSettingsService } from "./presentation-settings.service";
import type {
  PresentationSettings,
  PresentationTimeFilter,
  SelectablePresentationContentType,
} from "../types/presentation";

export interface PresentationSettingsPageState {
  contentTypes: SelectablePresentationContentType[];
  randomize: boolean;
  smartMode: boolean;
  displayDuration: number;
  loop: boolean;
  timeFilter: PresentationTimeFilter;
  statusFilters: { current: boolean; answered: boolean };
  prayerTimerMinutes: number;
}

@Injectable()
export class PresentationSettingsCoordinator {
  constructor(
    private readonly presentationSettingsService: PresentationSettingsService
  ) {}

  loadInto(page: PresentationSettingsPageState): void {
    this.applyTo(page, this.presentationSettingsService.load());
  }

  applyTo(
    page: PresentationSettingsPageState,
    settings: PresentationSettings
  ): void {
    page.contentTypes = [...settings.contentTypes];
    page.randomize = settings.randomize;
    page.smartMode = settings.smartMode;
    page.displayDuration = settings.displayDuration;
    page.loop = settings.loop;
    page.timeFilter = settings.timeFilter;
    page.statusFilters = { ...settings.statusFilters };
    page.prayerTimerMinutes = settings.prayerTimerMinutes;
  }

  snapshotFrom(page: PresentationSettingsPageState): PresentationSettings {
    return {
      contentTypes: [...page.contentTypes],
      randomize: page.randomize,
      smartMode: page.smartMode,
      displayDuration: page.displayDuration,
      loop: page.loop,
      timeFilter: page.timeFilter,
      statusFilters: { ...page.statusFilters },
      prayerTimerMinutes: page.prayerTimerMinutes,
    };
  }

  persistFrom(page: PresentationSettingsPageState): void {
    this.presentationSettingsService.save(this.snapshotFrom(page));
  }

  applyAndPersist(
    page: PresentationSettingsPageState,
    patch: Partial<PresentationSettingsPageState>
  ): void {
    Object.assign(page, patch);
    this.persistFrom(page);
  }
}
