import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ADMIN_NAV_TILES,
  adminNavTileCount,
} from '../../lib/admin-nav-tiles';
import type { AdminData } from '../../services/admin-data.service';
import type { AdminTab } from '../../lib/admin-pending-queues';

@Component({
  selector: 'app-admin-nav-tiles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-4 gap-2 sm:gap-4 mb-8">
      @for (tile of tiles; track tile.tab) {
        <button
          type="button"
          (click)="tabSelect.emit(tile.tab)"
          [class]="
            'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer ' +
            (activeTab === tile.tab ? 'ring-2 ring-blue-500' : '')
          "
        >
          <div class="text-center self-start w-full">
            @if (tile.kind === 'count') {
              <div class="text-lg sm:text-2xl font-bold {{ tile.countColorClass }}">
                {{ countFor(tile.tab) }}
              </div>
            } @else {
              <svg
                class="w-4 sm:w-6 h-4 sm:h-6 mx-auto {{ tile.countColorClass }} translate-y-2 sm:translate-y-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                ></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            }
          </div>
          <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            @if (tile.labelPrefixLg) {
              <span class="hidden lg:inline">{{ tile.labelPrefixLg }}</span>
            }
            {{ tile.label }}
          </div>
        </button>
      }
    </div>
  `,
})
export class AdminNavTilesComponent {
  readonly tiles = ADMIN_NAV_TILES;

  @Input({ required: true }) activeTab!: AdminTab;
  @Input() adminData: AdminData | null = null;
  @Input() consolidatedApprovalsCount = 0;

  @Output() tabSelect = new EventEmitter<AdminTab>();

  countFor(tab: AdminTab): number {
    return adminNavTileCount(tab, this.adminData, this.consolidatedApprovalsCount);
  }
}
