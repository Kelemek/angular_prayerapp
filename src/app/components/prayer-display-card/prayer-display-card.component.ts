import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  created_at: string;
  category?: string;
  user_email?: string;
  prayer_image?: string | null;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
    is_answered?: boolean;
    is_anonymous?: boolean;
  }>;
  updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
    is_answered?: boolean;
    is_anonymous?: boolean;
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
  imports: [NgClass],
  template: `
    <!-- Prayer Card -->
    @if (prayer) {
    <div class="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto">
      <!-- Category Badge (Personal Prayers) -->
      @if (prayer.category && isPersonalPrayer()) {
      <div class="mb-6">
        <span class="inline-block px-3 md:px-4 lg:px-5 py-1 md:py-1.5 lg:py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm md:text-base lg:text-lg font-medium">
          {{ prayer.category }}
        </span>
      </div>
      }

      <!-- Prayer For -->
      <div class="mb-6">
        <div class="flex items-center gap-6">
          @if (isMemberPrayer() && prayer.prayer_image) {
            <img 
              [src]="prayer.prayer_image" 
              [alt]="'Avatar for ' + prayer.prayer_for"
              class="w-24 h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 rounded-full object-cover border-4 border-blue-100 dark:border-blue-900 shadow-xl flex-shrink-0"
            />
          }
          <div>
            <div class="text-lg md:text-xl lg:text-2xl font-semibold mb-2 text-blue-600 dark:text-blue-300">
              {{ isMemberPrayer() ? 'Member Prayer:' : 'Prayer For:' }}
            </div>
            <div class="text-2xl md:text-3xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              {{ prayer.prayer_for }}
            </div>
          </div>
        </div>
      </div>

      <!-- Description (Hidden for members since it's just a generated label) -->
      @if (!isMemberPrayer()) {
      <div class="mb-6">
        <div class="text-lg md:text-2xl lg:text-3xl leading-relaxed text-gray-800 dark:text-gray-100">{{ prayer.description }}</div>
      </div>
      }

      <!-- Meta Info -->
      <div class="flex justify-between items-center mb-1 text-sm md:text-base lg:text-xl text-gray-700 dark:text-gray-300 flex-wrap gap-4">
        @if (!isPersonalPrayer() && !isMemberPrayer()) {
        <div>
          <span class="font-semibold">Requested by:</span> {{ prayer.requester || 'Anonymous' }}
        </div>
        }
        @if (!isPersonalPrayer() && !isMemberPrayer()) {
        <div [ngClass]="getStatusBadgeClasses(prayer.status)">
          {{ prayer.status.charAt(0).toUpperCase() + prayer.status.slice(1) }}
        </div>
        }
      </div>

      <!-- Date and Time (Hidden for PC members) -->
      @if (!isMemberPrayer()) {
      <div class="mb-6 text-sm md:text-base lg:text-lg text-gray-700 dark:text-gray-300">
        <span class="font-semibold">Date:</span> {{ formatDate(prayer.created_at) }}
      </div>
      }

      <!-- Updates Section -->
      @if (getAllUpdates().length > 0) {
      <div 
        class="border-t border-gray-300 dark:border-gray-600 pt-6">
        <div class="flex items-center justify-between mb-4">
          <div class="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Recent Updates @if (!showAllUpdates && getRecentUpdates().length < getAllUpdates().length) {<span>({{ getRecentUpdates().length }} of {{ getAllUpdates().length }})</span>}
          </div>
          @if (shouldShowToggleButton()) {
          <button
            (click)="showAllUpdates = !showAllUpdates"
            class="text-sm md:text-base text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            {{ showAllUpdates ? 'Show less' : 'Show all' }}
            <svg [class]="'transform transition-transform ' + (showAllUpdates ? 'rotate-180' : '')" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          }
        </div>
        <div class="space-y-4">
          @for (update of getRecentUpdates(); track update.id) {
          <div 
            class="bg-gray-100 dark:bg-gray-700 rounded-xl p-5 relative">
            <div class="flex items-start justify-between mb-2">
              <div class="text-sm md:text-base lg:text-lg text-gray-700 dark:text-gray-300">
                @if (!isPersonalPrayer() && !isMemberPrayer()) {
                  Updated by: {{ update.is_anonymous ? 'Anonymous' : update.author }} • {{ formatDate(update.created_at) }}
                } @else {
                  {{ formatDate(update.created_at) }}
                }
              </div>

              @if (isMemberPrayer() && update.is_answered) {
              <span class="inline-flex items-center justify-center px-4 py-1.5 bg-green-600 dark:bg-green-700 text-white rounded-full text-base lg:text-lg font-bold whitespace-nowrap shadow-sm">
                Answered
              </span>
              }
            </div>
            <div class="text-base md:text-lg lg:text-xl text-gray-800 dark:text-gray-200">{{ update.content }}</div>
          </div>
          }
        </div>
      </div>
      }
    </div>
    }

    <!-- Prompt Card -->
    @if (prompt) {
    <div class="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto">
      <!-- Type Badge -->
      <div class="mb-6">
        <span class="inline-block px-3 md:px-4 lg:px-5 py-1 md:py-1.5 lg:py-2 bg-[#988F83] text-white rounded-full text-sm md:text-base lg:text-xl font-semibold">
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
    }
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
  
  showAllUpdates = false;

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
    const allUpdates = this.getAllUpdates();
    if (allUpdates.length === 0) return [];
    
    const sortedUpdates = [...allUpdates]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (this.showAllUpdates) return sortedUpdates;
    
    // Get updates from the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentUpdates = sortedUpdates.filter(update => 
      new Date(update.created_at).getTime() > oneWeekAgo.getTime()
    );
    
    // If there are updates less than 1 week old, show all of them
    // Otherwise, show only the most recent update
    return recentUpdates.length > 0 ? recentUpdates : sortedUpdates.slice(0, 1);
  }

  getAllUpdates() {
    if (!this.prayer) return [];
    return (this.prayer.prayer_updates || []).concat(this.prayer.updates || []);
  }

  shouldShowToggleButton(): boolean {
    const allUpdates = this.getAllUpdates();
    if (allUpdates.length === 0) return false;
    const displayed = this.getRecentUpdates();
    return displayed.length < allUpdates.length || this.showAllUpdates;
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

  isMemberPrayer(): boolean {
    return !!this.prayer?.id?.startsWith('pc-member-');
  }

  isPersonalPrayer(): boolean {
    return !!this.prayer?.user_email;
  }
}
