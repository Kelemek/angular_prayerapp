import type { ChangeDetectorRef } from "@angular/core";
import { PresentationControlsInputHostAdapter } from "./presentation-controls-input-host.adapter";
import type { PresentationControlsInputController } from "./presentation-controls-input.controller";
import { PresentationHelpTourHostAdapter } from "./presentation-help-tour-host.adapter";
import {
  PresentationPlaybackHostAdapter,
  type PresentationPlaybackPageState,
} from "./presentation-playback-host.adapter";
import type { PresentationPlaybackController } from "./presentation-playback.controller";
import { PresentationPrayerTimerHostAdapter } from "./presentation-prayer-timer-host.adapter";
import type { PresentationControlsInputPageState } from "./presentation-controls-input-host.adapter";
import type { PresentationHelpTourPageState } from "./presentation-help-tour-host.adapter";
import type { PresentationPrayerTimerPageState } from "./presentation-prayer-timer-host.adapter";

export interface PresentationCoordinatorWiringPage
  extends PresentationPlaybackPageState,
    PresentationPrayerTimerPageState,
    PresentationControlsInputPageState,
    PresentationHelpTourPageState {}

export interface WiredPresentationHosts {
  prayerTimerHost: PresentationPrayerTimerHostAdapter;
  controlsInputHost: PresentationControlsInputHostAdapter;
  helpTourHost: PresentationHelpTourHostAdapter;
}

export interface PresentationCoordinatorWiringDeps {
  page: PresentationCoordinatorWiringPage;
  cdr: ChangeDetectorRef;
  playback: PresentationPlaybackController;
  controlsInput: PresentationControlsInputController;
  exitPresentation: () => void;
}

export function wirePresentationControllers(
  deps: PresentationCoordinatorWiringDeps
): WiredPresentationHosts {
  const { page, cdr, playback, controlsInput, exitPresentation } = deps;

  playback.bindHost(new PresentationPlaybackHostAdapter(page, cdr));

  const prayerTimerHost = new PresentationPrayerTimerHostAdapter(page, cdr);
  const controlsInputHost = new PresentationControlsInputHostAdapter(page, {
    onNextSlide: () => playback.nextSlide(),
    onPreviousSlide: () => playback.previousSlide(),
    onTogglePlay: () => playback.togglePlay(),
    onExitPresentation: exitPresentation,
  });
  const helpTourHost = new PresentationHelpTourHostAdapter(page, {
    markForCheck: () => cdr.markForCheck(),
    exitPresentation,
    cancelControlsInitialTimer: () => controlsInput.cancelInitialAutoHideTimer(),
  });

  return { prayerTimerHost, controlsInputHost, helpTourHost };
}
