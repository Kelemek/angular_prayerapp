export class EmailSubscriberOrientationTracker {
  isLandscape = false;

  private orientationChangeListener: (() => void) | null = null;
  private resizeListener: (() => void) | null = null;

  constructor(private readonly onLandscapeChange: (isLandscape: boolean) => void) {}

  init(): void {
    this.updateLandscape();
    this.orientationChangeListener = () => this.onOrientationChange();
    this.resizeListener = () => this.updateLandscape();
    window.addEventListener('orientationchange', this.orientationChangeListener);
    window.addEventListener('resize', this.resizeListener);
  }

  destroy(): void {
    if (this.orientationChangeListener) {
      window.removeEventListener(
        'orientationchange',
        this.orientationChangeListener,
      );
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.orientationChangeListener = null;
    this.resizeListener = null;
  }

  updateLandscape(): void {
    this.isLandscape = window.innerWidth > window.innerHeight;
    this.onLandscapeChange(this.isLandscape);
  }

  private onOrientationChange(): void {
    setTimeout(() => this.updateLandscape(), 100);
  }
}
