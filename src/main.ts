import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { provideHttpClient, withXhr } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";

import { IMAGE_CONFIG } from "@angular/common";
import { APP_INITIALIZER } from "@angular/core";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";
import { AdminAuthService } from "./app/services/admin-auth.service";
import { BrandingService } from "./app/services/branding.service";
import { BRANDING_SERVICE_TOKEN } from "./app/components/app-logo/app-logo.component";

import { Capacitor } from "@capacitor/core";
import { providePostHogErrorHandler } from "./app/posthog-error-handler";
import {
  CAPACITOR_LIVE_ORIGIN,
  maybeRedirectNativeToLiveSite,
  startCapacitorLiveBootWatch,
} from "./lib/capacitor-live-boot";
import {
  hydrateLocalStorageFromNativeAuthBridge,
  syncNativeAuthBridgeBeforeLiveRedirect,
} from "./lib/native-auth-storage-bridge";
import { runPreBootstrapHydrate } from "./lib/app-boot-gate";
import { whenAuthLoadingFinishes } from "./lib/auth-loading-gate";
import {
  bootstrapFailureRecoveryAction,
  renderBootRecoveryPanel,
  trySetStaleChunkReloadGuard,
} from "./lib/boot-recovery";
import {
  clearStaleChunkReloadGuard,
  STALE_CHUNK_RELOAD_GUARD_KEY,
} from "./lib/stale-chunk-recovery";
import { startWebRevisionWatch } from "./lib/web-revision-reload";

// Add a global visibility check to ensure content stays visible during background refresh
const setupVisibilityRecovery = () => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      console.log("[AppInitialization] Page became visible");

      // Verify router outlet exists
      const routerOutlet = document.querySelector("router-outlet");
      if (!routerOutlet) {
        console.warn(
          "[AppInitialization] Router outlet not found when page became visible"
        );
        // Don't reload - let services handle the refresh
      } else {
        console.log(
          "[AppInitialization] Page visible and router outlet intact"
        );
        // Dispatch event to services that the app became visible
        window.dispatchEvent(new CustomEvent("app-became-visible"));
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Also handle focus event which may fire before visibilitychange on some browsers
  window.addEventListener("focus", () => {
    if (!document.hidden) {
      console.log("[AppInitialization] Focus event - app became visible");
      window.dispatchEvent(new CustomEvent("app-became-visible"));
    }
  });
};

setupVisibilityRecovery();

function bootstrapApp(): void {
  bootstrapApplication(AppComponent, {
  providers: [
    providePostHogErrorHandler(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: "top" })
    ),
    provideHttpClient(withXhr()),
    provideAnimations(),
    BrandingService,
    { provide: BRANDING_SERVICE_TOKEN, useExisting: BrandingService },
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true,
      },
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (brandingService: BrandingService) => {
        return async () => {
          try {
            console.log(
              "[AppInitialization] Initializing BrandingService to load logos before rendering"
            );
            await brandingService.initialize();
            console.log(
              "[AppInitialization] BrandingService initialization complete"
            );
          } catch (error) {
            console.error(
              "[AppInitialization] BrandingService initialization failed:",
              error
            );
            // Continue initialization even if branding fails
          }
        };
      },
      deps: [BrandingService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (adminAuthService: AdminAuthService) => {
        return () => {
          console.log(
            "[AppInitialization] Initializing AdminAuthService for session restoration"
          );
          // A saved session clears loading$ before this subscribe runs. The
          // callback must not unsubscribe until that binding exists.
          return whenAuthLoadingFinishes(adminAuthService.loading$, {
            timeoutMs: 5000,
            onReady: () => {
              console.log(
                "[AppInitialization] AdminAuthService initialization complete"
              );
            },
            onTimeout: () => {
              console.warn(
                "[AppInitialization] AdminAuthService initialization timed out after 5s"
              );
              // Do not clear loading$ here. The guard treats the first false
              // as the final session, so an early clear sends a restoring
              // user to /login and leaves them there.
            },
          });
        };
      },
      deps: [AdminAuthService],
      multi: true,
    },
  ],
})
  .then(() => {
    clearStaleChunkReloadGuard();
    startWebRevisionWatch();
  })
  .catch((err) => {
    console.error("[AppInitialization] Bootstrap error:", err);
    const rootElement = document.querySelector("app-root");
    const guardAlreadySet =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(STALE_CHUNK_RELOAD_GUARD_KEY) === "1";
    const action = bootstrapFailureRecoveryAction(guardAlreadySet);
    if (rootElement instanceof HTMLElement) {
      renderBootRecoveryPanel(rootElement);
    }
    if (action === "reload-once") {
      if (!trySetStaleChunkReloadGuard(sessionStorage)) {
        return;
      }
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  });
}

const NATIVE_HYDRATE_BUDGET_MS = 1200;

void (async () => {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    // A hung Capacitor callback (JS Eval error / UNIMPLEMENTED) must not block first paint.
    await Promise.race([
      runPreBootstrapHydrate({
        isNative,
        hydrateNativeAuth: hydrateLocalStorageFromNativeAuthBridge,
      }),
      new Promise<void>((resolve) => {
        setTimeout(resolve, NATIVE_HYDRATE_BUDGET_MS);
      }),
    ]);
  }
  bootstrapApp();
  if (!isNative) {
    return;
  }
  const liveBootOptions = {
    isNative,
    liveOrigin: CAPACITOR_LIVE_ORIGIN,
    fetchFn: fetch,
    timeoutMs: 8000,
    beforeRedirect: () => syncNativeAuthBridgeBeforeLiveRedirect(),
  };
  void maybeRedirectNativeToLiveSite({
    ...liveBootOptions,
    origin: window.location.origin,
    hostname: window.location.hostname,
    location: window.location,
  }).catch((error) => {
    console.error("[AppInitialization] Live redirect failed:", error);
  });
  startCapacitorLiveBootWatch(liveBootOptions);
})();
