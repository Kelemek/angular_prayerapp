import type {
  PresentationControlsInputHost,
} from "./presentation-controls-input.controller";

export interface PresentationControlsInputPageState {
  showControls: boolean;
  initialPeriodElapsed: boolean;
}

export class PresentationControlsInputHostAdapter
  implements PresentationControlsInputHost
{
  constructor(
    private readonly page: PresentationControlsInputPageState,
    private readonly callbacks: {
      onNextSlide: () => void;
      onPreviousSlide: () => void;
      onTogglePlay: () => void;
      onExitPresentation: () => void;
    }
  ) {}

  get showControls(): boolean {
    return this.page.showControls;
  }

  set showControls(value: boolean) {
    this.page.showControls = value;
  }

  get initialPeriodElapsed(): boolean {
    return this.page.initialPeriodElapsed;
  }

  set initialPeriodElapsed(value: boolean) {
    this.page.initialPeriodElapsed = value;
  }

  onNextSlide(): void {
    this.callbacks.onNextSlide();
  }

  onPreviousSlide(): void {
    this.callbacks.onPreviousSlide();
  }

  onTogglePlay(): void {
    this.callbacks.onTogglePlay();
  }

  onExitPresentation(): void {
    this.callbacks.onExitPresentation();
  }
}
