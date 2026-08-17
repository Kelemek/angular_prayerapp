import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminPrayerEditModalComponent } from '../admin-prayer-edit-modal/admin-prayer-edit-modal.component';
import { AdminUpdateEditModalComponent } from '../admin-update-edit-modal/admin-update-edit-modal.component';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import type { PrayerRequest } from '../../types/prayer';
import { AdminDataService } from '../../services/admin-data.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-consolidated-prayer-approval',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AdminPrayerEditModalComponent,
    AdminUpdateEditModalComponent,
    RichTextEditorComponent,
    RichTextViewComponent,
  ],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border-[2px] border-green-500 dark:border-green-600 p-6 mb-4 transition-colors">
      <!-- Prayer Header -->
      <div class="flex items-start justify-between mb-6">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Prayer for {{ prayer.prayer_for }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Requested by: <span class="font-medium text-gray-800 dark:text-gray-100">{{ prayer.requester }}</span>
            @if (prayer.is_anonymous) {
              <span class="inline-flex items-center gap-1 px-2 py-0.5 ml-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                (Anonymous)
              </span>
            }
          </p>
          @if (prayer.in_planning_center !== null) {
            <p class="text-xs mb-1">
              @if (prayer.in_planning_center) {
                <span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 12l4 4 8-8"></path>
                  </svg>
                  In Planning Center
                </span>
              } @else {
                <span class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  Not in Planning Center
                </span>
              }
            </p>
          }
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatDate(prayer.created_at) }}
          </p>
        </div>
        <button
          (click)="showEditPrayer = true"
          aria-label="Edit prayer"
          title="Edit prayer"
          class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md flex-shrink-0 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>

      <!-- Prayer description (edit via header “Edit prayer” → modal only) -->
      <app-rich-text-view
        class="block text-gray-600 dark:text-gray-300 mb-6"
        [text]="prayer.description"
      ></app-rich-text-view>

      <!-- Updates Section (within the card) -->
      @if (pendingUpdates && pendingUpdates.length > 0) {
        <div class="mb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
            <span class="inline-flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold">
              {{ pendingUpdates.length }}
            </span>
            Update{{ pendingUpdates.length === 1 ? '' : 's' }}
          </h4>
          
          <div class="space-y-3">
            @for (update of pendingUpdates; track trackByUpdateId($index, update)) {
              <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Updated by: <span class="font-medium text-gray-700 dark:text-gray-300">{{ update.author }}</span>
                      @if (update.is_anonymous) {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 ml-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                          (Anonymous)
                        </span>
                      }
                    </p>
                    @if (update.in_planning_center !== null) {
                      <p class="text-xs mb-1">
                        @if (update.in_planning_center) {
                          <span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M4 12l4 4 8-8"></path>
                            </svg>
                            In Planning Center
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Not in Planning Center
                          </span>
                        }
                      </p>
                    }
                    @if (update.mark_as_answered) {
                      <p class="text-xs mb-1">
                        <span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 12l4 4 8-8"></path>
                          </svg>
                          Answered
                        </span>
                      </p>
                    }
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {{ formatUpdateDate(update.created_at) }}
                    </p>
                    @if (inlineEditingUpdateId === update.id) {
                      <div class="space-y-3">
                        <app-rich-text-editor
                          [ngModel]="inlineEditingUpdateContent"
                          (ngModelChange)="inlineEditingUpdateContent = $event"
                          [name]="'inlineUpdate-' + update.id"
                          ngDefaultControl
                          ariaLabel="Update content"
                          placeholder="Update details…"
                          minHeight="4rem"
                        ></app-rich-text-editor>
                        <div class="flex gap-2 justify-end">
                          <button
                            type="button"
                            (click)="saveInlineUpdate(update.id)"
                            [disabled]="isSavingUpdate"
                            class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          >{{ isSavingUpdate ? 'Saving…' : 'Save' }}</button>
                          <button
                            type="button"
                            (click)="cancelInlineUpdate()"
                            [disabled]="isSavingUpdate"
                            class="px-3 py-1.5 text-xs bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors font-medium"
                          >Cancel</button>
                        </div>
                      </div>
                    } @else {
                      <app-rich-text-view
                        class="block text-sm text-gray-700 dark:text-gray-300"
                        [text]="update.content"
                      ></app-rich-text-view>
                    }
                  </div>
                  <div class="flex flex-col gap-1 ml-2 flex-shrink-0">
                    @if (inlineEditingUpdateId !== update.id) {
                      <button
                        (click)="startInlineUpdateEdit(update)"
                        aria-label="Inline edit update"
                        title="Inline edit update"
                        class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    }
                  </div>
                </div>

                <!-- Denial Form for Update -->
                @if (denyingUpdateId === update.id) {
                  <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 mb-3">
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reason for denial (optional)
                    </label>
                    <textarea
                      [ngModel]="updateDenialReasons.get(update.id) || ''"
                      (ngModelChange)="updateDenialReasons.set(update.id, $event)"
                      rows="2"
                      placeholder="Explain why this update is being denied..."
                      class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                    ></textarea>
                  </div>
                }

                <!-- Update Actions -->
                <div class="flex justify-end gap-2">
                  @if (denyingUpdateId !== update.id) {
                    <button
                      (click)="startDenyingUpdate(update.id)"
                      class="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      Deny
                    </button>
                    <button
                      (click)="handleApproveUpdate(update.id)"
                      class="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Approve
                    </button>
                  } @else {
                    <button
                      (click)="handleDenyUpdate(update.id)"
                      class="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium cursor-pointer"
                    >
                      Confirm Denial
                    </button>
                    <button
                      (click)="cancelDenyingUpdate()"
                      class="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Denial Form -->
      @if (isDenyingPrayer) {
        <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for denial (optional)
          </label>
          <textarea
            [(ngModel)]="prayerDenialReason"
            rows="3"
            placeholder="Explain why this prayer request is being denied..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
          ></textarea>
        </div>
      }

      <!-- Single Approve/Deny Buttons (shown when there are no pending updates) -->
      @if (!pendingUpdates || pendingUpdates.length === 0) {
        <div class="flex gap-3 justify-end border-t border-gray-200 dark:border-gray-700 pt-6">
          @if (!isDenyingPrayer) {
          <button
            (click)="isDenyingPrayer = true"
            class="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Deny
          </button>
          <button
            (click)="handleApprovePrayer()"
            class="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Approve
          </button>
        } @else {
          <button
            (click)="handleDenyPrayer()"
            class="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Confirm Denial
          </button>
          <button
            (click)="isDenyingPrayer = false; prayerDenialReason = ''"
            class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm cursor-pointer"
          >
            Cancel
          </button>
        }
        </div>
      }

      <!-- Prayer Edit Modal -->
      <app-admin-prayer-edit-modal
        [isOpen]="showEditPrayer"
        [prayer]="prayer"
        (close)="showEditPrayer = false"
        (save)="onPrayerSaved()"
      ></app-admin-prayer-edit-modal>

      <!-- Update Edit Modal -->
      @if (editUpdate) {
        <app-admin-update-edit-modal
          [isOpen]="showEditUpdate"
          [update]="editUpdate"
          (close)="showEditUpdate = false"
          (save)="onUpdateSaved()"
        ></app-admin-update-edit-modal>
      }
    </div>
  `,
  styles: []
})
export class ConsolidatedPrayerApprovalComponent {
  @Input() prayer!: PrayerRequest;
  @Input() pendingUpdates: any[] = [];

  @Output() onApprovePrayer = new EventEmitter<string>();
  @Output() onDenyPrayer = new EventEmitter<{ id: string; reason: string | null }>();
  @Output() onPrayerEdited = new EventEmitter<{ id: string; updates: any }>();
  @Output() onUpdateEdited = new EventEmitter<{ id: string; updates: any }>();
  @Output() onApproveUpdate = new EventEmitter<string>();
  @Output() onDenyUpdate = new EventEmitter<{ id: string; reason: string | null }>();

  isDenyingPrayer = false;
  prayerDenialReason = '';

  showEditPrayer = false;
  showEditUpdate = false;
  editUpdate: any = null;
  denyingUpdateId: string | null = null;
  updateDenialReasons: Map<string, string> = new Map();

  // Inline rich-text edit state (pending updates only; prayer uses modal)
  inlineEditingUpdateId: string | null = null;
  inlineEditingUpdateContent = '';
  isSavingUpdate = false;

  constructor(
    private adminDataService: AdminDataService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  getRequester(): string {
    if (this.prayer?.requester) {
      return this.prayer.requester;
    }
    if (this.prayer?.id?.startsWith('pc-member-')) {
      return 'Planning Center';
    }
    return 'Anonymous';
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  formatUpdateDate(date: string | Date | undefined): string {
    return this.formatDate(date);
  }

  handleApprovePrayer(): void {
    this.onApprovePrayer.emit(this.prayer.id);
  }

  handleDenyPrayer(): void {
    this.onDenyPrayer.emit({ id: this.prayer.id, reason: this.prayerDenialReason || null });
    this.isDenyingPrayer = false;
    this.prayerDenialReason = '';
  }

  handleApproveUpdate(updateId: string): void {
    this.onApproveUpdate.emit(updateId);
  }

  handleDenyUpdate(updateId: string): void {
    const reason = this.updateDenialReasons.get(updateId) || '';
    this.onDenyUpdate.emit({ id: updateId, reason: reason || null });
    this.denyingUpdateId = null;
    this.updateDenialReasons.delete(updateId);
  }

  startDenyingUpdate(updateId: string): void {
    this.denyingUpdateId = updateId;
    if (!this.updateDenialReasons.has(updateId)) {
      this.updateDenialReasons.set(updateId, '');
    }
  }

  cancelDenyingUpdate(): void {
    if (this.denyingUpdateId) {
      this.updateDenialReasons.delete(this.denyingUpdateId);
    }
    this.denyingUpdateId = null;
  }

  onPrayerSaved(): void {
    // Emit event to parent component with the prayer ID so it can refresh
    this.onPrayerEdited.emit({ id: this.prayer.id, updates: {} });
    this.showEditPrayer = false;
  }

  onUpdateSaved(): void {
    // Emit event to parent component with the update ID so it can refresh
    if (this.editUpdate) {
      this.onUpdateEdited.emit({ id: this.editUpdate.id, updates: {} });
    }
    this.showEditUpdate = false;
    this.editUpdate = null;
  }

  trackByUpdateId(index: number, update: any): string {
    return update?.id || index.toString();
  }

  startInlineUpdateEdit(update: { id: string; content: string }): void {
    this.inlineEditingUpdateId = update.id;
    this.inlineEditingUpdateContent = update.content || '';
  }

  cancelInlineUpdate(): void {
    this.inlineEditingUpdateId = null;
    this.inlineEditingUpdateContent = '';
  }

  async saveInlineUpdate(updateId: string): Promise<void> {
    if (this.isSavingUpdate) return;
    this.isSavingUpdate = true;
    this.cdr.markForCheck();
    try {
      await this.adminDataService.editUpdate(updateId, { content: this.inlineEditingUpdateContent });
      const target = this.pendingUpdates.find((u) => u?.id === updateId);
      if (target) {
        target.content = this.inlineEditingUpdateContent;
      }
      this.onUpdateEdited.emit({ id: updateId, updates: { content: this.inlineEditingUpdateContent } });
      this.inlineEditingUpdateId = null;
      this.inlineEditingUpdateContent = '';
      this.toast.success('Update edited.');
    } catch (err) {
      console.error('Failed to update prayer update:', err);
      this.toast.error('Failed to edit update.');
    } finally {
      this.isSavingUpdate = false;
      this.cdr.markForCheck();
    }
  }
}
