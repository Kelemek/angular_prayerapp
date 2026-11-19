import { Component, OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";
import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
} from "../../../lib/app-store-links";

@Component({
  selector: "app-info-hero-section",
  standalone: true,
  imports: [RouterModule],
  templateUrl: "./info-hero-section.component.html",
  styleUrl: "./info-hero-section.component.css",
  host: {
    class: "info-page-tv-hero flex flex-col gap-5",
  },
})
export class InfoHeroSectionComponent implements OnInit {
  private readonly iosStoreUrl = IOS_APP_STORE_URL;
  private readonly androidStoreUrl = ANDROID_PLAY_STORE_URL;

  webAppQrUrl = "";
  iosStoreQrUrl = "";
  androidStoreQrUrl = "";

  ngOnInit(): void {
    this.webAppQrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=384x384&data=" +
      encodeURIComponent("https://cpprayer.cp-church.org/");
    this.iosStoreQrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=384x384&data=" +
      encodeURIComponent(this.iosStoreUrl);
    this.androidStoreQrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=384x384&data=" +
      encodeURIComponent(this.androidStoreUrl);
  }

  openIosStore(): void {
    window.open(this.iosStoreUrl, "_blank", "noopener");
  }

  openAndroidStore(): void {
    window.open(this.androidStoreUrl, "_blank", "noopener");
  }
}
