import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { HOME_SHELL_FOOTER_BORDER_TOP_CLASS } from "../../lib/home-sub-filter-chip-classes";

@Component({
  selector: "app-presentation-toolbar",
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      id="tour-presentation-toolbar"
      class="presentation-toolbar-bar"
      [class]="
        'fixed bottom-0 left-0 right-0 z-40 flex items-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-4 md:px-5 lg:px-6 pt-4 md:pt-5 lg:pt-6 ' +
        footerBorderTopClass +
        ' transition-transform duration-300 ' +
        (visible ? 'translate-y-0' : 'translate-y-full')
      "
    >
      <div class="container mx-auto flex w-full items-center justify-between">
        <!-- Navigation -->
        <div class="flex items-center gap-2 md:gap-3 lg:gap-4">
          <button
            id="tour-presentation-prev"
            (click)="previous.emit()"
            class="flex items-center justify-center p-3 md:p-3.5 lg:p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors cursor-pointer"
            title="Previous"
          >
            <svg
              class="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <button
            id="tour-presentation-play"
            (click)="togglePlay.emit()"
            class="flex items-center justify-center p-3 md:p-3.5 lg:p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors cursor-pointer"
            [title]="isPlaying ? 'Pause' : 'Play'"
          >
            <svg
              class="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              @if (isPlaying) {
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
              } @if (!isPlaying) {
              <path d="M8 5v14l11-7z"></path>
              }
            </svg>
          </button>

          <button
            id="tour-presentation-next"
            (click)="next.emit()"
            class="flex items-center justify-center p-3 md:p-3.5 lg:p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors cursor-pointer"
            title="Next"
          >
            <svg
              class="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          @if (isPlaying && showTimer) {
          <div
            class="flex items-center gap-1 md:gap-2 px-2 md:px-3.5 lg:px-4 py-1.5 md:py-2.5 lg:py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg ml-1 md:ml-2"
          >
            <span
              class="text-xs md:text-sm font-mono font-semibold text-blue-900 dark:text-blue-100"
            >
              {{ countdownRemaining }}s
            </span>
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              / {{ currentDuration }}s
            </span>
          </div>
          }
        </div>

        <!-- Settings and Close -->
        <div class="flex items-center gap-2 md:gap-3 lg:gap-4">
          <button
            id="tour-presentation-settings"
            (click)="settingsToggle.emit()"
            class="flex items-center justify-center p-3 md:p-3.5 lg:p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors cursor-pointer"
            title="Settings"
          >
            <svg
              class="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
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

          <button
            id="tour-presentation-exit"
            (click)="exit.emit()"
            class="flex items-center justify-center p-3 md:p-3.5 lg:p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors cursor-pointer"
            title="Exit Presentation"
          >
            <svg
              class="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .presentation-toolbar-bar {
        padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
      }
      @media (min-width: 768px) {
        .presentation-toolbar-bar {
          padding-bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
        }
      }
      @media (min-width: 1024px) {
        .presentation-toolbar-bar {
          padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
        }
      }
    `,
  ],
})
export class PresentationToolbarComponent implements OnChanges {
  readonly footerBorderTopClass = HOME_SHELL_FOOTER_BORDER_TOP_CLASS;

  @Input() visible = true;
  @Input() isPlaying = false;
  @Input() showTimer = true;
  @Input() countdownRemaining = 0;
  @Input() currentDuration = 10;

  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() togglePlay = new EventEmitter<void>();
  @Output() settingsToggle = new EventEmitter<void>();
  @Output() exit = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["countdownRemaining"]) {
      this.cdr.detectChanges();
    }
  }
}
