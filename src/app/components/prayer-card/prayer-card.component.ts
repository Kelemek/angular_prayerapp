import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, OnDestroy, OnChanges, SimpleChanges, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, Subject } from 'rxjs';import { takeUntil } from 'rxjs/operators';import { PrayerRequest, PrayerService } from '../../services/prayer.service';
import { SupabaseService } from '../../services/supabase.service';
import { UserSessionService } from '../../services/user-session.service';
import { BadgeService } from '../../services/badge.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-prayer-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md border-[2px] p-6 mb-4 transition-colors relative ' + (dragHandle && isPersonal ? ' pl-10 ' : '') + getBorderClass()"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3 flex-1">
          <!-- Drag Handle (only for personal prayers) -->
          @if (dragHandle && isPersonal) {
            <ng-container *ngTemplateOutlet="dragHandle"></ng-container>
          }
          <!-- Avatar for Planning Center members -->
          @if (prayer.prayer_image && prayer.id.startsWith('pc-member-')) {
            <img 
              [src]="prayer.prayer_image" 
              [alt]="'Avatar for ' + prayer.prayer_for"
              class="w-20 h-20 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
              loading="lazy"
            />
          }
          <div class="flex-1">
            <div class="relative flex items-center gap-2 flex-wrap">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-0 inline">
                Prayer for {{ prayer.prayer_for }}
              </h3>
            @if (activeFilter === 'total') {
            <span [class]="'px-2 py-1 text-xs font-medium rounded-full ' + getStatusBadgeClasses()">
              {{ getStatusLabel() }}
            </span>
            }
            @if (isPersonal && prayer.category) {
            <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
              {{ prayer.category }}
            </span>
            }
            @if (!isPersonal && !prayer.id.startsWith('pc-member-')) {
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Requested by: <span class="font-medium text-gray-800 dark:text-gray-100">{{ displayRequester() }}</span>
            </span>
            }
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          @if (isPersonal) {
          <button
            (click)="showShareModal = true"
            aria-label="Share personal prayer"
            title="Share prayer to public"
            class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
          </button>
          }
          @if (isPersonal) {
          <button
            (click)="editPersonalPrayer.emit(prayer)"
            aria-label="Edit personal prayer"
            title="Edit prayer"
            class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          }
          @if (showDeleteButton()) {
          <button
            (click)="handleDeleteClick()"
            aria-label="Delete prayer request"
            title="Delete prayer request"
            class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          }
        </div>
      </div>

      <!-- Badge in top-right corner -->
      @if ((prayerBadge$ | async) && (badgeService.getBadgeFunctionalityEnabled$() | async) && activeFilter !== 'total' && !isPersonal && !prayer.id.startsWith('pc-member-')) {
        <button
          (click)="markPrayerAsRead()"
          class="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
          title="Mark prayer as read"
          aria-label="Mark prayer as read"
        >
          1
        </button>
      }

      <!-- Centered timestamp (hidden for Planning Center member cards) -->
      @if (!prayer.id.startsWith('pc-member-')) {
      <span class="absolute left-1/2 top-4 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
        {{ formatDate(prayer.created_at) }}
      </span>
      }
      <!-- Prayer Description -->
      <p class="text-gray-600 dark:text-gray-300 mb-4">{{ prayer.description }}</p>

      <!-- Action buttons -->
      @if (showAddUpdateButton()) {
      <div class="flex flex-wrap gap-1 mb-4">
        <button
          (click)="toggleAddUpdate()"
          title="Add an update to this prayer"
          class="px-3 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/20 text-[#39704D] dark:text-[#5FB876] rounded-md border border-[#39704D] dark:border-[#39704D] hover:bg-green-100 dark:hover:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 cursor-pointer"
        >
          Add Update
        </button>
      </div>
      }

      <!-- Add Update Form -->
      @if (showAddUpdateForm) {
      <form #updateForm="ngForm" (ngSubmit)="updateForm.valid && handleAddUpdate()" class="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-[#39704D] dark:border-[#39704D] rounded-lg" role="region" [attr.aria-labelledby]="'addUpdateTitle-' + prayer.id">
        <h4 [id]="'addUpdateTitle-' + prayer.id" class="text-sm font-medium text-[#39704D] dark:text-[#5FB876] mb-3">Add Prayer Update</h4>
        <div class="space-y-2">
          <textarea
            [id]="'updateContent-' + prayer.id"
            placeholder="Prayer update..."
            [(ngModel)]="updateContent"
            name="updateContent"
            aria-label="Prayer update details"
            class="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D] h-20"
            required
          ></textarea>
          @if (!isPersonal && !prayer.id.startsWith('pc-member-')) {
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="updateIsAnonymous-{{prayer.id}}"
              [(ngModel)]="updateIsAnonymous"
              name="updateIsAnonymous"
              class="rounded border-gray-900 dark:border-white focus:ring-2 focus:ring-[#39704D]"
            />
            <label [for]="'updateIsAnonymous-' + prayer.id" class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Post update anonymously
            </label>
          </div>
          }
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="updateMarkAsAnswered-{{prayer.id}}"
              [(ngModel)]="updateMarkAsAnswered"
              name="updateMarkAsAnswered"
              class="rounded border-gray-900 dark:border-white focus:ring-2 focus:ring-[#39704D]"
            />
            <label [for]="'updateMarkAsAnswered-' + prayer.id" class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Mark this prayer as answered
            </label>
          </div>
          <div class="flex gap-2">
            <button
              type="submit"
              [disabled]="!updateForm.valid"
              class="px-3 py-1.5 text-sm font-medium bg-[#39704D] text-white rounded-md border border-[#2d5a3f] hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
              aria-label="Submit prayer update"
            >
              Add Update
            </button>
            <button
              type="button"
              (click)="showAddUpdateForm = false"
              class="px-3 py-1.5 text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 cursor-pointer"
              aria-label="Cancel prayer update form"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
      }

      <!-- Delete Request Form -->
      @if (showDeleteRequestForm) {
      <form #deleteForm="ngForm" (ngSubmit)="deleteForm.valid && handleDeleteRequest()" class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg" role="region" [attr.aria-labelledby]="'deleteFormTitle-' + prayer.id">
        <h4 [id]="'deleteFormTitle-' + prayer.id" class="text-sm font-medium text-red-700 dark:text-red-400 mb-3">Request Prayer Deletion</h4>
        <div class="space-y-2">
          <textarea
            [id]="'deleteReason-' + prayer.id"
            placeholder="Reason for deletion request..."
            [(ngModel)]="deleteReason"
            name="deleteReason"
            aria-label="Reason for deletion"
            class="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
            required
          ></textarea>
          <div class="flex gap-2">
            <button
              type="submit"
              [disabled]="!deleteForm.valid"
              class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Submit deletion request"
            >
              Submit Request
            </button>
            <button
              type="button"
              (click)="showDeleteRequestForm = false"
              class="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label="Cancel deletion request form"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
      }

      <!-- Recent Updates -->
      @if (prayer.updates && prayer.updates.length > 0) {
      <div class=>
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Recent Updates @if (!showAllUpdates && getDisplayedUpdates().length < prayer.updates.length) {<span>({{ getDisplayedUpdates().length }} of {{ prayer.updates.length }})</span>}
          </h4>
          @if (shouldShowToggleButton()) {
          <button
            (click)="showAllUpdates = !showAllUpdates"
            class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            {{ showAllUpdates ? 'Show less' : 'Show all' }}
            <svg [class]="'transform transition-transform ' + (showAllUpdates ? 'rotate-180' : '')" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          }
        </div>
        <div class="space-y-3">
          @for (update of getDisplayedUpdates(); track update.id) {
          <div
            [class]="'bg-gray-100 dark:bg-gray-700 rounded-lg p-6 border relative ' + getBorderClass()"
          >
            <div class="relative mb-2">
              <div class="flex items-center">
                <!-- Answered badge for member updates -->
                @if (update.is_answered && prayer.id.startsWith('pc-member-')) {
                <span class="inline-flex items-center justify-center px-2 py-1 mr-2 bg-green-600 dark:bg-green-700 text-white rounded-full text-xs font-bold whitespace-nowrap">
                  Answered
                </span>
                }
                @if (!isPersonal && !prayer.id.startsWith('pc-member-')) {
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  Updated by: <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ update.is_anonymous ? 'Anonymous' : update.author }}</span>
                </span>
                }
                <div class="ml-auto flex items-center gap-2">
                  @if (isPersonal) {
                  <button
                    (click)="editPersonalUpdate.emit({update: update, prayerId: prayer.id})"
                    aria-label="Edit prayer update"
                    title="Edit update"
                    class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  }
                  @if (prayer.id.startsWith('pc-member-')) {
                  <button
                    (click)="editMemberUpdate.emit({update: update, prayerId: prayer.id})"
                    aria-label="Edit member update"
                    title="Edit update"
                    class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button
                    (click)="toggleMemberUpdateAnswered(update)"
                    [title]="update.is_answered ? 'Mark as unanswered' : 'Mark as answered'"
                    [attr.aria-label]="update.is_answered ? 'Mark as unanswered' : 'Mark as answered'"
                    [class]="'p-1 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md cursor-pointer ' + (update.is_answered ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400')"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  }
                  @if (showUpdateDeleteButton()) {
                  <button
                    (click)="handleDeleteUpdate(update.id)"
                    aria-label="Delete prayer update"
                    title="Delete this update"
                    class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                  }
                </div>
              </div>
              <span class="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {{ getUpdateDisplayDate(update) }}
              </span>
            </div>
            
            <!-- Badge in top-right corner -->
            @if ((updateBadges$.get(update.id) | async) && (badgeService.getBadgeFunctionalityEnabled$() | async) && activeFilter !== 'total' && !isPersonal && !prayer.id.startsWith('pc-member-')) {
              <button
                (click)="markUpdateAsRead(update.id)"
                class="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                title="Mark update as read"
                aria-label="Mark update as read"
              >
                1
              </button>
            }

            <p class="text-sm text-gray-700 dark:text-gray-300">{{ update.content }}</p>
            
            @if (showUpdateDeleteRequestForm === update.id && !isAdmin) {
            <form #updateDeleteForm="ngForm" (ngSubmit)="updateDeleteForm.valid && handleUpdateDeletionRequest()" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="region" [attr.aria-labelledby]="'updateDeleteFormTitle-' + update.id">
              <h4 [id]="'updateDeleteFormTitle-' + update.id" class="text-xs font-medium text-red-700 dark:text-red-400 mb-2">Request Update Deletion</h4>
              <div class="space-y-2">
                <textarea
                  [id]="'updateDeleteReason-' + update.id"
                  placeholder="Reason for deletion request..."
                  [(ngModel)]="updateDeleteReason"
                  name="updateDeleteReason"
                  aria-label="Reason for deletion"
                  class="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
                  required
                ></textarea>
                <div class="flex gap-2">
                  <button
                    type="submit"
                    [disabled]="!updateDeleteForm.valid"
                    class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Submit update deletion request"
                  >
                    Submit Request
                  </button>
                  <button
                    type="button"
                    (click)="showUpdateDeleteRequestForm = null"
                    class="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    aria-label="Cancel update deletion request form"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
            }
          </div>
          }
        </div>
      </div>
      }

      <!-- Confirmation Dialog -->
      @if (showConfirmationDialog) {
      <app-confirmation-dialog
        [title]="'Delete Prayer'"
        [message]="'Are you sure you want to delete this prayer? This action cannot be undone.'"
        [isDangerous]="true"
        [confirmText]="'Delete'"
        (confirm)="onConfirmDelete()"
        (cancel)="onCancelDelete()">
      </app-confirmation-dialog>
      }

      <!-- Share Prayer Modal -->
      @if (showShareModal) {
      <app-confirmation-dialog
        [title]="'Share Prayer?'"
        [message]="'A copy of your prayer will be submitted for admin approval to share publicly.'"
        [details]="'Your personal prayer stays in your private list. When approved, it will also appear on the main prayer board for the church to lift up in prayer.'"
        [isDangerous]="false"
        [confirmText]="'Share Prayer'"
        [cancelText]="'Cancel'"
        (confirm)="handleSharePrayer()"
        (cancel)="showShareModal = false">
      </app-confirmation-dialog>
      }

      <!-- Update Confirmation Dialog -->
      @if (showUpdateConfirmationDialog) {
      <app-confirmation-dialog
        [title]="updateConfirmationTitle"
        [message]="updateConfirmationMessage"
        [isDangerous]="true"
        [confirmText]="'Delete'"
        (confirm)="onConfirmUpdateDelete()"
        (cancel)="onCancelUpdateDelete()">
      </app-confirmation-dialog>
      }
    </div>
  `,
  styles: []
})
export class PrayerCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() prayer!: PrayerRequest;
  @Input() isAdmin = false;
  @Input() isPersonal = false;
  @Input() isDragging = false;
  @Input() dragHandle: TemplateRef<any> | null = null;
  @Input() deletionsAllowed: 'everyone' | 'original-requestor' | 'admin-only' = 'everyone';
  @Input() updatesAllowed: 'everyone' | 'original-requestor' | 'admin-only' = 'everyone';
  @Input() activeFilter: 'current' | 'answered' | 'archived' | 'total' | 'prompts' | 'personal' | 'planning_center_list' = 'total';
  
  @Output() delete = new EventEmitter<string>();
  @Output() addUpdate = new EventEmitter<any>();
  @Output() deleteUpdate = new EventEmitter<{updateId: string; prayerId: string}>();
  @Output() requestDeletion = new EventEmitter<any>();
  @Output() requestUpdateDeletion = new EventEmitter<any>();
  @Output() editPersonalPrayer = new EventEmitter<PrayerRequest>();
  @Output() editPersonalUpdate = new EventEmitter<any>();
  @Output() editMemberUpdate = new EventEmitter<any>();
  @Output() toggleUpdateAnswered = new EventEmitter<any>();

  prayerBadge$: Observable<boolean> | null = null;
  updateBadges$: Map<string, BehaviorSubject<boolean>> = new Map();
  private destroy$ = new Subject<void>();
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private prayerBadgeSubject$ = new BehaviorSubject<boolean>(false);

  showAddUpdateForm = false;
  showDeleteRequestForm = false;
  showUpdateDeleteRequestForm: string | null = null;
  showAllUpdates = false;
  showConfirmationDialog = false;
  showShareModal = false;
  isShareLoading = false;
  showUpdateConfirmationDialog = false;
  updateConfirmationTitle = '';
  updateConfirmationMessage = '';
  updateConfirmationId: string | null = null;

  // Update form fields
  updateContent = '';
  updateIsAnonymous = false;
  updateMarkAsAnswered = false;

  // Delete request form fields
  deleteReason = '';

  // Update deletion request form fields
  updateDeleteReason = '';

  constructor(
    private supabase: SupabaseService,
    private userSessionService: UserSessionService,
    public badgeService: BadgeService,
    private prayerService: PrayerService
  ) {}

  ngOnInit(): void {
    // Initialize badge observable for this prayer
    this.initializePrayerBadge();
    this.prayerBadge$ = this.prayerBadgeSubject$.asObservable();

    // Initialize badges for updates with local BehaviorSubjects
    if (this.prayer.updates && Array.isArray(this.prayer.updates)) {
      this.prayer.updates.forEach(update => {
        this.initializeUpdateBadge(update.id);
      });
    }

    // Listen to update badges changed event from badge service
    this.badgeService.getUpdateBadgesChanged$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Update prayer badge and all update badge subjects when batch changes occur
        this.updatePrayerBadge();
        if (this.prayer.updates && Array.isArray(this.prayer.updates)) {
          this.prayer.updates.forEach(update => {
            this.updateUpdateBadge(update.id);
          });
        }
      });

    // Listen to storage changes for cross-tab updates
    this.storageListener = (event: StorageEvent) => {
      if (event.key === 'read_prayers_data') {
        // Update only this prayer's update badge subjects
        if (this.prayer.updates && Array.isArray(this.prayer.updates)) {
          this.prayer.updates.forEach(update => {
            this.updateUpdateBadge(update.id);
          });
        }
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Check if updates array has changed
    if (changes['prayer'] && !changes['prayer'].firstChange) {
      const previousPrayer = changes['prayer'].previousValue as PrayerRequest;
      const currentPrayer = changes['prayer'].currentValue as PrayerRequest;
      
      // Detect if updates were added
      const previousUpdateIds = previousPrayer?.updates?.map(u => u.id) || [];
      const currentUpdateIds = currentPrayer?.updates?.map(u => u.id) || [];
      
      // Find new updates that weren't in the previous array
      const newUpdates = currentUpdateIds.filter(id => !previousUpdateIds.includes(id));
      
      if (newUpdates.length > 0) {
        // Initialize badge subjects for new updates
        newUpdates.forEach(newUpdateId => {
          const update = currentPrayer.updates?.find(u => u.id === newUpdateId);
          if (update && !this.updateBadges$.has(update.id)) {
            this.initializeUpdateBadge(update.id);
          }
        });
        // Refresh badge state for all updates so only the new one shows unread (existing
        // updates may still have been left true from initial ngOnInit before any were marked read)
        if (currentPrayer.updates && Array.isArray(currentPrayer.updates)) {
          currentPrayer.updates.forEach(update => {
            this.updateUpdateBadge(update.id);
          });
        }
      }
    }
  }

  /**
   * Initialize a badge subject for an update
   */
  private initializeUpdateBadge(updateId: string): void {
    const isUnread = this.badgeService.isUpdateUnread(updateId);
    const subject = new BehaviorSubject<boolean>(isUnread);
    this.updateBadges$.set(updateId, subject);
  }

  /**
   * Update a badge subject for an update based on badge service state
   */
  private updateUpdateBadge(updateId: string): void {
    const isUnread = this.badgeService.isUpdateUnread(updateId);
    const subject = this.updateBadges$.get(updateId);
    if (subject) {
      subject.next(isUnread);
    }
  }

  /**
   * Initialize the prayer badge based on badge service state
   */
  private initializePrayerBadge(): void {
    const isUnread = this.badgeService.isPrayerUnread(this.prayer.id);
    this.prayerBadgeSubject$.next(isUnread);
  }

  /**
   * Update the prayer badge based on current badge service state
   */
  private updatePrayerBadge(): void {
    const isUnread = this.badgeService.isPrayerUnread(this.prayer.id);
    this.prayerBadgeSubject$.next(isUnread);
  }

  ngOnDestroy(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get read update IDs from localStorage
   */
  private getReadUpdateIds(): string[] {
    try {
      const stored = localStorage.getItem('read_prayers_data');
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed.updates) ? parsed.updates : [];
    } catch (error) {
      return [];
    }
  }

  getBorderClass(): string {
    if (this.prayer.status === 'current') {
      return '!border-[#0047AB] dark:!border-[#0047AB]';
    } else if (this.prayer.status === 'answered') {
      return '!border-[#39704D] dark:!border-[#39704D]';
    } else {
      return '!border-[#C9A961] dark:!border-[#C9A961]';
    }
  }

  getStatusBadgeClasses(): string {
    if (this.prayer.status === 'current') {
      return 'bg-blue-50 dark:bg-blue-900/20 text-[#0047AB] dark:text-[#4A90E2] border border-[#0047AB] dark:border-[#0047AB]';
    } else if (this.prayer.status === 'answered') {
      return 'bg-green-50 dark:bg-green-900/20 text-[#39704D] dark:text-[#5FB876] border border-[#39704D] dark:border-[#39704D]';
    } else {
      return 'bg-amber-50 dark:bg-amber-900/20 text-[#C9A961] dark:text-[#D4AF85] border border-[#C9A961] dark:border-[#C9A961]';
    }
  }

  getStatusLabel(): string {
    return this.prayer.status.charAt(0).toUpperCase() + this.prayer.status.slice(1);
  }

  displayRequester(): string {
    return this.prayer.is_anonymous ? 'Anonymous' : this.prayer.requester;
  }

  // Check if delete button should be shown based on deletion policy
  // Admin: always shows delete button
  // admin-only: only admins can see/use delete
  // original-requestor: only prayer creator can delete
  // everyone: all users can request deletion
  showDeleteButton(): boolean {
    // Don't show delete button for synthetic Planning Center member cards
    if (this.prayer.id?.startsWith('pc-member-')) return false;
    // Personal prayers always allow deletion by owner
    if (this.isPersonal) return true;
    if (this.isAdmin) return true;
    if (this.deletionsAllowed === 'admin-only') return false;
    if (this.deletionsAllowed === 'original-requestor') {
      return this.isCurrentUserTheRequester();
    }
    return true; // 'everyone'
  }

  // Check if add update button should be shown based on update policy
  // Admin: always shows add update button
  // admin-only: only admins can see/use add update
  // original-requestor: only prayer creator can add updates
  // everyone: all users can submit updates
  // personal prayers: always allow updates by owner
  showAddUpdateButton(): boolean {
    // Personal prayers always allow updates by owner
    if (this.isPersonal) return true;
    if (this.isAdmin) return true;
    if (this.updatesAllowed === 'admin-only') return false;
    if (this.updatesAllowed === 'original-requestor') {
      return this.isCurrentUserTheRequester();
    }
    return true; // 'everyone'
  }

  // Check if update delete button should be shown based on deletion policy
  // Same rules as prayer deletion policy
  showUpdateDeleteButton(): boolean {
    if (this.isAdmin) return true;
    if (this.deletionsAllowed === 'admin-only') return false;
    if (this.deletionsAllowed === 'original-requestor') {
      return this.isCurrentUserTheRequester();
    }
    return true; // 'everyone'
  }

  handleDeleteClick(): void {
    if (this.isAdmin || this.isPersonal) {
      this.showConfirmationDialog = true;
    } else {
      this.showDeleteRequestForm = !this.showDeleteRequestForm;
      if (this.showDeleteRequestForm) {
        this.showAddUpdateForm = false;
      }
    }
  }

  onConfirmDelete(): void {
    this.delete.emit(this.prayer.id);
    this.showConfirmationDialog = false;
  }

  onCancelDelete(): void {
    this.showConfirmationDialog = false;
  }

  onConfirmUpdateDelete(): void {
    if (!this.updateConfirmationId) return;
    const updateId = this.updateConfirmationId;
    this.showUpdateConfirmationDialog = false;
    this.updateConfirmationId = null;
    this.deleteUpdate.emit({updateId, prayerId: this.prayer.id});
  }

  onCancelUpdateDelete(): void {
    this.showUpdateConfirmationDialog = false;
    this.updateConfirmationId = null;
  }

  toggleAddUpdate(): void {
    this.showAddUpdateForm = !this.showAddUpdateForm;
    if (this.showAddUpdateForm) {
      this.showDeleteRequestForm = false;
    }
  }

  async handleAddUpdate(): Promise<void> {
    const userEmail = this.getCurrentUserEmail();
    
    // Get user name from UserSessionService cache
    const userSession = this.userSessionService.getCurrentSession();
    // Always store the real name; is_anonymous flag controls display
    const authorName = userSession?.fullName || this.getCurrentUserName();
    
    const updateData = {
      prayer_id: this.prayer.id,
      content: this.updateContent,
      author: authorName,
      author_email: userEmail,
      is_anonymous: this.updateIsAnonymous,
      mark_as_answered: this.updateMarkAsAnswered
    };

    this.addUpdate.emit(updateData);
    this.resetUpdateForm();
  }

  handleDeleteRequest(): void {
    const nameParts = this.getCurrentUserName().split(' ');
    const requestData = {
      prayer_id: this.prayer.id,
      requester_first_name: nameParts[0] || '',
      requester_last_name: nameParts.slice(1).join(' ') || '',
      requester_email: this.getCurrentUserEmail(),
      reason: this.deleteReason
    };

    this.requestDeletion.emit(requestData);
    this.resetDeleteForm();
  }

  handleDeleteUpdate(updateId: string): void {
    if (this.isAdmin || this.isPersonal) {
      this.updateConfirmationTitle = 'Delete Update';
      this.updateConfirmationMessage = 'Are you sure you want to delete this update? This action cannot be undone.';
      this.updateConfirmationId = updateId;
      this.showUpdateConfirmationDialog = true;
    } else {
      // Toggle the form - close if already open for this update, open if closed
      if (this.showUpdateDeleteRequestForm === updateId) {
        this.showUpdateDeleteRequestForm = null;
      } else {
        this.showUpdateDeleteRequestForm = updateId;
        this.showAddUpdateForm = false;
        this.showDeleteRequestForm = false;
      }
    }
  }

  getDisplayedUpdates() {
    if (!this.prayer.updates) return [];
    const sortedUpdates = [...this.prayer.updates].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
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

  shouldShowToggleButton(): boolean {
    if (!this.prayer.updates) return false;
    const displayed = this.getDisplayedUpdates();
    return displayed.length < this.prayer.updates.length || this.showAllUpdates;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUpdateDisplayDate(update: any): string {
    // Show updated_at if it exists and is different from created_at, otherwise show created_at
    const dateToShow = update.updated_at || update.created_at;
    return this.formatDate(dateToShow);
  }

  private resetUpdateForm(): void {
    this.updateContent = '';
    this.updateIsAnonymous = false;
    this.updateMarkAsAnswered = false;
    this.showAddUpdateForm = false;
  }

  private resetDeleteForm(): void {
    this.deleteReason = '';
    this.showDeleteRequestForm = false;
  }

  private getCurrentUserEmail(): string {
    // Get email from UserSessionService (cached from database)
    const session = this.userSessionService.getCurrentSession();
    return session?.email || '';
  }

  // Helper method to check if the current user is the original prayer requester
  // Used for 'original-requestor' policy to verify user email matches prayer email
  private isCurrentUserTheRequester(): boolean {
    const userEmail = this.getCurrentUserEmail();
    return userEmail.toLowerCase() === (this.prayer.email || '').toLowerCase();
  }

  private getCurrentUserName(): string {
    const firstName = localStorage.getItem('userFirstName') || '';
    const lastName = localStorage.getItem('userLastName') || '';
    return `${firstName} ${lastName}`.trim();
  }

  handleUpdateDeletionRequest(): void {
    if (!this.showUpdateDeleteRequestForm) return;
    
    const nameParts = this.getCurrentUserName().split(' ');
    const requestData = {
      update_id: this.showUpdateDeleteRequestForm,
      requester_first_name: nameParts[0] || '',
      requester_last_name: nameParts.slice(1).join(' ') || '',
      requester_email: this.getCurrentUserEmail(),
      reason: this.updateDeleteReason
    };

    this.requestUpdateDeletion.emit(requestData);
    this.resetUpdateDeleteForm();
  }

  private resetUpdateDeleteForm(): void {
    this.updateDeleteReason = '';
    this.showUpdateDeleteRequestForm = null;
  }

  markPrayerAsRead(): void {
    this.badgeService.markPrayerAsRead(this.prayer.id);
  }

  /**
   * Mark an update as read
   */
  markUpdateAsRead(updateId: string): void {
    try {
      // Call the badge service method which handles all the counting
      this.badgeService.markUpdateAsRead(updateId, this.prayer.id, 'prayers');
      
      // Update the BehaviorSubject for this update immediately
      const subject = this.updateBadges$.get(updateId);
      if (subject) {
        subject.next(false); // Hide the badge
      }
    } catch (error) {
      console.warn('Failed to mark update as read:', error);
    }
  }

  toggleMemberUpdateAnswered(update: any): void {
    this.toggleUpdateAnswered.emit({
      updateId: update.id,
      prayerId: this.prayer.id,
      isAnswered: !update.is_answered
    });
  }

  async handleSharePrayer(): Promise<void> {
    if (!this.isPersonal) return;
    
    try {
      this.isShareLoading = true;
      await this.prayerService.sharePrayerForApproval(this.prayer.id);
      
      // Close the modal
      this.showShareModal = false;
      
      // Emit delete event to notify parent component to refresh the prayer list
      // The personal prayer has been deleted and converted to public
      this.delete.emit(this.prayer.id);
    } catch (error) {
      console.error('Error sharing prayer:', error);
      // Error handling is managed by the service toast
    } finally {
      this.isShareLoading = false;
    }
  }
}