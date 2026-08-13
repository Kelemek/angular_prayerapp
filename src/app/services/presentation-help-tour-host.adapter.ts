import type { PresentationHelpTourHost } from "./presentation-help-tour.launcher";

export interface PresentationHelpTourPageState {
  showControls: boolean;
  showSettings: boolean;
}

export class PresentationHelpTourHostAdapter implements PresentationHelpTourHost {
  constructor(
    private readonly page: PresentationHelpTourPageState,
    private readonly callbacks: {
      markForCheck: () => void;
      exitPresentation: () => void;
      cancelControlsInitialTimer: () => void;
    }
  ) {}

  get showControls(): boolean {
    return this.page.showControls;
  }

  set showControls(value: boolean) {
    this.page.showControls = value;
  }

  get showSettings(): boolean {
    return this.page.showSettings;
  }

  set showSettings(value: boolean) {
    this.page.showSettings = value;
  }

  markForCheck(): void {
    this.callbacks.markForCheck();
  }

  exitPresentation(): void {
    this.callbacks.exitPresentation();
  }

  cancelControlsInitialTimer(): void {
    this.callbacks.cancelControlsInitialTimer();
  }
}
