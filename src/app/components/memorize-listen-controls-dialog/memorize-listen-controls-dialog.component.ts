import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemorizeListenSpeedButtonComponent } from '../memorize-listen-speed-button/memorize-listen-speed-button.component';
import type { MemorizeListenSpeed } from '../../lib/memorization/memorizeListenSpeedStorage';

@Component({
  selector: 'app-memorize-listen-controls-dialog',
  standalone: true,
  imports: [CommonModule, MemorizeListenSpeedButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div
        #backdrop
        class="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/50 p-4"
        [style.paddingTop]="'env(safe-area-inset-top)'"
        [style.paddingBottom]="'env(safe-area-inset-bottom)'"
        role="presentation"
        (click)="onBackdropClick($event)"
      >
        <div
          [id]="dialogId"
          class="relative w-full max-w-md rounded-lg modal-panel-edge bg-white dark:bg-gray-800 shadow-xl"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          (click)="$event.stopPropagation()"
        >
          <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 modal-chrome-header px-4 pt-3 pb-2">
            <h2 [id]="titleId" class="text-lg font-semibold text-gray-800 dark:text-gray-100 min-w-0">
              Listen
            </h2>
            <div class="flex justify-center shrink-0 px-1"></div>
            <div class="flex justify-end">
              <button
                type="button"
                data-tour="memorize-listen-close"
                (click)="close.emit()"
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1 cursor-pointer"
                aria-label="Close"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div class="box-border w-full p-4">
            <button
              type="button"
              data-testid="memorize-listen-passage"
              (click)="primaryClick.emit()"
              class="box-border mb-3 block w-full min-h-[50px] px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-inset-surface text-gray-800 dark:text-gray-100"
              [attr.aria-pressed]="primaryAriaPressed"
              [attr.aria-label]="primaryAriaLabel"
            >
              {{ primaryLabel }}
            </button>
            <div
              class="box-border flex w-full items-stretch"
              style="gap: 0.5rem"
            >
              <button
                type="button"
                data-testid="memorize-listen-repeat"
                (click)="repeatToggle.emit()"
                class="box-border min-h-[50px] min-w-0 rounded-lg px-4 py-3 text-center font-medium transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-inset-surface text-gray-800 dark:text-gray-100"
                style="flex: 1 1 0%; width: 0"
                [class.bg-amber-50]="repeatListenOn"
                [class.dark:bg-amber-900/20]="repeatListenOn"
                [class.border-amber-300]="repeatListenOn"
                [class.dark:border-amber-800]="repeatListenOn"
                [attr.aria-pressed]="repeatListenOn"
                [attr.aria-label]="
                  repeatListenOn
                    ? 'Stop repeating the read-aloud after this play ends'
                    : 'Repeat the read-aloud with a short pause between each play'
                "
              >
                {{ repeatListenOn ? 'Repeat on' : 'Repeat' }}
              </button>
              <div
                class="box-border shrink-0"
                style="flex: 0 0 5.5rem; width: 5.5rem"
              >
                <app-memorize-listen-speed-button
                  [inline]="true"
                  [value]="listenPlaybackRate"
                  (valueChange)="speedSelect.emit($event)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class MemorizeListenControlsDialogComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() open = false;
  @Input() dialogId = 'memorize-listen-controls-dialog';
  @Input() titleId = 'memorize-listen-controls-title';
  @Input() primaryLabel = 'Play';
  @Input() primaryAriaLabel = 'Play read-aloud of the passage';
  @Input() primaryAriaPressed = false;
  @Input() repeatListenOn = false;
  @Input() listenPlaybackRate: MemorizeListenSpeed = 1;

  @Output() close = new EventEmitter<void>();
  @Output() primaryClick = new EventEmitter<void>();
  @Output() repeatToggle = new EventEmitter<void>();
  @Output() speedSelect = new EventEmitter<MemorizeListenSpeed>();

  @ViewChild('backdrop') backdropRef?: ElementRef<HTMLDivElement>;

  private touchStartHandler: ((e: TouchEvent) => void) | null = null;

  ngAfterViewInit(): void {
    this.attachBackdropTouchHandler();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        requestAnimationFrame(() => this.attachBackdropTouchHandler());
      } else {
        this.detachBackdropTouchHandler();
      }
    }
  }

  ngOnDestroy(): void {
    this.detachBackdropTouchHandler();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return;
    this.close.emit();
  }

  private attachBackdropTouchHandler(): void {
    this.detachBackdropTouchHandler();
    const el = this.backdropRef?.nativeElement;
    if (!el || !this.open) return;
    this.touchStartHandler = (e: TouchEvent) => {
      if (e.target !== el) return;
      e.preventDefault();
      this.close.emit();
      this.cdr.markForCheck();
    };
    el.addEventListener('touchstart', this.touchStartHandler, { passive: false });
  }

  private detachBackdropTouchHandler(): void {
    const el = this.backdropRef?.nativeElement;
    if (el && this.touchStartHandler) {
      el.removeEventListener('touchstart', this.touchStartHandler);
    }
    this.touchStartHandler = null;
  }
}
