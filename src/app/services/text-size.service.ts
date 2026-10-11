import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, Subscription } from 'rxjs';
export type TextSize = 'normal' | 'large' | 'largest';

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
    const saved = this.getSavedTextSize();
    this.textSizeSubject = new BehaviorSubject<TextSize>(saved);
    this.textSize$ = this.textSizeSubject.asObservable();
    this.applyTextSize(saved);
    this.listenToVisibilityChanges();
  }

  private getSavedTextSize(): TextSize {
    const saved = localStorage.getItem(STORAGE_KEY) as TextSize | null;
    if (saved && VALID_SIZES.includes(saved)) {
      return saved;
    }
    return 'normal';
  }

  private applyTextSize(size: TextSize): void {
    const root = document.documentElement;
    root.setAttribute('data-text-size', size);
    const scale = this.getScaleForSize(size);
    root.style.setProperty('--text-scale', String(scale));
    localStorage.setItem(STORAGE_KEY, size);
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
        this.applyTextSize(current);
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

  setTextSize(size: TextSize): void {
    this.textSizeSubject.next(size);
    this.applyTextSize(size);
  }
}
