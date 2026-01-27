import { Component, OnInit, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { fetchPlanningCenterLists, type PlanningCenterList } from '../../../lib/planning-center';
import { environment } from '../../../environments/environment';

interface EmailSubscriber {
  id: string;
  name: string;
  email: string;
  planning_center_list_id?: string;
}

@Component({
  selector: 'app-planning-center-list-mapper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <svg class="text-blue-600 dark:text-blue-400 w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
        </svg>
        Planning Center List Mapping
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Map email subscribers to Planning Center lists to show prayers filtered by list members
      </p>

      <div class="space-y-6">
        <!-- User Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Subscriber
          </label>
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="subscriberSearch"
              (input)="filterSubscribers()"
              placeholder="Search by name or email..."
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <!-- Subscriber dropdown -->
          @if (filteredSubscribers.length > 0) {
            <div class="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 max-h-48 overflow-y-auto z-10">
              @for (subscriber of filteredSubscribers; track subscriber.id) {
                <button
                  (click)="selectSubscriber(subscriber)"
                  class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                >
                  <div class="font-medium text-gray-900 dark:text-gray-100">{{ subscriber.name }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">{{ subscriber.email }}</div>
                </button>
              }
            </div>
          }
        </div>

        <!-- Selected User Display -->
        @if (selectedSubscriber) {
          <div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div class="font-medium text-gray-900 dark:text-gray-100">{{ selectedSubscriber.name }}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">{{ selectedSubscriber.email }}</div>
          </div>
        }

        <!-- List Selection -->
        @if (selectedSubscriber) {
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Planning Center List
            </label>
            <div class="relative">
              <input
                type="text"
                [(ngModel)]="listSearch"
                (input)="filterLists()"
                [disabled]="loadingLists"
                placeholder="Search Planning Center lists..."
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              @if (loadingLists) {
                <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div class="animate-spin h-5 w-5 border border-gray-300 border-t-blue-600 rounded-full"></div>
                </div>
              }
            </div>

            <!-- Lists dropdown -->
            @if (filteredLists.length > 0) {
              <div class="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 max-h-48 overflow-y-auto z-10">
                @for (list of filteredLists; track list.id) {
                  <button
                    (click)="selectList(list)"
                    class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                  >
                    <div class="font-medium text-gray-900 dark:text-gray-100">{{ list.name }}</div>
                    @if (list.description) {
                      <div class="text-sm text-gray-500 dark:text-gray-400">{{ list.description }}</div>
                    }
                  </button>
                }
              </div>
            }
          </div>
        }

        <!-- Selected List Display -->
        @if (selectedList) {
          <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div class="font-medium text-gray-900 dark:text-gray-100">{{ selectedList.name }}</div>
            @if (selectedList.description) {
              <div class="text-sm text-gray-600 dark:text-gray-400">{{ selectedList.description }}</div>
            }
          </div>
        }

        <!-- Action Buttons -->
        @if (selectedSubscriber && selectedList) {
          <div class="flex gap-4">
            <button
              (click)="mapListToSubscriber()"
              [disabled]="saving"
              class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              @if (saving) {
                <span class="flex items-center justify-center gap-2">
                  <span class="animate-spin h-4 w-4 border border-white border-t-transparent rounded-full"></span>
                  Saving...
                </span>
              } @else {
                Map List to User
              }
            </button>
            <button
              (click)="clearSelection()"
              class="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium"
            >
              Clear
            </button>
          </div>
        }

        <!-- Current Mappings -->
        <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Current Mappings</h3>
          
          @if (mappings.length > 0) {
            <div class="space-y-2">
              @for (mapping of mappings; track mapping.id) {
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div>
                    <div class="font-medium text-gray-900 dark:text-gray-100">{{ mapping.name }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">{{ mapping.email }}</div>
                    <div class="text-sm text-blue-600 dark:text-blue-400 mt-1">{{ mapping.listName }}</div>
                  </div>
                  <button
                    (click)="removeMapping(mapping.id)"
                    [disabled]="saving"
                    class="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Remove
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="text-gray-500 dark:text-gray-400">No mappings yet.</p>
          }
        </div>
      </div>
    </div>
  `
})
export class PlanningCenterListMapperComponent implements OnInit {
  @Output() onSave = new EventEmitter<void>();

  subscribers: EmailSubscriber[] = [];
  filteredSubscribers: EmailSubscriber[] = [];
  subscriberSearch = '';
  selectedSubscriber: EmailSubscriber | null = null;

  allLists: PlanningCenterList[] = [];
  filteredLists: PlanningCenterList[] = [];
  listSearch = '';
  selectedList: PlanningCenterList | null = null;
  loadingLists = false;

  mappings: Array<{ id: string; name: string; email: string; listName: string; planning_center_list_id: string }> = [];
  saving = false;

  constructor(
    private supabaseService: SupabaseService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadSubscribersAndLists();
  }

  async loadSubscribersAndLists() {
    // Load lists first, then subscribers so that mappings can find list names
    await this.loadLists();
    await this.loadSubscribers();
  }

  async loadSubscribers() {
    try {
      const { data, error } = await this.supabaseService.client
        .from('email_subscribers')
        .select('id, name, email, planning_center_list_id')
        .order('name');

      if (error) throw error;

      this.subscribers = data || [];
      this.loadMappings();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading subscribers:', error);
      this.toastService.error('Failed to load subscribers');
    }
  }

  async loadLists() {
    this.loadingLists = true;
    this.cdr.markForCheck();
    
    try {
      const result = await fetchPlanningCenterLists(environment.supabaseUrl, environment.supabaseAnonKey);
      if (result.error) {
        throw new Error(result.error);
      }
      this.allLists = result.lists;
      this.filteredLists = result.lists;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading Planning Center lists:', error);
      this.toastService.error('Failed to load Planning Center lists');
    } finally {
      this.loadingLists = false;
      this.cdr.markForCheck();
    }
  }

  loadMappings() {
    this.mappings = this.subscribers
      .filter(sub => sub.planning_center_list_id)
      .map(sub => {
        const list = this.allLists.find(l => l.id === sub.planning_center_list_id);
        return {
          id: sub.id,
          name: sub.name,
          email: sub.email,
          listName: list?.name || 'Unknown List',
          planning_center_list_id: sub.planning_center_list_id!
        };
      });
  }

  filterSubscribers() {
    const search = this.subscriberSearch.toLowerCase();
    this.filteredSubscribers = this.subscribers.filter(
      sub => sub.name.toLowerCase().includes(search) || sub.email.toLowerCase().includes(search)
    );
  }

  filterLists() {
    const search = this.listSearch.toLowerCase();
    this.filteredLists = this.allLists.filter(
      list => list.name.toLowerCase().includes(search) || (list.description || '').toLowerCase().includes(search)
    );
  }

  selectSubscriber(subscriber: EmailSubscriber) {
    this.selectedSubscriber = subscriber;
    this.subscriberSearch = subscriber.name;
    this.filteredSubscribers = [];
    this.cdr.markForCheck();
  }

  selectList(list: PlanningCenterList) {
    this.selectedList = list;
    this.listSearch = list.name;
    this.filteredLists = [];
    this.cdr.markForCheck();
  }

  clearSelection() {
    this.selectedSubscriber = null;
    this.selectedList = null;
    this.subscriberSearch = '';
    this.listSearch = '';
    this.cdr.markForCheck();
  }

  async mapListToSubscriber() {
    if (!this.selectedSubscriber || !this.selectedList) return;

    this.saving = true;
    this.cdr.markForCheck();

    try {
      const { error } = await this.supabaseService.client
        .from('email_subscribers')
        .update({ planning_center_list_id: this.selectedList.id })
        .eq('id', this.selectedSubscriber.id);

      if (error) throw error;

      this.toastService.success(`Mapped "${this.selectedSubscriber.name}" to "${this.selectedList.name}"`);
      this.loadSubscribers();
      this.clearSelection();
      this.onSave.emit();
    } catch (error) {
      console.error('Error mapping list:', error);
      this.toastService.error('Failed to map list to subscriber');
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  async removeMapping(subscriberId: string) {
    this.saving = true;
    this.cdr.markForCheck();

    try {
      const { error } = await this.supabaseService.client
        .from('email_subscribers')
        .update({ planning_center_list_id: null })
        .eq('id', subscriberId);

      if (error) throw error;

      this.toastService.success('Mapping removed');
      this.loadSubscribers();
    } catch (error) {
      console.error('Error removing mapping:', error);
      this.toastService.error('Failed to remove mapping');
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
