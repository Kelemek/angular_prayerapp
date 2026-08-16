import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { Observable } from "rxjs";
import { AppLogoComponent } from "../app-logo/app-logo.component";
import { UserSessionService } from "../../services/user-session.service";
import type { HomeHeaderHandlers } from "../../lib/home-header-handlers";
import { HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS } from "../../lib/home-sub-filter-chip-classes";

@Component({
  selector: "app-home-header",
  standalone: true,
  imports: [CommonModule, RouterModule, AppLogoComponent],
  templateUrl: "./home-header.component.html",
})
export class HomeHeaderComponent {
  readonly headerShellClass = `contrast-chip-surface w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md ${HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS}`;
  @Input({ required: true }) hasAdminEmail$!: Observable<boolean>;
  @Input({ required: true }) showSearchPanel!: boolean;
  @Input({ required: true }) presentationHandoffQueryParams!:
    | Record<string, string>
    | null;
  @Input({ required: true }) userEmailFallback!: string;
  @Input({ required: true }) handlers!: HomeHeaderHandlers;

  @Output() logoStatusChange = new EventEmitter<boolean>();

  constructor(readonly userSessionService: UserSessionService) {}
}
