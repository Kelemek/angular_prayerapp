import { Component, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectionStrategy, Inject, Optional, InjectionToken } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrandingService } from '../../services/branding.service';
import { Subject, takeUntil } from 'rxjs';

export const BRANDING_SERVICE_TOKEN = new InjectionToken<BrandingService>('BrandingService');

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (useLogo && imageUrl) {
      <div class="min-w-0 flex-1">
        <img 
          [src]="imageUrl" 
          alt="Church Logo" 
          class="h-16 w-auto max-w-xs object-contain"
          width="256"
          height="64"
        />
      </div>
    }
    @if (!useLogo && appTitle) {
      <div class="min-w-0 flex-1">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ appTitle }}
        </h1>
        @if (appSubtitle) {
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ appSubtitle }}
          </p>
        }
      </div>
    }
  `,
  styles: []
})
export class AppLogoComponent implements OnInit, OnDestroy {
  imageUrl: string = '';
  useLogo = false;
  appTitle: string = 'Church Prayer Manager';
  appSubtitle: string = 'Keeping our community connected in prayer';
  @Output() logoStatusChange = new EventEmitter<boolean>();
  
  private destroy$ = new Subject<void>();

  constructor(@Inject(BRANDING_SERVICE_TOKEN) private brandingService: BrandingService) {}

  ngOnInit() {
    this.initializeBranding();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeBranding() {
    await this.brandingService.initialize();
    
    this.brandingService.branding$
      .pipe(takeUntil(this.destroy$))
      .subscribe(branding => {
        this.useLogo = branding.useLogo;
        this.appTitle = branding.appTitle;
        this.appSubtitle = branding.appSubtitle;
        this.updateImageUrl(branding);
      });
  }

  private updateImageUrl(branding: any) {
    if (!this.useLogo) {
      this.imageUrl = '';
      this.logoStatusChange.emit(false);
      return;
    }

    this.imageUrl = this.brandingService.getImageUrl(branding);
    const hasLogo = this.useLogo && !!this.imageUrl;
    this.logoStatusChange.emit(hasLogo);
  }
}
