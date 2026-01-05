import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PromptService } from '../../services/prompt.service';
import type { PrayerTypeRecord } from '../../types/prayer';

@Component({
  selector: 'app-prayer-types-manager',
  standalone: true,
  imports: [FormsModule, DragDropModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <!-- Header -->
      <div class="flex flex-col gap-3 mb-4">
        <div class="flex items-center gap-2">
          <svg class="text-indigo-600 dark:text-indigo-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Prayer Types
          </h3>
        </div>
        <button
          (click)="toggleAddForm()"
          title="Add new prayer type"
          class="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap w-fit ml-auto"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Type
        </button>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Manage the available types for prayer prompts. You can reorder, activate/deactivate, or delete types.
      </p>

      <!-- Error Message -->
      @if (error) {
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
        <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
      </div>
      }

      <!-- Success Message -->
      @if (success) {
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
        <p class="text-sm text-green-800 dark:text-green-200">{{ success }}</p>
      </div>
      }

      <!-- Add/Edit Form -->
      @if (showAddForm) {
      <form (submit)="handleSubmit($event)" class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100">
            {{ editingId ? 'Edit Prayer Type' : 'Add New Prayer Type' }}
          </h4>
          <button
            type="button"
            (click)="cancelEdit()"
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="grid gap-3">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type Name *
            </label>
            <input
              type="text"
              id="name"
              [(ngModel)]="name"
              name="name"
              placeholder="e.g., Healing, Guidance, Thanksgiving"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="displayOrder" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Order
              </label>
              <input
                type="number"
                id="displayOrder"
                [(ngModel)]="displayOrder"
                name="displayOrder"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="isActive"
                  name="isActive"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Inactive types won't appear in dropdowns
              </p>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button
            type="submit"
            [disabled]="submitting"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
          >
            {{ submitting ? 'Saving...' : (editingId ? 'Update Type' : 'Add Type') }}
          </button>
          <button
            type="button"
            (click)="cancelEdit()"
            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
      }

      <!-- Loading State -->
      @if (loading) {
      <div class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-600 dark:text-gray-400 mt-2">Loading types...</p>
      </div>
      }

      <!-- Empty State -->
      @if (!loading && types.length === 0) {
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="mx-auto mb-2 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
        <p>No prayer types found</p>
        <p class="text-sm mt-1">Add your first type to get started</p>
      </div>
      }

      <!-- Types List with Drag & Drop -->
      @if (!loading && types.length > 0) {
      <div cdkDropList (cdkDropListDropped)="onDrop($event)" class="space-y-2">
        @for (type of types; track type.id) {
        <div
          cdkDrag
          [class]="'flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border ' + 
            (type.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600 opacity-60')"
        >
          <div class="flex items-center gap-3 flex-1">
            <div class="flex flex-col gap-1">
              <button
                cdkDragHandle
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-move"
                title="Drag to reorder"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="5" r="1"></circle>
                  <circle cx="9" cy="12" r="1"></circle>
                  <circle cx="9" cy="19" r="1"></circle>
                  <circle cx="15" cy="5" r="1"></circle>
                  <circle cx="15" cy="12" r="1"></circle>
                  <circle cx="15" cy="19" r="1"></circle>
                </svg>
              </button>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-medium text-gray-900 dark:text-gray-100">{{ type.name }}</h4>
                @if (!type.is_active) {
                <span class="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">Inactive</span>
                }
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-500">
                Order: {{ type.display_order }} • Created {{ formatDate(type.created_at) }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="toggleActive(type)"
              [class]="'p-2 rounded-lg transition-colors ' + 
                (type.is_active ? 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800')"
              [title]="type.is_active ? 'Deactivate' : 'Activate'"
            >
              @if (type.is_active) {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              }
              @if (!type.is_active) {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
              }
            </button>
            <button
              (click)="handleEdit(type)"
              class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Edit"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button
              (click)="handleDelete(type.id, type.name)"
              class="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Delete"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        }
      </div>
      }

      <!-- Footer Stats -->
      @if (!loading && types.length > 0) {
      <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">
            Total: <span class="font-semibold">{{ types.length }}</span> type(s)
            @if (getActiveCount() < types.length) {
            <span class="ml-2">
              (<span class="font-semibold">{{ getActiveCount() }}</span> active)
            </span>
            }
          </span>
        </div>
      </div>
      }
    </div>
  `,
  styles: []
})
export class PrayerTypesManagerComponent implements OnInit {
  @Output() onSave = new EventEmitter<void>();

  types: PrayerTypeRecord[] = [];
  loading = true;
  showAddForm = false;
  error: string | null = null;
  success: string | null = null;

  // Form state
  editingId: string | null = null;
  name = '';
  displayOrder = 0;
  isActive = true;
  submitting = false;
  reordering = false;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private promptService: PromptService
  ) {}

  ngOnInit() {
    this.fetchTypes();
  }

  async fetchTypes() {
    try {
      this.loading = true;
      this.error = null;

      const { data, error } = await this.supabase.directQuery<PrayerTypeRecord>(
        'prayer_types',
        {
          select: '*',
          order: { column: 'display_order', ascending: true },
          timeout: 15000
        }
      );

      if (error) throw error;
      this.types = Array.isArray(data) ? data : (data ? [data] : []);
    } catch (err: unknown) {
      console.error('Error fetching prayer types:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = message;
    } finally {
      this.loading = false;
    }
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.editingId = null;
    this.name = '';
    this.displayOrder = 0;
    this.isActive = true;
    this.error = null;
    this.success = null;
  }

  async handleSubmit(event: Event) {
    event.preventDefault();

    if (!this.name.trim()) {
      this.error = 'Please enter a type name';
      return;
    }

    try {
      this.submitting = true;
      this.error = null;
      this.success = null;

      if (this.editingId) {
        // Update existing type
        const { error } = await this.supabase.client
          .from('prayer_types')
          .update({
            name: this.name.trim(),
            display_order: this.displayOrder,
            is_active: this.isActive
          })
          .eq('id', this.editingId);

        if (error) throw error;
        this.success = 'Prayer type updated successfully!';
      } else {
        // Add new type
        const { error } = await this.supabase.client
          .from('prayer_types')
          .insert({
            name: this.name.trim(),
            display_order: this.displayOrder,
            is_active: this.isActive
          });

        if (error) throw error;
        this.success = 'Prayer type added successfully!';
      }

      // Reset form
      this.name = '';
      this.displayOrder = 0;
      this.isActive = true;
      this.editingId = null;
      this.showAddForm = false;

      await this.fetchTypes();
      // Reload prompts to reflect type changes on main site
      await this.promptService.loadPrompts();
      this.onSave.emit();
    } catch (err: unknown) {
      console.error('Error saving prayer type:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = `Failed to save prayer type: ${message}`;
    } finally {
      this.submitting = false;
    }
  }

  handleEdit(type: PrayerTypeRecord) {
    this.name = type.name;
    this.displayOrder = type.display_order;
    this.isActive = type.is_active;
    this.editingId = type.id;
    this.showAddForm = true;
    this.error = null;
    this.success = null;
  }

  async handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the "${name}" type? This may affect existing prayer prompts using this type.`)) {
      return;
    }

    try {
      this.error = null;
      this.success = null;

      const { error } = await this.supabase.client
        .from('prayer_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.success = 'Prayer type deleted successfully!';
      await this.fetchTypes();
      // Reload prompts to reflect type deletion on main site
      await this.promptService.loadPrompts();
    } catch (err: unknown) {
      console.error('Error deleting prayer type:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = message;
    }
  }

  async toggleActive(type: PrayerTypeRecord) {
    try {
      this.error = null;
      this.success = null;

      const { error } = await this.supabase.client
        .from('prayer_types')
        .update({ is_active: !type.is_active })
        .eq('id', type.id);

      if (error) throw error;

      this.success = `Prayer type ${!type.is_active ? 'activated' : 'deactivated'} successfully!`;
      await this.fetchTypes();
      // Reload prompts to reflect active status change on main site
      await this.promptService.loadPrompts();
    } catch (err: unknown) {
      console.error('Error toggling prayer type:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = message;
    }
  }

  async onDrop(event: CdkDragDrop<PrayerTypeRecord[]>) {
    if (event.previousIndex === event.currentIndex) return;

    const original = [...this.types];

    // Optimistically update UI
    moveItemInArray(this.types, event.previousIndex, event.currentIndex);
    this.reordering = true;
    this.error = null;

    try {
      // Update display_order for all types to match new order
      const updates = this.types.map((t, idx) =>
        this.supabase.client
          .from('prayer_types')
          .update({ display_order: idx })
          .eq('id', t.id)
      );

      const results = await Promise.all(updates);

      // Check for errors
      const errorResult = results.find(r => r.error);
      if (errorResult?.error) throw errorResult.error;

      // Refresh from server to ensure consistency
      await this.fetchTypes();
      // Reload prompts to reflect new order on main site
      await this.promptService.loadPrompts();
    } catch (err: unknown) {
      console.error('Error reordering prayer types:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = message;
      // Revert optimistic update
      this.types = original;
    } finally {
      this.reordering = false;
    }
  }

  cancelEdit() {
    this.showAddForm = false;
    this.editingId = null;
    this.name = '';
    this.displayOrder = 0;
    this.isActive = true;
    this.error = null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getActiveCount(): number {
    return this.types.filter(t => t.is_active).length;
  }
}
