import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import {
  MEMORIZE_LISTEN_SPEEDS,
  MemorizeListenSpeed,
  formatMemorizeListenSpeedLabel,
} from '../../lib/memorization/memorizeListenSpeedStorage';

@Component({
  selector: 'app-memorize-listen-speed-button',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block min-w-0 w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        min-width: 0;
      }
      :host .speed-trigger--inline {
        display: flex;
        width: 100%;
        min-height: 50px;
        box-sizing: border-box;
      }
    `,
  ],
  template: `
    <div [class]="inline ? 'block w-full' : 'relative w-full min-w-0 sm:w-auto'">
      <button
        #trigger
        type="button"
        data-testid="memorize-listen-speed"
        [attr.aria-expanded]="canOpen ? menuOpen : false"
        [attr.aria-haspopup]="canOpen ? 'listbox' : null"
        [attr.aria-controls]="canOpen && menuOpen ? listboxId : null"
        [attr.aria-label]="ariaLabel"
        [title]="canOpen ? ariaLabel + ' Tap to open.' : ariaLabel"
        class="rounded-lg border font-medium transition-colors cursor-pointer justify-between touch-manipulation items-center gap-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-inset-surface disabled:opacity-50 disabled:cursor-not-allowed"
        [class.speed-trigger--inline]="inline"
        [class.box-border]="inline"
        [class.px-3]="inline"
        [class.py-3]="inline"
        [class.flex]="!inline"
        [class.h-9]="!inline"
        [class.min-h-[36px]]="!inline"
        [class.px-2]="!inline"
        [class.w-full]="!inline"
        [class.sm:w-auto]="!inline"
        [class.sm:min-w-[5.5rem]]="!inline"
        [class.shrink-0]="!inline"
        (click)="toggleMenu()"
      >
        <span class="text-sm font-medium leading-none">{{ selectedLabel }}</span>
        @if (canOpen) {
          <svg
            aria-hidden="true"
            class="h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400 mt-px transition-transform"
            [class.rotate-180]="menuOpen"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="m6 8 4 4 4-4"
            />
          </svg>
        }
      </button>
    </div>

    @if (menuOpen && canOpen) {
      <div
        #menu
        [id]="listboxId"
        role="listbox"
        aria-label="Read-aloud speed options"
        class="fixed z-[200] flex min-w-32 flex-col gap-0.5 rounded-lg border border-gray-300 bg-white p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
        [style.left.px]="menuPos.left"
        [style.top.px]="menuPos.top"
        [style.minWidth.px]="menuPos.minWidth"
      >
        @for (rate of speeds; track rate) {
          <button
            type="button"
            role="option"
            [attr.data-testid]="'memorize-listen-speed-option-' + rate"
            [attr.aria-selected]="rate === value"
            class="flex items-center justify-start rounded-md px-2 py-2 min-h-[38px] w-full gap-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
            [class.bg-blue-100]="rate === value"
            [class.dark:bg-blue-900/40]="rate === value"
            [class.text-blue-800]="rate === value"
            [class.dark:text-blue-200]="rate === value"
            [class.text-gray-700]="rate !== value"
            [class.dark:text-gray-200]="rate !== value"
            [class.hover:bg-inset-surface]="rate !== value"
            (click)="choose(rate)"
          >
            {{ formatLabel(rate) }}
          </button>
        }
      </div>
    }
  `,
})
export class MemorizeListenSpeedButtonComponent implements OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() value: MemorizeListenSpeed = 1;
  @Input() inline = false;
  @Output() valueChange = new EventEmitter<MemorizeListenSpeed>();

  @ViewChild('trigger') triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('menu') menuRef?: ElementRef<HTMLDivElement>;

  readonly speeds = MEMORIZE_LISTEN_SPEEDS;
  readonly listboxId = `memorize-listen-speed-${Math.random().toString(36).slice(2, 9)}`;
  menuOpen = false;
  menuPos = { left: 0, top: 0, minWidth: 0 };

  private positionRaf = 0;
  private scrollListener: (() => void) | null = null;
  private resizeListener: (() => void) | null = null;

  get canOpen(): boolean {
    return this.speeds.length > 1;
  }

  get selectedLabel(): string {
    return formatMemorizeListenSpeedLabel(this.value);
  }

  get ariaLabel(): string {
    return `Read-aloud speed, currently ${this.selectedLabel}. Choose a different speed.`;
  }

  formatLabel(rate: MemorizeListenSpeed): string {
    return formatMemorizeListenSpeedLabel(rate);
  }

  toggleMenu(): void {
    if (!this.canOpen) return;
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      this.schedulePositionUpdate();
    } else {
      this.detachPositionListeners();
    }
    this.cdr.markForCheck();
  }

  choose(rate: MemorizeListenSpeed): void {
    this.valueChange.emit(rate);
    this.menuOpen = false;
    this.detachPositionListeners();
    this.triggerRef?.nativeElement.focus();
    this.cdr.markForCheck();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.menuOpen) return;
    const target = event.target as Node;
    if (this.triggerRef?.nativeElement.contains(target)) return;
    if (this.menuRef?.nativeElement.contains(target)) return;
    this.menuOpen = false;
    this.detachPositionListeners();
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.menuOpen || event.key !== 'Escape') return;
    this.menuOpen = false;
    this.detachPositionListeners();
    this.triggerRef?.nativeElement.focus();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.detachPositionListeners();
    if (this.positionRaf) {
      cancelAnimationFrame(this.positionRaf);
    }
  }

  private schedulePositionUpdate(): void {
    requestAnimationFrame(() => this.updatePosition());
    this.attachPositionListeners();
  }

  private updatePosition(): void {
    const trigger = this.triggerRef?.nativeElement;
    if (!trigger) return;
    const menu = this.menuRef?.nativeElement;
    const r = trigger.getBoundingClientRect();
    const menuW = menu?.offsetWidth ?? Math.max(r.width, 140);
    const menuH = menu?.offsetHeight ?? 0;
    const pad = 8;
    let left = r.left;
    let top = r.bottom + 4;
    if (left + menuW > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - menuW - pad);
    }
    if (menuH > 0 && top + menuH > window.innerHeight - pad && r.top > menuH + pad) {
      top = Math.max(pad, r.top - menuH - 4);
    }
    this.menuPos = { left, top, minWidth: r.width };
    this.cdr.markForCheck();
  }

  private attachPositionListeners(): void {
    if (this.scrollListener) return;
    this.scrollListener = () => this.updatePosition();
    this.resizeListener = () => this.updatePosition();
    window.addEventListener('resize', this.resizeListener);
    window.addEventListener('scroll', this.scrollListener, true);
  }

  private detachPositionListeners(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener, true);
      this.scrollListener = null;
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
  }
}
