import { Component, EventEmitter, inject, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { AppLogoComponent } from "../app-logo/app-logo.component";
import { AdminPendingBadgeComponent } from "../admin-pending-badge/admin-pending-badge.component";
import { AdminPendingCountService } from "../../services/admin-pending-count.service";
import type { HomeHeaderHandlers } from "../../lib/home-header-handlers";
import {
  HOME_HEADER_CHIP_SIZE_LOCK_CLASS,
  HOME_HEADER_LOGO_TOOLBAR_SLOT_CLASS,
  HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import {
  TOUR_BTN_SEARCH_ID,
  TOUR_PRAYER_MODE_BTN_ID,
  TOUR_REQUEST_BTN_ID,
  TOUR_SETTINGS_BTN_ID,
} from "../../lib/help-tour-ids";

/** @deprecated Import from `home-sub-filter-chip-classes` instead. */
export { HOME_HEADER_LOGO_TOOLBAR_SLOT_CLASS } from "../../lib/home-sub-filter-chip-classes";

@Component({
  selector: "app-home-header",
  standalone: true,
  imports: [CommonModule, RouterModule, AppLogoComponent, AdminPendingBadgeComponent],
  templateUrl: "./home-header.component.html",
})
export class HomeHeaderComponent {
  readonly pendingApprovalItemCount$ = inject(AdminPendingCountService).pendingApprovalItemCount$;

  readonly headerShellClass = `contrast-chip-surface w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md ${HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS}`;
  readonly logoToolbarSlotClass = HOME_HEADER_LOGO_TOOLBAR_SLOT_CLASS;
  readonly headerChipClass =
    `flex items-center gap-1 px-2 py-2 sm:justify-center sm:h-12 sm:px-3 text-sm font-medium ${HOME_HEADER_CHIP_SIZE_LOCK_CLASS}`;
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
