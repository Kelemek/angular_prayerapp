import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { BrandingService } from "../../services/branding.service";
import { BRANDING_SERVICE_TOKEN } from "../../components/app-logo/app-logo.component";
import { ThemeToggleComponent } from "../../components/theme-toggle/theme-toggle.component";
import { InfoHomeFilterPreviewComponent } from "../../components/info-home-filter-preview/info-home-filter-preview.component";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-info",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleComponent,
    InfoHomeFilterPreviewComponent,
  ],
  styleUrl: "./info.component.css",
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: "./info.component.html",
})
export class InfoComponent implements OnInit, OnDestroy {
  private readonly iosStoreUrl =
    "https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929";
  private readonly androidStoreUrl =
    "https://play.google.com/store/apps/details?id=com.prayerapp.mobile";
  headerPreview:
    | "help"
    | "settings"
    | "pray"
    | "request"
    | "search"
    | "card-update"
    | "card-pray-for"
    | null = null;
  showPromptCategoriesModal = false;
  showBadgesModal = false;
  showPersonalCategoriesModal = false;
  personalActionModal: "answered" | "edit" | "delete" | null = null;

  brandingImageUrl = "";
  brandingUseLogo = false;
  webAppQrUrl = "";
  iosStoreQrUrl = "";
  androidStoreQrUrl = "";
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(BRANDING_SERVICE_TOKEN) private brandingService: BrandingService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.webAppQrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=384x384&data=" +
      encodeURIComponent("https://cpprayer.cp-church.org/");
    this.iosStoreQrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=384x384&data=" +
      encodeURIComponent(this.iosStoreUrl);
    this.androidStoreQrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=384x384&data=" +
      encodeURIComponent(this.androidStoreUrl);
    await this.brandingService.initialize();
    this.brandingService.branding$
      .pipe(takeUntil(this.destroy$))
      .subscribe((branding) => {
        this.brandingUseLogo = branding.useLogo;
        this.brandingImageUrl = this.brandingUseLogo
          ? this.brandingService.getImageUrl(branding)
          : "";
        this.cdr?.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openIosStore(): void {
    window.open(this.iosStoreUrl, "_blank", "noopener");
  }

  openAndroidStore(): void {
    window.open(this.androidStoreUrl, "_blank", "noopener");
  }

  openHeaderModal(
    which:
      | "help"
      | "settings"
      | "pray"
      | "request"
      | "search"
      | "card-update"
      | "card-pray-for"
  ): void {
    this.headerPreview = which;
  }

  closeHeaderModal(): void {
    this.headerPreview = null;
  }

  openPromptCategoriesModal(): void {
    this.showPromptCategoriesModal = true;
  }

  closePromptCategoriesModal(): void {
    this.showPromptCategoriesModal = false;
  }

  openBadgesModal(): void {
    this.showBadgesModal = true;
  }

  closeBadgesModal(): void {
    this.showBadgesModal = false;
  }

  openPersonalActionModal(which: "answered" | "edit" | "delete"): void {
    this.personalActionModal = which;
  }

  closePersonalActionModal(): void {
    this.personalActionModal = null;
  }

  openPersonalCategoriesModal(): void {
    this.showPersonalCategoriesModal = true;
  }

  closePersonalCategoriesModal(): void {
    this.showPersonalCategoriesModal = false;
  }
}
