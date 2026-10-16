import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, Subscription } from 'rxjs';
export type TextSize = 'normal' | 'large' | 'largest';

export type SetTextSizeOptions = {
  persist?: boolean;
};

const STORAGE_KEY = 'textSize';
const VALID_SIZES: TextSize[] = ['normal', 'large', 'largest'];

@Injectable({
  providedIn: 'root'
})
export class TextSizeService implements OnDestroy {
  private textSizeSubject: BehaviorSubject<TextSize>;
  public textSize$: Observable<TextSize>;
  private visibilitySub: Subscription | null = null;

  constructor() {
    const stored = this.readTextSizeFromLocalStorage();
    const initial = stored ?? 'normal';
    this.textSizeSubject = new BehaviorSubject<TextSize>(initial);
    this.textSize$ = this.textSizeSubject.asObservable();
    this.applyTextSize(initial, stored !== null);
    this.listenToVisibilityChanges();
  }

  private readTextSizeFromLocalStorage(): TextSize | null {
    const saved = localStorage.getItem(STORAGE_KEY) as TextSize | null;
    if (saved && VALID_SIZES.includes(saved)) {
      return saved;
    }
    return null;
  }

  private applyTextSize(size: TextSize, persistToLocalStorage = true): void {
    const root = document.documentElement;
    root.setAttribute('data-text-size', size);
    const scale = this.getScaleForSize(size);
    root.style.setProperty('--text-scale', String(scale));
    if (persistToLocalStorage) {
      localStorage.setItem(STORAGE_KEY, size);
    }
  }

  private getScaleForSize(size: TextSize): number {
    switch (size) {
      case 'normal':
        return 1;
      case 'large':
        return 1.15;
      case 'largest':
        return 1.25;
      default:
        return 1;
    }
  }

  private listenToVisibilityChanges(): void {
    this.visibilitySub = fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!document.hidden) {
        const current = this.textSizeSubject.value;
        this.applyTextSize(current, false);
      }
    });
  }

  ngOnDestroy(): void {
    this.visibilitySub?.unsubscribe();
    this.visibilitySub = null;
  }

  getTextSize(): TextSize {
    return this.textSizeSubject.value;
  }

  setTextSize(size: TextSize, options?: SetTextSizeOptions): void {
    const persist = options?.persist !== false;
    // Apply mirrors before emitting so preference persist reads the new size.
    this.applyTextSize(size, persist);
    this.textSizeSubject.next(size);
  }
}
