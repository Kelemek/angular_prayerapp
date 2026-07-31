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
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-info",
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent],
  styles: `
    /* Safe area support for notched/dynamic island devices */
    :host {
      --safe-area-inset-top: env(safe-area-inset-top, 0px);
      --safe-area-inset-right: env(safe-area-inset-right, 0px);
      --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
      --safe-area-inset-left: env(safe-area-inset-left, 0px);
      /* Uniform scale for 5.5×8.5in book view only (sm+; reset on TV & mobile) */
      --info-book-content-scale: 0.78;
      /* 16:9 TV / kiosk: 1 = fill frame; layout uses flex + fluid type below */
      --info-tv-content-scale: 1;
    }

    .safe-area-container {
      padding-top: max(1.25rem, var(--safe-area-inset-top));
      padding-bottom: max(1.25rem, var(--safe-area-inset-bottom));
    }

    .safe-area-horizontal {
      padding-left: max(1rem, var(--safe-area-inset-left));
      padding-right: max(1rem, var(--safe-area-inset-right));
      padding-top: 2.5rem;
      padding-bottom: 4rem;
    }

    .safe-area-top-right {
      top: max(1rem, var(--safe-area-inset-top));
      right: max(1rem, var(--safe-area-inset-right));
    }

    /* Info page layout: book size (5.5×8.5 in), full-bleed on smallest screens, 16:9 on large TVs */
    .info-page-shell {
      width: 100%;
    }

    .info-page-body {
      width: 100%;
      box-sizing: border-box;
    }

    /* Smallest screens: no fixed page height or narrow book width */
    @media (max-width: 639px) {
      .info-page-body {
        max-width: none;
        max-height: none;
        overflow: visible;
      }
    }

    /* sm+ : portrait “page” 5.5in × 8.5in (11∶17); frame keeps book proportions (overridden on large TVs) */
    @media (min-width: 640px) {
      .info-page-body {
        box-sizing: border-box;
        /* Exact book aspect; shrink uniformly if viewport is short or narrow */
        width: min(5.5in, calc(100vw - 2rem));
        aspect-ratio: 11 / 17;
        max-height: min(8.5in, calc(100dvh - 4rem));
        max-width: min(5.5in, calc(100vw - 2rem));
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        margin-left: auto;
        margin-right: auto;
        border-radius: 0.75rem;
        box-shadow:
          0 1px 3px rgba(0, 0, 0, 0.08),
          0 4px 12px rgba(0, 0, 0, 0.06);
      }

      /* Scale all content proportionally (layout unchanged; fits the page better) */
      .info-page-body-scaled {
        zoom: var(--info-book-content-scale);
      }

      /* Padding balanced to the scaled page */
      .info-page-body .info-page-body-scaled.safe-area-horizontal {
        padding-top: 1.5rem;
        padding-bottom: 2rem;
      }
    }

    /*
     * Wide “TV / kiosk” view: hide the long Feature overview block (hero + CTAs only).
     * Uses min-width only so short viewports (browser chrome, taskbar) still qualify.
     */
    @media (min-width: 1920px) {
      :host .info-page-feature-overview {
        display: none !important;
      }
    }

    /* Large TV only: 16:9 content frame (replaces book dimensions) */
    @media (min-width: 1920px) and (min-height: 720px) {
      .info-page-body {
        max-width: min(100vw - 2.5rem, calc((100vh - 2.5rem) * 16 / 9));
        width: min(100vw - 2.5rem, calc((100vh - 2.5rem) * 16 / 9));
        max-height: min(100vh - 2.5rem, calc((100vw - 2.5rem) * 9 / 16));
        aspect-ratio: 16 / 9;
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        margin-left: auto;
        margin-right: auto;
        border-radius: 0.75rem;
        box-shadow:
          0 4px 24px rgba(0, 0, 0, 0.12),
          0 0 0 1px rgba(0, 0, 0, 0.04);
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .info-page-body-scaled {
        zoom: var(--info-tv-content-scale);
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
      }

      .info-page-body .info-page-body-scaled.safe-area-horizontal {
        padding: clamp(0.75rem, 2vmin, 1.5rem) clamp(1rem, 3vw, 2.5rem);
        min-height: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }

      .info-page-info-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        width: 100%;
      }

      .info-page-tv-hero {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        align-items: stretch;
        width: 100%;
        min-height: 0;
        gap: clamp(0.75rem, 2.5vmin, 2rem);
      }

      .info-page-tv-hero .info-page-hero-row {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: flex-start;
        flex-wrap: nowrap;
        gap: clamp(1.25rem, 3vw, 3rem);
      }

      .info-page-tv-hero .info-page-hero-icon {
        width: clamp(7rem, 18vmin, 15rem);
        height: clamp(7rem, 18vmin, 15rem);
        flex-shrink: 0;
      }

      .info-page-tv-hero .info-page-title {
        font-size: clamp(2.5rem, 7vmin, 6rem);
        line-height: 1.08;
        text-align: left;
      }

      .info-page-tv-hero .info-page-verse {
        max-width: none;
        width: 100%;
        font-size: clamp(1.2rem, 3.2vmin, 2.35rem);
        line-height: 1.45;
        text-align: left;
      }

      .info-page-tv-hero .info-page-cta-grid {
        width: 100%;
        align-items: stretch;
        gap: clamp(1.25rem, 3vmin, 3rem);
      }

      .info-page-tv-hero .info-page-cta-grid > div {
        flex: 1 1 0;
        min-width: 0;
      }

      .info-page-tv-hero .info-page-cta-grid button {
        min-height: clamp(15rem, 40vmin, 32rem);
        padding: clamp(1.75rem, 4.2vmin, 3.25rem) clamp(1.5rem, 3.5vw, 2.75rem);
        font-size: clamp(1.35rem, 3.4vmin, 2.35rem);
        border-radius: 1.25rem;
      }

      .info-page-tv-hero .info-page-cta-grid button .text-sm {
        font-size: clamp(1.25rem, 3.2vmin, 2.15rem) !important;
      }

      .info-page-tv-hero .info-page-cta-grid button .h-9.w-9 {
        width: clamp(3.75rem, 10vmin, 7rem) !important;
        height: clamp(3.75rem, 10vmin, 7rem) !important;
        min-width: clamp(3.75rem, 10vmin, 7rem) !important;
        min-height: clamp(3.75rem, 10vmin, 7rem) !important;
      }

      .info-page-tv-hero .info-page-cta-grid button svg {
        width: clamp(2.25rem, 5.5vmin, 4rem) !important;
        height: clamp(2.25rem, 5.5vmin, 4rem) !important;
      }

      .info-page-tv-hero .info-page-cta-grid button .text-xl {
        font-size: clamp(2.25rem, 5.5vmin, 4rem) !important;
      }

      .info-page-tv-hero .info-page-cta-grid .info-page-qr-tile {
        width: clamp(12rem, 28vmin, 20rem) !important;
        height: clamp(12rem, 28vmin, 20rem) !important;
        min-width: clamp(12rem, 28vmin, 20rem) !important;
        min-height: clamp(12rem, 28vmin, 20rem) !important;
        border-radius: 1.25rem;
      }

      .info-page-tv-hero .info-page-cta-grid .info-page-qr-tile img {
        width: clamp(10rem, 24vmin, 17rem) !important;
        height: clamp(10rem, 24vmin, 17rem) !important;
      }

      .info-page-tv-hero .info-page-cta-grid .info-page-qr-tile > .grid {
        width: clamp(10rem, 24vmin, 17rem) !important;
        height: clamp(10rem, 24vmin, 17rem) !important;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      class="info-page-shell w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors safe-area-container flex flex-col sm:items-center"
    >
      <div class="absolute z-10 safe-area-top-right">
        <app-theme-toggle></app-theme-toggle>
      </div>
      <div class="info-page-body">
        <div class="info-page-body-scaled safe-area-horizontal space-y-16">
          <!-- Hero: image + title + description -->
          <section class="info-page-info-section flex flex-col gap-5">
            <div class="info-page-tv-hero flex flex-col gap-5">
              <div class="space-y-6">
                <div
                  class="info-page-hero-row inline-flex items-center gap-4 mb-2"
                >
                  <div
                    class="info-page-hero-icon h-20 w-20 shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center shadow-xl overflow-hidden"
                  >
                    <img
                      src="/CrossPointPrayer.jpg"
                      alt="Prayer App Icon"
                      class="h-full w-full rounded-2xl object-contain shadow-xl"
                    />
                  </div>
                  <h1
                    class="info-page-title text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
                  >
                    Cross Pointe<br />
                    <span class="text-emerald-600 dark:text-emerald-300"
                      >Prayer Community</span
                    >
                  </h1>
                </div>
                <p
                  class="info-page-verse text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl"
                >
                  Rejoice always, pray without ceasing, give thanks in all
                  circumstances; for this is the will of God in Christ Jesus for
                  you. <span class="whitespace-nowrap">1 Thes. 5:16–18</span>
                </p>
              </div>

              <!-- CTA buttons: second row under hero -->
              <div
                class="info-page-cta-grid w-full grid gap-3 sm:gap-4 sm:grid-cols-3"
              >
                <!-- Web app CTA + QR -->
                <div class="w-full flex flex-col items-center gap-2">
                  <button
                    type="button"
                    routerLink="/"
                    class="group w-full inline-flex flex-row sm:flex-col items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-200/80 dark:bg-gray-800/70 px-5 py-3 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-colors cursor-pointer"
                  >
                    <span class="flex w-full items-center justify-center">
                      <span
                        class="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-gray-300 dark:bg-gray-800"
                      >
                        <img
                          src="/CrossPointPrayer.jpg"
                          alt=""
                          class="h-full w-full object-contain"
                        />
                      </span>
                      <span class="text-left leading-tight">
                        <span
                          class="block text-sm font-semibold whitespace-nowrap"
                          >Web Site</span
                        >
                      </span>
                    </span>
                    <div
                      class="info-page-qr-tile hidden sm:flex sm:h-28 sm:w-28 sm:min-h-28 sm:min-w-28 shrink-0 rounded-xl border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-100 items-center justify-center p-1 ring-2 ring-emerald-400/50"
                      aria-hidden="true"
                    >
                      @if (webAppQrUrl) {
                      <img
                        [src]="webAppQrUrl"
                        alt="QR code for web app"
                        class="h-24 w-24 shrink-0 rounded object-contain"
                        width="96"
                        height="96"
                        loading="lazy"
                      />
                      } @else {
                      <div
                        class="h-24 w-24 grid grid-cols-5 grid-rows-5 gap-0 shrink-0"
                      >
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-white"></div>
                        <div class="bg-white"></div>
                        <div class="bg-white"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-white"></div>
                        <div class="bg-black"></div>
                        <div class="bg-white"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-white"></div>
                        <div class="bg-white"></div>
                        <div class="bg-white"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                      </div>
                      }
                    </div>
                  </button>
                </div>

                <!-- iOS CTA + QR -->
                <div class="w-full flex flex-col items-center gap-2">
                  <button
                    type="button"
                    (click)="openIosStore()"
                    class="group w-full inline-flex flex-row sm:flex-col items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-200/80 dark:bg-gray-800/70 px-5 py-3 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-colors cursor-pointer"
                  >
                    <span class="flex w-full items-center justify-center">
                      <span
                        class="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black"
                      >
                        <span
                          class="text-xl sm:text-2xl font-semibold text-white"
                          >&#63743;</span
                        >
                      </span>
                      <span class="text-left leading-tight">
                        <span
                          class="block text-sm font-semibold whitespace-nowrap"
                          >App Store</span
                        >
                      </span>
                    </span>
                    <div
                      class="info-page-qr-tile hidden sm:flex sm:h-28 sm:w-28 sm:min-h-28 sm:min-w-28 shrink-0 rounded-xl border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-100 items-center justify-center p-1 ring-2 ring-emerald-400/50"
                      aria-hidden="true"
                    >
                      <img
                        [src]="iosStoreQrUrl"
                        alt="QR code for App Store"
                        class="h-24 w-24 shrink-0 rounded object-contain"
                        width="96"
                        height="96"
                        loading="lazy"
                      />
                    </div>
                  </button>
                </div>

                <!-- Android CTA + QR -->
                <div class="w-full flex flex-col items-center gap-2">
                  <button
                    type="button"
                    (click)="openAndroidStore()"
                    aria-label="Download on Play Store"
                    class="group w-full inline-flex flex-row sm:flex-col items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-200/80 dark:bg-gray-800/70 px-5 py-3 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-colors cursor-pointer"
                  >
                    <span class="flex w-full items-center justify-center">
                      <span
                        class="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-white"
                        aria-hidden="true"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 -960 960 960"
                          class="h-5 w-5 shrink-0 sm:h-6 sm:w-6"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            d="M40-240q9-107 65.5-197T256-580l-74-128q-6-9-3-19t13-15q8-5 18-2t16 12l74 128q86-36 180-36t180 36l74-128q6-9 16-12t18 2q10 5 13 15t-3 19l-74 128q94 53 150.5 143T920-240H40Zm275.5-124.5Q330-379 330-400t-14.5-35.5Q301-450 280-450t-35.5 14.5Q230-421 230-400t14.5 35.5Q259-350 280-350t35.5-14.5Zm400 0Q730-379 730-400t-14.5-35.5Q701-450 680-450t-35.5 14.5Q630-421 630-400t14.5 35.5Q659-350 680-350t35.5-14.5Z"
                          />
                        </svg>
                      </span>
                      <span class="text-left leading-tight">
                        <span
                          class="block text-sm font-semibold whitespace-nowrap"
                          >Play Store</span
                        >
                      </span>
                    </span>
                    <div
                      class="info-page-qr-tile hidden sm:flex sm:h-28 sm:w-28 sm:min-h-28 sm:min-w-28 shrink-0 rounded-xl border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-100 items-center justify-center p-1 ring-2 ring-emerald-400/50"
                      aria-hidden="true"
                    >
                      @if (androidStoreQrUrl) {
                      <img
                        [src]="androidStoreQrUrl"
                        alt="QR code for Play Store"
                        class="h-24 w-24 shrink-0 rounded object-contain"
                        width="96"
                        height="96"
                        loading="lazy"
                      />
                      } @else {
                      <div
                        class="h-24 w-24 grid grid-cols-5 grid-rows-5 gap-0 shrink-0"
                      >
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-white"></div>
                        <div class="bg-white"></div>
                        <div class="bg-white"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-white"></div>
                        <div class="bg-black"></div>
                        <div class="bg-white"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-white"></div>
                        <div class="bg-white"></div>
                        <div class="bg-white"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                        <div class="bg-black"></div>
                      </div>
                      }
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Feature overview + preview (hidden on large TV — hero + CTAs only) -->
            <div class="info-page-feature-overview relative">
              <div
                class="absolute -inset-4 bg-gradient-to-br from-emerald-500/20 via-blue-500/10 to-amber-400/10 rounded-3xl blur-3xl opacity-70"
                aria-hidden="true"
              ></div>
              <p
                class="text-xs uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300 mb-1"
              >
                Feature overview
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-200 mb-4">
                Explore the elements below to see how it works inside the app.
              </p>
              <div
                class="relative bg-gray-200/90 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-[0_0_0_1px_rgba(57,112,77,0.2),0_0_20px_rgba(57,112,77,0.25)] dark:shadow-[0_0_0_1px_rgba(57,112,77,0.35),0_0_20px_rgba(57,112,77,0.35)] space-y-4"
              >
                <!-- Mock header: logo on first row, icons in second row on mobile (like prod) -->
                <div
                  class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4"
                >
                  <div class="flex items-center gap-3 shrink-0">
                    <img
                      [src]="brandingImageUrl || '/favicon.ico'"
                      alt="Church Logo"
                      class="h-10 w-auto max-w-[160px] object-contain rounded"
                    />
                  </div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <!-- Help -->
                    <button
                      type="button"
                      (click)="openHeaderModal('help')"
                      class="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium btn-chip btn-chip-gray"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        ></circle>
                        <text
                          x="12"
                          y="16"
                          text-anchor="middle"
                          fill="currentColor"
                          font-size="12"
                          font-weight="bold"
                        >
                          ?
                        </text>
                      </svg>
                    </button>
                    <!-- Settings -->
                    <button
                      type="button"
                      (click)="openHeaderModal('settings')"
                      class="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium btn-chip btn-chip-gray"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path
                          d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                        ></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <!-- Pray -->
                    <button
                      type="button"
                      (click)="openHeaderModal('pray')"
                      class="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium btn-chip btn-chip-green"
                    >
                      <span>Pray</span>
                    </button>
                    <!-- Request -->
                    <button
                      type="button"
                      (click)="openHeaderModal('request')"
                      class="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium btn-chip btn-chip-blue"
                    >
                      <span>Request</span>
                    </button>
                  </div>
                </div>

                <div class="mt-2 relative">
                  <div
                    (click)="openHeaderModal('search')"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-inset-surface pl-10 pr-3 py-1.5 sm:py-2 flex items-center cursor-pointer"
                  >
                    <svg
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-400 pointer-events-none"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                    <span
                      class="text-sm sm:text-base text-gray-400 dark:text-gray-400"
                      >Search prayers...</span
                    >
                  </div>
                </div>

                <!-- Filter-style preview tabs (mock of home filters): 3 cols mobile (2 rows), 5 cols sm+ -->
                <div class="mt-4 space-y-4">
                  <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 w-full">
                    <div
                      class="relative min-w-0"
                      role="button"
                      tabindex="0"
                      (click)="previewFilter = 'current'"
                      (keydown.enter)="previewFilter = 'current'"
                      (keydown.space)="
                        previewFilter = 'current'; $event.preventDefault()
                      "
                    >
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); openBadgesModal()"
                        class="absolute -top-2 -right-2 z-10 inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors cursor-pointer"
                        title="About badges"
                        aria-label="About badges"
                      >
                        1
                      </button>
                      <div
                        [class]="
                          'rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer flex flex-col items-center justify-center w-full min-h-[64px] ' +
                          (previewFilter === 'current'
                            ? 'border !border-[#0047AB] bg-blue-100 text-[#0047AB] dark:bg-blue-950 dark:text-blue-100 ring ring-[#0047AB] ring-offset-0 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-[2px] border-gray-200 dark:border-gray-700 hover:border-[#0047AB] dark:hover:border-[#0047AB]')
                        "
                      >
                        <div
                          class="text-sm sm:text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums"
                        >
                          22
                        </div>
                        <div
                          class="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide"
                        >
                          Current
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="previewFilter = 'answered'"
                      [class]="
                        'w-full min-w-0 min-h-[64px] rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer flex flex-col items-center justify-center ' +
                        (previewFilter === 'answered'
                          ? 'border !border-[#39704D] bg-green-100 text-[#39704D] dark:bg-green-900/40 dark:text-emerald-100 ring ring-[#39704D] ring-offset-0 shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-[2px] border-gray-200 dark:border-gray-700 hover:border-[#39704D] dark:hover:border-[#39704D]')
                      "
                    >
                      <div
                        class="flex flex-col items-center justify-center w-full"
                      >
                        <div
                          class="text-sm sm:text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums"
                        >
                          4
                        </div>
                        <div
                          class="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide"
                        >
                          Answered
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      (click)="previewFilter = 'total'"
                      [class]="
                        'w-full min-w-0 min-h-[64px] rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer flex flex-col items-center justify-center ' +
                        (previewFilter === 'total'
                          ? 'border !border-[#C9A961] bg-amber-100 text-[#6B4F1F] dark:bg-amber-900/40 dark:text-amber-100 ring ring-[#C9A961] ring-offset-0 shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-[2px] border-gray-200 dark:border-gray-700 hover:border-[#C9A961] dark:hover:border-[#C9A961]')
                      "
                    >
                      <div
                        class="flex flex-col items-center justify-center w-full"
                      >
                        <div
                          class="text-sm sm:text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums"
                        >
                          47
                        </div>
                        <div
                          class="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide"
                        >
                          Total
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      (click)="previewFilter = 'prompts'"
                      [class]="
                        'w-full min-w-0 min-h-[64px] rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer flex flex-col items-center justify-center ' +
                        (previewFilter === 'prompts'
                          ? 'border !border-[#988F83] bg-stone-100 text-[#4b4137] dark:bg-stone-900/40 dark:text-stone-100 ring ring-[#988F83] ring-offset-0 shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-[2px] border-gray-200 dark:border-gray-700 hover:border-[#988F83] dark:hover:border-[#988F83]')
                      "
                    >
                      <div
                        class="flex flex-col items-center justify-center w-full"
                      >
                        <div
                          class="text-sm sm:text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums"
                        >
                          76
                        </div>
                        <div
                          class="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide"
                        >
                          Prompts
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      (click)="previewFilter = 'personal'"
                      [class]="
                        'w-full min-w-0 min-h-[64px] rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer flex flex-col items-center justify-center ' +
                        (previewFilter === 'personal'
                          ? 'border !border-[#2F5F54] bg-slate-100 text-[#2F5F54] dark:bg-green-900/40 dark:text-emerald-100 ring ring-[#2F5F54] ring-offset-0 shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-[2px] border-gray-200 dark:border-gray-700 hover:border-[#2F5F54] dark:hover:border-[#2F5F54]')
                      "
                    >
                      <div
                        class="flex flex-col items-center justify-center w-full"
                      >
                        <div
                          class="text-sm sm:text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums"
                        >
                          13
                        </div>
                        <div
                          class="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide"
                        >
                          Personal
                        </div>
                      </div>
                    </button>
                  </div>

                  <!-- Mock prayer cards explaining each feature -->
                  @if (previewFilter === 'current') {
                  <div
                    class="relative bg-gray-100/80 dark:bg-white/5 border-[2px] !border-[#0047AB] dark:!border-[#0047AB] rounded-lg p-4 sm:p-5 shadow-md space-y-3"
                  >
                    <span
                      class="absolute left-1/2 top-4 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 pb-2"
                      >Jan 12, 2025</span
                    >
                    <div class="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                        >Prayer for Marcus</span
                      >
                      <span class="text-sm text-gray-600 dark:text-gray-400"
                        >Requested by:
                        <span
                          class="font-medium text-gray-800 dark:text-gray-100"
                          >Sarah</span
                        ></span
                      >
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                      See every active request in one place so your church
                      always knows what needs prayer right now.
                    </p>
                    <div class="flex flex-wrap gap-1 items-center">
                      <button
                        type="button"
                        (click)="openHeaderModal('card-update')"
                        title="Add an update to this prayer"
                        class="px-3 py-1 text-xs font-medium btn-chip btn-chip-green"
                      >
                        Add Update
                      </button>
                      <button
                        type="button"
                        (click)="openHeaderModal('card-pray-for')"
                        title="Record that you prayed for this request"
                        class="px-3 py-1 text-xs font-medium btn-chip btn-chip-blue"
                      >
                        Pray For
                      </button>
                    </div>
                    <h4
                      class="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3"
                    >
                      Recent Updates
                    </h4>
                    <div
                      class="relative bg-inset-surface-muted rounded-lg p-4 pt-3 border border-gray-300 dark:border-gray-600"
                    >
                      <button
                        type="button"
                        (click)="openBadgesModal()"
                        class="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors cursor-pointer"
                        title="About badges"
                        aria-label="About badges"
                      >
                        1
                      </button>
                      <p
                        class="text-xs text-gray-500 dark:text-gray-400 text-center mb-1 mt-0"
                      >
                        Jan 10, 2025
                      </p>
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs text-gray-500 dark:text-gray-400"
                          >Updated by:
                          <span
                            class="font-medium text-gray-700 dark:text-gray-300"
                            >Someone</span
                          ></span
                        >
                      </div>
                      <p class="text-sm text-gray-700 dark:text-gray-300">
                        Prayer updates let you share progress, answered prayers,
                        or new developments with the community. Click
                        <strong>Add Update</strong> on a request to post one.
                        You can also mark a prayer as answered from an update.
                      </p>
                    </div>
                  </div>
                  } @if (previewFilter === 'answered') {
                  <div
                    class="relative bg-gray-100/80 dark:bg-white/5 border-[2px] !border-[#39704D] dark:!border-[#39704D] rounded-lg p-4 sm:p-5 shadow-md space-y-3"
                  >
                    <span
                      class="absolute left-1/2 top-4 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 pb-2"
                      >Jan 12, 2025</span
                    >
                    <div class="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                        >Prayer for Jamie</span
                      >
                      <span class="text-sm text-gray-600 dark:text-gray-400"
                        >Requested by:
                        <span
                          class="font-medium text-gray-800 dark:text-gray-100"
                          >Alex</span
                        ></span
                      >
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                      These are prayers that have been marked as answered. See
                      how God has been at work and celebrate together as a
                      community.
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-500">
                      Mark a request as answered from the app to move it into
                      this view.
                    </p>
                    <div class="flex flex-wrap gap-1 items-center">
                      <button
                        type="button"
                        class="px-3 py-1 text-xs font-medium btn-chip btn-chip-green"
                      >
                        Add Update
                      </button>
                    </div>
                  </div>
                  } @if (previewFilter === 'total') {
                  <div
                    class="relative bg-gray-100/80 dark:bg-white/5 border-[2px] !border-[#C9A961] dark:!border-[#C9A961] rounded-lg p-4 sm:p-5 shadow-md space-y-3"
                  >
                    <span
                      class="absolute left-1/2 top-4 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400"
                      >Jan 15, 2025</span
                    >
                    <div class="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                        >Prayer for the mission team</span
                      >
                      <span class="text-sm text-gray-600 dark:text-gray-400"
                        >Requested by:
                        <span
                          class="font-medium text-gray-800 dark:text-gray-100"
                          >Morgan</span
                        ></span
                      >
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                      See every request in one place: current prayers, answered
                      prayers, and archived requests together.
                    </p>
                    <div class="flex flex-wrap gap-1 items-center">
                      <button
                        type="button"
                        class="px-3 py-1 text-xs font-medium btn-chip btn-chip-green"
                      >
                        Add Update
                      </button>
                    </div>
                  </div>
                  } @if (previewFilter === 'prompts') {
                  <!-- Type filter bar above card (like main site) -->
                  <div class="flex flex-wrap gap-2 mb-4">
                    <button
                      type="button"
                      (click)="openPromptCategoriesModal()"
                      class="flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border !border-[#988F83] dark:!border-[#988F83] bg-stone-100 dark:bg-stone-900/40 ring ring-[#988F83] dark:ring-[#988F83] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md"
                    >
                      All Types (76)
                    </button>
                    <button
                      type="button"
                      (click)="openPromptCategoriesModal()"
                      class="flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]"
                    >
                      Church (27)
                    </button>
                    <button
                      type="button"
                      (click)="openPromptCategoriesModal()"
                      class="flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]"
                    >
                      Family (5)
                    </button>
                    <button
                      type="button"
                      (click)="openPromptCategoriesModal()"
                      class="flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]"
                    >
                      Cities (9)
                    </button>
                  </div>
                  <div
                    class="relative bg-gray-100/80 dark:bg-white/5 border-[2px] !border-[#988F83] dark:!border-[#988F83] rounded-lg p-4 sm:p-5 shadow-md space-y-3"
                  >
                    <!-- Mock prompt card header: icon + title + type chip -->
                    <div class="flex items-start justify-between">
                      <div class="flex items-center gap-2 flex-1">
                        <svg
                          class="text-[#988F83] dark:text-[#988F83] shrink-0"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M9 18h6"></path>
                          <path d="M10 22h4"></path>
                          <path
                            d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"
                          ></path>
                        </svg>
                        <span
                          class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                          >Prayer prompts</span
                        >
                      </div>
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border !border-[#988F83] dark:!border-[#988F83] bg-stone-100 dark:bg-stone-900/40 ring ring-[#988F83] dark:ring-[#988F83] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md"
                      >
                        Church
                      </button>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                      Prayer prompts are set up by leaders to direct your
                      church’s prayers—for ministries, missionaries, events, and
                      more. They’re not created by users; they focus everyone on
                      what to pray for.
                    </p>
                  </div>
                  } @if (previewFilter === 'personal') {
                  <!-- Personal category filter bar (like main site) -->
                  <div class="flex flex-wrap gap-2 mb-4">
                    <button
                      type="button"
                      (click)="openPersonalCategoriesModal()"
                      class="flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border !border-[#2F5F54] dark:!border-[#2F5F54] bg-slate-100 dark:bg-green-900/40 ring ring-[#2F5F54] dark:ring-[#2F5F54] ring-offset-0 text-gray-700 dark:text-gray-300 shadow-md"
                    >
                      All Categories (13)
                    </button>
                    <button
                      type="button"
                      (click)="openPersonalCategoriesModal()"
                      class="flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#2F5F54] dark:hover:border-[#2F5F54]"
                    >
                      Health (4)
                    </button>
                    <button
                      type="button"
                      (click)="openPersonalCategoriesModal()"
                      class="flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#2F5F54] dark:hover:border-[#2F5F54]"
                    >
                      Family (5)
                    </button>
                    <button
                      type="button"
                      (click)="openPersonalCategoriesModal()"
                      class="flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#2F5F54] dark:hover:border-[#2F5F54]"
                    >
                      Work (2)
                    </button>
                  </div>
                  <!-- Mock personal prayer card (like main site) -->
                  <div
                    class="relative bg-gray-100/80 dark:bg-white/5 border-[2px] !border-gray-300 dark:!border-gray-600 rounded-lg p-4 sm:p-5 shadow-md space-y-3"
                  >
                    <span
                      class="absolute left-1/2 top-4 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400"
                      >Jan 14, 2025</span
                    >
                    <div class="flex items-center justify-between mb-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3
                          class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0"
                        >
                          Prayer for Riley
                        </h3>
                        <span
                          class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                          >Health</span
                        >
                      </div>
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          (click)="openPersonalActionModal('share')"
                          class="p-1 text-blue-500 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          title="Share prayer to public"
                          aria-label="Share prayer to public"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <path
                              d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
                            ></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                          </svg>
                        </button>
                        <button
                          type="button"
                          (click)="openPersonalActionModal('edit')"
                          class="p-1 text-blue-500 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          title="Edit prayer"
                          aria-label="Edit prayer"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <path
                              d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                            ></path>
                            <path
                              d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                            ></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          (click)="openPersonalActionModal('delete')"
                          class="p-1 text-red-500 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                          title="Delete prayer"
                          aria-label="Delete prayer"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path
                              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                      Give every person a private list of their own prayers that
                      only they can see and update.
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-500">
                      Personal prayers never appear on the public list, but they
                      live in the same simple interface. Organize with
                      categories and reorder by dragging.
                    </p>
                  </div>
                  }
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      @if (headerPreview !== null) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
        (click)="closeHeaderModal()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Explanation: ' + headerPreview"
      >
        <div
          class="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-3 text-gray-800 dark:text-gray-200"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            (click)="closeHeaderModal()"
            class="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
            aria-label="Close"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
          @if (headerPreview === 'help') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Help menu
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Open simple guidance for how your prayer list works and how to share
            it with your church.
          </p>
          } @if (headerPreview === 'settings') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Settings
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Control how the app works for you: choose light, dark, or system
            theme; turn email or push notifications for new prayers and updates
            on or off; enable or disable notification badges (the green counts).
            You can set which tab opens by default (Current, Answered, etc.),
            print your prayer list for a chosen time range, and sign out of your
            account.
          </p>
          } @if (headerPreview === 'pray') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Pray view
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            See a focused list of needs designed for praying through
            them—perfect for services, groups, or daily quiet time.
          </p>
          } @if (headerPreview === 'request') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            New request
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Quickly add a new prayer request so others can start praying and
            receive updates as things change.
          </p>
          } @if (headerPreview === 'search') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Search prayers
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Find specific people or topics so you can jump straight to the
            requests you need.
          </p>
          } @if (headerPreview === 'card-update') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Add Update
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Add an update to share progress, answered prayers, or new
            developments with your prayer community. You can post updates on
            your own requests or others. Optionally post anonymously or mark the
            prayer as answered when you add an update.
          </p>
          } @if (headerPreview === 'card-pray-for') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Pray For
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Record that you prayed for this request. The requester sees how many
            people have prayed for them (the count is shown; your click is
            anonymous). This encourages them and shows the community is lifting
            the need in prayer. You can pray for the same request again after a
            short cooldown.
          </p>
          }
        </div>
      </div>
      } @if (showPromptCategoriesModal) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
        (click)="closePromptCategoriesModal()"
        role="dialog"
        aria-modal="true"
        aria-label="Prompt categories"
      >
        <div
          class="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-3 text-gray-800 dark:text-gray-200"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            (click)="closePromptCategoriesModal()"
            class="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
            aria-label="Close"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Prompt categories
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Leaders assign each prayer prompt to a category so you can filter
            what you see:
          </p>
          <ul
            class="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc list-inside"
          >
            <li>
              <strong class="text-gray-800 dark:text-gray-200"
                >All Types</strong
              >
              — Show every prompt.
            </li>
            <li>
              <strong class="text-gray-800 dark:text-gray-200">Church</strong> —
              Prompts for your church’s ministries, services, and community.
            </li>
            <li>
              <strong class="text-gray-800 dark:text-gray-200">Family</strong> —
              Prompts for families, small groups, or home-focused prayer.
            </li>
            <li>
              <strong class="text-gray-800 dark:text-gray-200">Cities</strong> —
              Prompts for local outreach, missions, or city-wide needs.
            </li>
          </ul>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Explore a category on the app to filter the list. Categories are set
            by your church’s leaders.
          </p>
        </div>
      </div>
      } @if (showBadgesModal) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
        (click)="closeBadgesModal()"
        role="dialog"
        aria-modal="true"
        aria-label="About badges"
      >
        <div
          class="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-3 text-gray-800 dark:text-gray-200"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            (click)="closeBadgesModal()"
            class="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
            aria-label="Close"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Badges
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            The green circle with a number is a
            <strong class="text-gray-800 dark:text-gray-200">badge</strong>. It
            shows how many items are unread—for example, new current prayers,
            new updates on a request, or new prompts.
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Explore the badge (or use “Mark all as read” in the app) to clear
            the count. Badges help you see what’s new at a glance without
            opening every list or card.
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Badges are optional. You can turn them on or off in
            <strong class="text-gray-800 dark:text-gray-200">Settings</strong>.
          </p>
        </div>
      </div>
      } @if (personalActionModal !== null) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
        (click)="closePersonalActionModal()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="
          personalActionModal === 'share'
            ? 'Share personal prayer'
            : personalActionModal === 'edit'
            ? 'Edit personal prayer'
            : 'Delete personal prayer'
        "
      >
        <div
          class="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-3 text-gray-800 dark:text-gray-200"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            (click)="closePersonalActionModal()"
            class="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
            aria-label="Close"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
          @if (personalActionModal === 'share') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Share to public
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Move this personal prayer to the public list so your church can see
            it and pray for you. Once shared, it appears like any other request
            and others can add updates or mark that they prayed. You can still
            edit or delete it.
          </p>
          } @if (personalActionModal === 'edit') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Edit prayer
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Change the subject (Prayer for), description, or category. Updates
            are saved immediately. Use this to add details, correct a typo, or
            move the prayer to a different category.
          </p>
          } @if (personalActionModal === 'delete') {
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Delete prayer
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Permanently remove this personal prayer and any updates. This cannot
            be undone. In the app you’ll be asked to confirm before the prayer
            is deleted.
          </p>
          }
        </div>
      </div>
      } @if (showPersonalCategoriesModal) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
        (click)="closePersonalCategoriesModal()"
        role="dialog"
        aria-modal="true"
        aria-label="Personal prayer categories"
      >
        <div
          class="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-3 text-gray-800 dark:text-gray-200"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            (click)="closePersonalCategoriesModal()"
            class="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
            aria-label="Close"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
          <p class="font-medium text-gray-900 dark:text-gray-100 text-base">
            Personal prayer categories
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            When you create or edit a personal prayer, you can assign a
            category—like Health, Family, or Work—to keep your list organized.
            Categories are yours alone; you choose the names.
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Use the filter buttons to show
            <strong class="text-gray-800 dark:text-gray-200"
              >All Categories</strong
            >
            or explore a category to see only prayers in that group. The number
            in parentheses is how many prayers are in that category. On the main
            app you can also reorder category buttons by dragging.
          </p>
        </div>
      </div>
      }
    </div>
  `,
})
export class InfoComponent implements OnInit, OnDestroy {
  private readonly iosStoreUrl =
    "https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929";
  private readonly androidStoreUrl =
    "https://play.google.com/store/apps/details?id=com.prayerapp.mobile";
  previewFilter: "current" | "answered" | "total" | "prompts" | "personal" =
    "current";
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
  personalActionModal: "share" | "edit" | "delete" | null = null;

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

  openPersonalActionModal(which: "share" | "edit" | "delete"): void {
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
