import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  bibleBooksCountLabel,
  isBibleBooksMemorizationItem,
} from '../../lib/memorization/bibleBooksMemorization';
import {
  getMasterLevel,
  masterLevelLabel,
} from '../../lib/memorization/memorization-mastery';
import type { MemorizedItem } from '../../types/memorization';
import { ScriptureHoverPreviewComponent } from '../scripture-hover-preview/scripture-hover-preview.component';

@Component({
  selector: 'app-memorized-verse-card',
  standalone: true,
  imports: [CommonModule, ScriptureHoverPreviewComponent],
  host: { class: 'block h-full', role: 'listitem' },
  template: `
    <div
      [id]="tourMemorizeAnchors ? 'tour-memorize-sample-card' : null"
      class="h-full flex bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <app-scripture-hover-preview
        class="min-w-0 flex-1"
        [reference]="item.reference"
        [translation]="item.translation"
        [disabled]="isBibleBooksMemorizationItem(item)"
      >
        <button
          type="button"
          data-testid="memorize-card-practice"
          (click)="practice.emit(item)"
          class="w-full h-full min-w-0 text-left px-4 py-3 transition-colors cursor-pointer border border-transparent hover:!border-[#0047AB] hover:!bg-blue-100 hover:ring hover:ring-[#0047AB] hover:ring-offset-0 dark:hover:!border-[#0047AB] dark:hover:!bg-blue-950 dark:hover:ring-[#0047AB]"
        >
          <span class="font-semibold text-gray-900 dark:text-gray-100 block truncate">
            {{ item.reference }}
          </span>
          <span class="text-xs text-gray-600 dark:text-gray-400 mt-0.5 block">
            @if (isBibleBooksMemorizationItem(item)) {
              {{ bibleBooksCountLabel(item.bibleBooksScope!) }}
            } @else {
              {{ item.translation.toUpperCase() }}
            }
            @if (item.lastPracticedAt) {
              · Last: {{ formatDate(item.lastPracticedAt) }}
            }
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-500 mt-0.5 block">
            Sessions: {{ completedCount }} completed · {{ masterLabel }}
          </span>
        </button>
      </app-scripture-hover-preview>
      <button
        type="button"
        data-testid="memorize-card-remove"
        (click)="remove.emit(item)"
        class="shrink-0 flex items-center justify-center px-3 border border-transparent text-gray-500 dark:text-gray-400 transition-colors cursor-pointer hover:!border-[#0047AB] hover:!bg-blue-100 hover:ring hover:ring-[#0047AB] hover:ring-offset-0 hover:text-red-600 dark:hover:!border-[#0047AB] dark:hover:!bg-blue-950 dark:hover:ring-[#0047AB] dark:hover:text-red-400"
        [attr.aria-label]="'Remove ' + item.reference"
        title="Remove"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `,
})
export class MemorizedVerseCardComponent {
  @Input({ required: true }) item!: MemorizedItem;
  @Input() tourMemorizeAnchors = false;
  @Output() practice = new EventEmitter<MemorizedItem>();
  @Output() remove = new EventEmitter<MemorizedItem>();

  readonly isBibleBooksMemorizationItem = isBibleBooksMemorizationItem;
  readonly bibleBooksCountLabel = bibleBooksCountLabel;

  get completedCount(): number {
    return this.item.practiceSessions.filter((s) => s.completed).length;
  }

  get masterLabel(): string {
    return masterLevelLabel(getMasterLevel(this.item));
  }

  formatDate(ts: number): string {
    try {
      return new Date(ts).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  }
}
