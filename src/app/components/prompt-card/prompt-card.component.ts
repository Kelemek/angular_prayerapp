import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PrayerPrompt {
  id: string;
  title: string;
  type: string;
  description: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-prompt-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="prompt-card bg-white dark:bg-gray-800 rounded-lg shadow-md border-[2px] !border-[#988F83] dark:!border-[#988F83] p-6 mb-4 hover:shadow-lg transition-shadow">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-2 flex-1">
          <svg class="text-[#988F83] dark:text-[#988F83]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18h6"></path>
            <path d="M10 22h4"></path>
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {{ prompt.title }}
          </h3>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <!-- Type Badge -->
          <button
            (click)="onTypeClick.emit(prompt.type)"
            [class]="'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ' + (isTypeSelected ? 'bg-[#988F83] text-white shadow-md hover:bg-[#7a6e67]' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')"
            [title]="isTypeSelected ? 'Remove ' + prompt.type + ' filter' : 'Filter by ' + prompt.type"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            {{ prompt.type }}
          </button>
          <button
            *ngIf="isAdmin"
            (click)="handleDelete()"
            class="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            title="Delete prompt"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Description -->
      <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
        {{ prompt.description }}
      </p>
    </div>
  `,
  styles: []
})
export class PromptCardComponent {
  @Input() prompt!: PrayerPrompt;
  @Input() isAdmin = false;
  @Input() isTypeSelected = false;
  
  @Output() delete = new EventEmitter<string>();
  @Output() onTypeClick = new EventEmitter<string>();

  handleDelete(): void {
    if (confirm('Are you sure you want to delete this prayer prompt?')) {
      this.delete.emit(this.prompt.id);
    }
  }
}
