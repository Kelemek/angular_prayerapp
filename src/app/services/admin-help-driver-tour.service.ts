import { Injectable } from '@angular/core';
import { driver, type Driver } from 'driver.js';
import { HelpDriverTourService } from './help-driver-tour.service';
import { buildAdminHelpDriverConfig } from '../lib/admin-help-tour-driver-config';
import {
  buildEmailSubscribersOverviewTourSteps,
  buildEmailSubscribersTourSteps,
  buildMemorizeRecommendationsTourSteps,
  buildPrayerEditorCreateTourSteps,
  buildPrayerEditorManageTourSteps,
  buildPrayerPromptsAndTypesTourSteps,
} from '../lib/admin-help-tour-catalog';
import type {
  AdminEmailSubscribersTourCallbacks,
  AdminPrayerEditorCreateTourCallbacks,
  AdminPrayerEditorManageTourCallbacks,
} from '../types/admin-help-tour';

export type {
  AdminEmailSubscribersTourCallbacks,
  AdminPrayerEditorCreateTourCallbacks,
  AdminPrayerEditorManageTourCallbacks,
} from '../types/admin-help-tour';

/**
 * driver.js tours for the Admin Portal (distinct from main-app HelpDriverTourService).
 * Step catalogs live in `src/app/lib/admin-help-tour-catalog/`.
 */
@Injectable({ providedIn: 'root' })
export class AdminHelpDriverTourService {
  private activeDriver: Driver | null = null;

  constructor(private readonly helpDriverTour: HelpDriverTourService) {}

  destroy(): void {
    if (this.activeDriver) {
      this.activeDriver.destroy();
      this.activeDriver = null;
    }
  }

  private startTour(
    steps: ReturnType<typeof buildEmailSubscribersTourSteps>,
    onDestroyed?: () => void,
  ): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    this.helpDriverTour.interruptGuidedTours();

    const d = driver(
      buildAdminHelpDriverConfig(steps, () => {
        this.activeDriver = null;
        onDestroyed?.();
      }),
    );
    this.activeDriver = d;
    d.drive(0);
  }

  /**
   * Walks Settings → Email → Email Subscribers → Add Subscriber → manual entry → PC tab → search →
   * first result row → Add Selected Subscriber → Manual Entry filled → Add Subscriber → closing popover.
   */
  startEmailSubscribersTour(callbacks: AdminEmailSubscribersTourCallbacks): void {
    this.startTour(buildEmailSubscribersTourSteps(callbacks));
  }

  /**
   * High-level walkthrough of Settings → Email → Email Subscribers: toolbar, search, and each column on a sample row.
   * Call after `prepareOverviewTourListState` so the search field contains **app-test** and matching rows load.
   */
  startEmailSubscribersOverviewTour(): void {
    this.startTour(buildEmailSubscribersOverviewTourSteps());
  }

  /**
   * Admin Settings → Tools → Prayer Editor → Create New Prayer form fields → Create Prayer button.
   */
  startPrayerEditorCreateTour(callbacks: AdminPrayerEditorCreateTourCallbacks): void {
    this.startTour(buildPrayerEditorCreateTourSteps(callbacks));
  }

  /**
   * Admin Settings → Tools → Prayer Editor → first prayer: open edit (field walkthrough → cancel), open Add Update (field walkthrough → cancel). Does not save.
   */
  startPrayerEditorManageTour(
    hasPrayerRow: boolean,
    callbacks: AdminPrayerEditorManageTourCallbacks,
  ): void {
    this.startTour(buildPrayerEditorManageTourSteps(hasPrayerRow, callbacks), () => {
      if (hasPrayerRow) {
        callbacks.resetTourUiState();
      }
    });
  }

  /**
   * Settings → Content → Prayer Prompts and Prayer Types: toolbar, search, lists (no add forms opened).
   */
  startPrayerPromptsAndTypesTour(): void {
    this.startTour(buildPrayerPromptsAndTypesTourSteps());
  }

  /**
   * Settings → Content → Memorize Recommendations: categories, verses, drag-reorder (no add forms opened).
   */
  startMemorizeRecommendationsTour(hasCategories: boolean): void {
    this.startTour(buildMemorizeRecommendationsTourSteps(hasCategories));
  }
}
