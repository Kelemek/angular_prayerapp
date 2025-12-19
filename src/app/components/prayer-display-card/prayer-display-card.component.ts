import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  created_at: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
}

interface PrayerPrompt {
  id: string;
  title: string;
  type: string;
  description: string;
  created_at: string;
}

@Component({
  selector: 'app-prayer-display-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Prayer Card -->
    <div *ngIf="prayer" class="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto">
      <!-- Prayer For -->
      <div class="mb-6">
        <div class="text-lg md:text-xl lg:text-2xl font-semibold mb-2 text-blue-600 dark:text-blue-300">Prayer For:</div>
        <div class="text-2xl md:text-3xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-gray-100">{{ prayer.prayer_for }}</div>
      </div>

      <!-- Description -->
      <div class="mb-6">
        <div class="text-lg md:text-2xl lg:text-3xl leading-relaxed text-gray-800 dark:text-gray-100">{{ prayer.description }}</div>
      </div>

      <!-- Meta Info -->
      <div class="flex justify-between items-center mb-1 text-sm md:text-base lg:text-xl text-gray-700 dark:text-gray-300 flex-wrap gap-4">
        <div>
          <span class="font-semibold">Requested by:</span> {{ prayer.requester || 'Anonymous' }}
        </div>
        <div [ngClass]="getStatusBadgeClasses(prayer.status)">
          {{ prayer.status.charAt(0).toUpperCase() + prayer.status.slice(1) }}
        </div>
      </div>

      <!-- Date and Time -->
      <div class="mb-6 text-sm md:text-base lg:text-lg text-gray-700 dark:text-gray-300">
        <span class="font-semibold">Date:</span> {{ formatDate(prayer.created_at) }}
      </div>

      <!-- Updates Section -->
      <div *ngIf="prayer.prayer_updates && prayer.prayer_updates.length > 0" 
        class="border-t border-gray-300 dark:border-gray-600 pt-6">
        <div class="text-lg md:text-xl lg:text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Recent Updates ({{ getRecentUpdates().length }})
        </div>
        <div class="space-y-4">
          <div *ngFor="let update of getRecentUpdates()" 
            class="bg-gray-100 dark:bg-gray-700 rounded-xl p-5">
            <div class="text-sm md:text-base lg:text-lg text-gray-700 dark:text-gray-300 mb-2">
              {{ update.author }} • {{ formatDate(update.created_at) }}
            </div>
            <div class="text-base md:text-lg lg:text-xl text-gray-800 dark:text-gray-200">{{ update.content }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Prompt Card -->
    <div *ngIf="prompt" class="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto">
      <!-- Type Badge -->
      <div class="mb-6">
        <span class="inline-block px-3 md:px-4 lg:px-5 py-1 md:py-1.5 lg:py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-sm md:text-base lg:text-xl font-semibold border border-yellow-300 dark:border-yellow-700">
          {{ prompt.type }}
        </span>
      </div>

      <!-- Title -->
      <div class="mb-6">
        <div class="text-2xl md:text-3xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-gray-100">{{ prompt.title }}</div>
      </div>

      <!-- Description -->
      <div class="mb-6">
        <div class="text-lg md:text-2xl lg:text-3xl leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{{ prompt.description }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class PrayerDisplayCardComponent {
  @Input() prayer?: Prayer;
  @Input() prompt?: PrayerPrompt;

  getStatusBadgeClasses(status: string): string {
    const baseClasses = 'px-5 py-2 rounded-full border ';
    switch (status) {
      case 'current':
        return baseClasses + 'bg-[#0047AB] bg-opacity-20 text-[#0047AB] dark:bg-[#0047AB] dark:bg-opacity-30 dark:text-[#4A90E2] border-[#0047AB]';
      case 'answered':
        return baseClasses + 'bg-[#39704D] bg-opacity-20 text-[#39704D] dark:bg-[#39704D] dark:bg-opacity-30 dark:text-[#5FB876] border-[#39704D]';
      default:
        return baseClasses + 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  }

  getRecentUpdates() {
    if (!this.prayer?.prayer_updates) return [];
    return this.prayer.prayer_updates
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) + ' at ' + date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
}
