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
import { InfoHeroSectionComponent } from "../../components/info-hero-section/info-hero-section.component";
import { InfoFeatureOverviewComponent } from "../../components/info-feature-overview/info-feature-overview.component";
import { InfoPreviewModalsComponent } from "../../components/info-preview-modals/info-preview-modals.component";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-info",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleComponent,
    InfoHeroSectionComponent,
    InfoFeatureOverviewComponent,
    InfoPreviewModalsComponent,
  ],
  styleUrl: "./info.component.css",
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: "./info.component.html",
})
export class InfoComponent implements OnInit, OnDestroy {
  brandingImageUrl = "";
  brandingUseLogo = false;
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(BRANDING_SERVICE_TOKEN) private brandingService: BrandingService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
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
}
