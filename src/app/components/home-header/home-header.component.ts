import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { Observable } from "rxjs";
import { AppLogoComponent } from "../app-logo/app-logo.component";
import { UserSessionService } from "../../services/user-session.service";
import { HomeModalController } from "../../services/home-modal.controller";
import { HomeAdminNavigationController } from "../../services/home-admin-navigation.controller";
import { HomePresentationNavigationController } from "../../services/home-presentation-navigation.controller";

@Component({
  selector: "app-home-header",
  standalone: true,
  imports: [CommonModule, RouterModule, AppLogoComponent],
  templateUrl: "./home-header.component.html",
})
export class HomeHeaderComponent {
  @Input({ required: true }) hasAdminEmail$!: Observable<boolean>;
  @Output() logoStatusChange = new EventEmitter<boolean>();

  constructor(
    public userSessionService: UserSessionService,
    readonly modals: HomeModalController,
    readonly adminNav: HomeAdminNavigationController,
    readonly presentationNav: HomePresentationNavigationController
  ) {}
}
