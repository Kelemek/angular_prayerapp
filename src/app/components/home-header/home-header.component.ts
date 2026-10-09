import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { AppLogoComponent } from "../app-logo/app-logo.component";
import type { HomeHeaderHandlers } from "../../lib/home-header-handlers";
import { HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS } from "../../lib/home-sub-filter-chip-classes";
import {
  TOUR_BTN_SEARCH_ID,
  TOUR_PRAYER_MODE_BTN_ID,
  TOUR_REQUEST_BTN_ID,
  TOUR_SETTINGS_BTN_ID,
} from "../../lib/help-tour-ids";

/** Fluid logo/title in the home toolbar on narrow viewports (see `HomeHeaderComponent`). */
export const HOME_HEADER_LOGO_TOOLBAR_SLOT_CLASS =
  "min-w-0 flex-1 overflow-hidden sm:flex-initial sm:overflow-visible " +
  "[&_img]:max-h-10 [&_img]:sm:max-h-none [&_img]:sm:h-16 [&_img]:max-w-full [&_img]:sm:max-w-xs [&_img]:w-auto [&_img]:h-auto [&_img]:object-contain [&_img]:object-left " +
  "[&_h1]:text-base [&_h1]:leading-tight [&_h1]:sm:text-xl [&_h1]:sm:leading-normal [&_h1]:font-bold [&_h1]:truncate " +
  "[&_p]:hidden [&_p]:sm:block";

@Component({
  selector: "app-home-header",
  standalone: true,
  imports: [CommonModule, RouterModule, AppLogoComponent],
  templateUrl: "./home-header.component.html",
})
export class HomeHeaderComponent {
  readonly headerShellClass = `contrast-chip-surface w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md ${HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS}`;
  readonly logoToolbarSlotClass = HOME_HEADER_LOGO_TOOLBAR_SLOT_CLASS;
  readonly headerChipClass =
    "flex items-center gap-1 px-2 py-2 sm:justify-center sm:h-12 sm:px-3 text-sm font-medium";
  readonly headerIconClass = "w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0";

  readonly tourSearchBtnId = TOUR_BTN_SEARCH_ID;
  readonly tourSettingsBtnId = TOUR_SETTINGS_BTN_ID;
  readonly tourPrayerModeBtnId = TOUR_PRAYER_MODE_BTN_ID;
  readonly tourRequestBtnId = TOUR_REQUEST_BTN_ID;

  @Input({ required: true }) showSearchPanel!: boolean;
  @Input({ required: true }) presentationHandoffQueryParams!:
    | Record<string, string>
    | null;
  @Input({ required: true }) handlers!: HomeHeaderHandlers;

  @Output() logoStatusChange = new EventEmitter<boolean>();
}
