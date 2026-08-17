import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  ADMIN_ANALYTICS_ACCENT_CLASSES,
  type AdminAnalyticsTileIcon,
  type AdminAnalyticsAccent,
} from '../../lib/admin-analytics-tiles';

@Component({
  selector: 'app-admin-analytics-stat-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] {{ accentClasses.border }}"
    >
      <div class="flex items-center gap-1.5 mb-1">
        <svg
          class="{{ accentClasses.icon }}"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          @switch (icon) {
            @case ('eye') {
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            }
            @case ('calendar-week') {
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            }
            @case ('trending') {
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            }
            @case ('clock-year') {
              <circle cx="12" cy="12" r="9"></circle>
              <polyline points="12 7 12 12 16 14"></polyline>
            }
            @case ('users-all') {
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            }
            @case ('heart') {
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              ></path>
            }
            @case ('check-circle') {
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            }
            @case ('check') {
              <polyline points="20 6 9 17 4 12"></polyline>
            }
            @case ('archive') {
              <rect x="3" y="5" width="18" height="16" rx="2"></rect>
              <path d="M7 15h10"></path>
              <path d="M7 7h10"></path>
            }
            @case ('subscribers') {
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <polyline points="17 11 19 13 23 9"></polyline>
            }
            @case ('book') {
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              <line x1="8" y1="7" x2="16" y2="7"></line>
              <line x1="8" y1="11" x2="16" y2="11"></line>
              <line x1="8" y1="15" x2="12" y2="15"></line>
            }
            @case ('book-open') {
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            }
            @case ('practice-clock') {
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            }
            @case ('mastered') {
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            }
            @default {}
          }
        </svg>
        <div class="text-xs font-medium text-gray-700 dark:text-gray-200">{{ label }}</div>
      </div>
      <div class="text-xl font-bold leading-tight {{ accentClasses.value }}">
        {{ value.toLocaleString() }}
      </div>
      <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">{{ subtitle }}</div>
    </div>
  `,
})
export class AdminAnalyticsStatTileComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: number;
  @Input({ required: true }) subtitle!: string;
  @Input({ required: true }) accent!: AdminAnalyticsAccent;
  @Input({ required: true }) icon!: AdminAnalyticsTileIcon;

  get accentClasses(): { border: string; icon: string; value: string } {
    return ADMIN_ANALYTICS_ACCENT_CLASSES[this.accent];
  }
}
