import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-presentation-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-6 border-t border-gray-200 dark:border-gray-700 transition-transform duration-300 ' + (visible ? 'translate-y-0' : 'translate-y-full')">
      <div class="container mx-auto flex items-center justify-between">
        <!-- Navigation -->
        <div class="flex items-center gap-4">
          <button
            (click)="previous.emit()"
            class="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
            title="Previous">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <button
            (click)="togglePlay.emit()"
            class="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
            [title]="isPlaying ? 'Pause' : 'Play'">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <rect *ngIf="isPlaying" x="6" y="4" width="4" height="16"></rect>
              <rect *ngIf="isPlaying" x="14" y="4" width="4" height="16"></rect>
              <path *ngIf="!isPlaying" d="M8 5v14l11-7z"></path>
            </svg>
          </button>
          
          <button
            (click)="next.emit()"
            class="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
            title="Next">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          
          <div *ngIf="isPlaying && showTimer" class="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg ml-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600 dark:text-blue-400">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
              {{ countdownRemaining }}s
            </span>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              / {{ currentDuration }}s
            </span>
          </div>
        </div>

        <!-- Settings and Close -->
        <div class="flex items-center gap-4">
          <button
            (click)="settingsToggle.emit()"
            class="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
            title="Settings">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          
          <button
            (click)="exit.emit()"
            class="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
            title="Exit Presentation">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class PresentationToolbarComponent {
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
}
