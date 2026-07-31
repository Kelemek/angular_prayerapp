import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PrayerRequest, PrayerService } from '../../services/prayer.service';
import { RichTextEditorsSettingsService } from '../../services/rich-text-editors-settings.service';
import { SupabaseService } from '../../services/supabase.service';
import { UserSessionService } from '../../services/user-session.service';
import { BadgeService } from '../../services/badge.service';
import { PrayerEncouragementService } from '../../services/prayer-encouragement.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import {
  PrayerAddUpdateModalComponent,
  PrayerAddUpdatePayload,
} from '../prayer-add-update-modal/prayer-add-update-modal.component';
import {
  PrayerDeleteRequestModalComponent,
  PrayerDeleteRequestPayload,
} from '../prayer-delete-request-modal/prayer-delete-request-modal.component';

const PRAY_FOR_MODAL_DO_NOT_SHOW_KEY = 'prayer_encouragement_modal_do_not_show';

/** Matches active **Members** stat tab — church blue `#0047AB`, not Tailwind blue-600. */
const PLANNING_CENTER_MEMBER_BORDER_CLASS =
  '!border-[#0047AB] dark:!border-[#0047AB] ring ring-[#0047AB] dark:ring-[#0047AB] ring-offset-0';

@Component({
  selector: 'app-prayer-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationDialogComponent, RichTextViewComponent, PrayerAddUpdateModalComponent, PrayerDeleteRequestModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [attr.id]="tourPersonalWalkthroughAnchors ? 'tour-walkthrough-personal-prayer-card' : null"
      [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md border-[2px] px-6 pt-6 pb-4 mb-4 transition-colors relative ' + (dragHandle && isPersonal ? ' pl-10 ' : '') + getBorderClass()"
    >
      <!-- Drag Handle: rendered as first child so absolute left-3 top-1/2 is relative to card root (not header) -->
      @if (dragHandle && isPersonal) {
        <ng-container *ngTemplateOutlet="dragHandle"></ng-container>
      }
      <!-- Header -->
      <div class="flex items-start justify-between mb-4 relative">
        <div
          class="flex gap-3 flex-1 min-w-0 pr-24"
          [class.items-center]="activeFilter === 'planning_center_list'"
          [class.items-start]="activeFilter !== 'planning_center_list'"
        >
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
        <div class="absolute top-0 right-0 flex items-center gap-2 flex-shrink-0">
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
            [attr.id]="tourPersonalWalkthroughAnchors ? 'tour-walkthrough-personal-edit' : null"
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
            [attr.id]="tourPersonalWalkthroughAnchors ? 'tour-walkthrough-personal-delete' : null"
            aria-label="Delete prayer request"
            title="Delete prayer request"
            class="inline-flex items-center justify-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md cursor-pointer"
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
      <span class="absolute left-1/2 top-4 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {{ formatDate(prayer.created_at) }}
      </span>
      }
      <!-- Prayer Description -->
      <app-rich-text-view
        class="block text-gray-600 dark:text-gray-300 mb-4"
        [text]="prayer.description"
      ></app-rich-text-view>

      <!-- Action buttons - flex-nowrap, reduced padding so row fits without wrap or scroll -->
      @if (showAddUpdateButton()) {
      <div class="flex flex-nowrap gap-1 items-center min-w-0">
        <button
          type="button"
          (click)="toggleAddUpdate()"
          title="Add an update to this prayer"
          [attr.id]="
            tourPersonalWalkthroughAnchors
              ? 'tour-walkthrough-add-update'
              : tourUpdateAnchors
                ? 'tour-prayer-add-update'
                : null
          "
          class="flex-shrink-0 px-2 py-1 text-xs font-medium btn-chip btn-chip-green whitespace-nowrap"
        >
          Add Update
        </button>
        @if ((userSessionService.getShowPrayForButton$() | async) && (prayerEncouragementService.getPrayerEncouragementEnabled$() | async)) {
          @if (canPrayFor$ | async) {
            <button
              type="button"
              (click)="onPrayForClick()"
              title="Record that you prayed for this request"
              [attr.id]="tourPrayForEncouragementAnchors ? 'tour-prayer-pray-for' : null"
              class="flex-shrink-0 px-2 py-1 text-xs font-medium btn-chip btn-chip-blue whitespace-nowrap"
            >
              Pray For
            </button>
          } @else {
            <button
              type="button"
              disabled
              [attr.id]="tourPrayForEncouragementAnchors ? 'tour-prayer-pray-for' : null"
              [title]="'You can pray for this again in ' + ((prayerEncouragementService.getCooldownHoursForPrayer$(usesPersonalCooldown()) | async) ?? 4) + ' hours'"
              class="flex-shrink-0 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md border border-gray-300 dark:border-gray-600 cursor-not-allowed whitespace-nowrap"
            >
              Prayed For
            </button>
          }
        }
        @if ((userSessionService.getShowPrayingCount$() | async) && (prayerEncouragementService.getPrayerEncouragementEnabled$() | async) && showPrayedForBadge()) {
          <span
            class="flex-shrink-0 px-1.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md border border-blue-600 dark:border-blue-500 whitespace-nowrap"
            title="Number praying for this request"
          >
            {{ (prayer.prayed_for_count ?? 0) }} {{ isPersonal || isMemberPrayer() ? 'Prayers' : 'Praying' }}
          </span>
        }
      </div>
      }

      <app-prayer-add-update-modal
        [isOpen]="showAddUpdateForm"
        [prayerId]="prayer.id"
        [isPersonal]="isPersonal"
        [richTextEditorsEnabled]="richTextEditorsEnabled"
        [tourElementIds]="addUpdateTourElementIds"
        (close)="closeAddUpdateForm()"
        (submit)="onAddUpdateSubmit($event)"
      />

      <app-prayer-delete-request-modal
        [isOpen]="showDeleteRequestForm || showUpdateDeleteRequestForm !== null"
        [prayerId]="prayer.id"
        [requestType]="showUpdateDeleteRequestForm ? 'update' : 'prayer'"
        [updateId]="showUpdateDeleteRequestForm ?? ''"
        (close)="closeAllDeleteRequestForms()"
        (submit)="onDeleteRequestModalSubmit($event)"
      />

      <!-- Recent Updates -->
      @if (prayer.updates && prayer.updates.length > 0) {
      <div [class.mt-4]="recentUpdatesNeedsTopMargin()">
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
            [class]="'bg-inset-surface-muted rounded-lg p-6 border border-gray-300 dark:border-gray-600 relative'"
          >
            <div class="relative mb-2">
              <div class="flex items-start relative min-h-8">
                <div class="flex-1 min-w-0 pr-20">
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
                </div>
                <div class="absolute top-0 right-0 flex items-center gap-2 flex-shrink-0">
                  @if (isPersonal) {
                  <button
                    (click)="editPersonalUpdate.emit({update: update, prayerId: prayer.id})"
                    aria-label="Edit prayer update"
                    title="Edit update"
                    class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  }
                  @if (showUpdateDeleteButton()) {
                  <button
                    (click)="handleDeleteUpdate(update.id)"
                    aria-label="Delete prayer update"
                    title="Delete this update"
                    class="inline-flex items-center justify-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md cursor-pointer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

            <!-- Update content on its own row below meta (Answered / Updated by + buttons) for all types; min-h-8 on row above prevents overlap when left column is empty -->
            <app-rich-text-view
              class="block text-sm text-gray-700 dark:text-gray-300"
              [text]="update.content"
            ></app-rich-text-view>
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

      <!-- Pray For explanation modal -->
      @if (showPrayForModal) {
      <div class="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Pray For This Request</h2>
          </div>
          <div class="px-6 py-4">
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              @if (isPersonal) {
              When you click Pray For, your personal prayer count increases so you can track how often you have prayed for this request.
              } @else if (isMemberPrayer()) {
              When you click Pray For, the shared praying count for this Planning Center member increases. Only the total count is shown—your click is anonymous.
              } @else {
              When you click Pray For, the person who submitted this prayer request will see that others have prayed for them. Only the total count is shown—your click is anonymous.
              }
            </p>
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p class="text-sm text-blue-700 dark:text-blue-300">
                @if (isPersonal) {
                You can pray for the same personal request again in {{ (prayerEncouragementService.getCooldownHoursForPrayer$(true) | async) ?? 4 }} hours. Change this cooldown in Settings under Prayer encouragement on cards.
                } @else if (isMemberPrayer()) {
                This encourages others by showing how many times this member has been prayed for. You can pray for the same member again in {{ (prayerEncouragementService.getCooldownHoursForPrayer$(true) | async) ?? 4 }} hours. Change this cooldown in Settings under Prayer encouragement on cards.
                } @else {
                This encourages the requester by showing how many times their prayer has been lifted up. You can pray for the same request again in {{ (prayerEncouragementService.getCooldownHoursForPrayer$(false) | async) ?? 4 }} hours.
                }
              </p>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                [(ngModel)]="prayForDoNotShowAgain"
                name="prayForDoNotShowAgain"
                class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Do not show this again</span>
            </label>
          </div>
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
            <button
              (click)="showPrayForModal = false; prayForDoNotShowAgain = false"
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              (click)="onConfirmPrayForFromModal()"
              class="px-4 py-2 btn-chip btn-chip-blue"
            >
              Pray For
            </button>
          </div>
        </div>
      </div>
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
  /** First visible card in the list: stable ids for driver.js “Updating Prayers” tour. */
  @Input() tourUpdateAnchors = false;
  /** First community card on Home: stable id on **Pray For** / **Prayed For** for the Prayer Encouragement tour (step 2). */
  @Input() tourPrayForEncouragementAnchors = false;
  /** Personal card matching the hands-on help tour sample prayer — stable ids for driver.js. */
  @Input() tourPersonalWalkthroughAnchors = false;

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
  canPrayFor$ = of(true);
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
  showPrayForModal = false;
  prayForDoNotShowAgain = false;
  richTextEditorsEnabled = true;

  constructor(
    private supabase: SupabaseService,
    public userSessionService: UserSessionService,
    public badgeService: BadgeService,
    private prayerService: PrayerService,
    public prayerEncouragementService: PrayerEncouragementService,
    private cdr: ChangeDetectorRef,
    richTextEditorsSettings: RichTextEditorsSettingsService
  ) {
    richTextEditorsSettings
      .getRichTextEditorsEnabled$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        this.richTextEditorsEnabled = v;
        this.cdr.markForCheck();
      });
  }

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
    this.refreshCanPrayFor$();
  }

  private refreshCanPrayFor$(): void {
    if (!this.prayer?.id) {
      this.canPrayFor$ = of(true);
      return;
    }
    this.canPrayFor$ = this.prayerEncouragementService.getCanPrayFor$(
      this.prayer.id,
      this.usesPersonalCooldown()
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prayer'] || changes['isPersonal']) {
      this.refreshCanPrayFor$();
    }
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
    if (this.isPersonal) {
      return '!border-gray-300 dark:!border-gray-600';
    }
    if (
      this.activeFilter === 'planning_center_list' ||
      this.prayer.id.startsWith('pc-member-')
    ) {
      return PLANNING_CENTER_MEMBER_BORDER_CLASS;
    }
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
  // personal / Planning Center member cards: always allow for list viewers (no requester email)
  showAddUpdateButton(): boolean {
    // Personal prayers always allow updates by owner
    if (this.isPersonal) return true;
    // Member cards have no requester; list viewers can add updates and use Pray For
    if (this.isMemberPrayer()) return true;
    if (this.isAdmin) return true;
    if (this.updatesAllowed === 'admin-only') return false;
    if (this.updatesAllowed === 'original-requestor') {
      return this.isCurrentUserTheRequester();
    }
    return true; // 'everyone'
  }

  /** Top margin before Recent Updates when action buttons or an open form sit above. */
  recentUpdatesNeedsTopMargin(): boolean {
    return this.showAddUpdateButton();
  }

  showPrayedForBadge(): boolean {
    const count = this.prayer.prayed_for_count ?? 0;
    if (count <= 0) return false;
    // Personal prayers are private to the owner; they always see their count.
    if (this.isPersonal) return true;
    // Member cards have no requester email — shared count is visible to everyone on the list.
    if (this.isMemberPrayer()) return true;
    if (this.isAdmin) return true;
    return this.isCurrentUserTheRequester();
  }

  isMemberPrayer(): boolean {
    return !!this.prayer?.id?.startsWith('pc-member-');
  }

  /** Personal and member cards use the user's personal cooldown setting. */
  usesPersonalCooldown(): boolean {
    return this.isPersonal || this.isMemberPrayer();
  }

  onPrayForClick(): void {
    if (localStorage.getItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY) === 'true') {
      this.confirmPrayFor();
      return;
    }
    this.showPrayForModal = true;
    this.cdr.markForCheck();
  }

  onConfirmPrayForFromModal(): void {
    if (this.prayForDoNotShowAgain) {
      try {
        localStorage.setItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY, 'true');
      } catch {
        // Ignore quota or disabled localStorage
      }
    }
    this.showPrayForModal = false;
    this.prayForDoNotShowAgain = false;
    this.confirmPrayFor();
    this.cdr.markForCheck();
  }

  async confirmPrayFor(): Promise<void> {
    this.showPrayForModal = false;
    const prayedForPrayer = this.prayer;
    const prayerId = prayedForPrayer.id;
    const isMember = this.isMemberPrayer();
    const usePersonalCooldown = this.usesPersonalCooldown();
    if (!this.prayerEncouragementService.canPrayFor(prayerId, usePersonalCooldown)) return;
    this.prayerEncouragementService.recordPrayedFor(prayerId, usePersonalCooldown);
    let newCount: number | null;
    if (isMember) {
      const personId = prayerId.substring('pc-member-'.length);
      newCount = await this.prayerService.incrementMemberPrayedFor(personId);
    } else if (this.isPersonal) {
      newCount = await this.prayerService.incrementPersonalPrayedFor(prayerId);
    } else {
      newCount = await this.prayerService.incrementPrayedFor(prayerId);
    }
    if (newCount !== null) {
      prayedForPrayer.prayed_for_count = newCount;
      if (this.prayer?.id === prayerId) {
        this.prayer = { ...this.prayer, prayed_for_count: newCount };
      }
    } else {
      this.prayerEncouragementService.clearPrayedForCooldown(prayerId, usePersonalCooldown);
    }
    this.cdr.markForCheck();
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
        this.showUpdateDeleteRequestForm = null;
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
      this.showUpdateDeleteRequestForm = null;
    }
  }

  get addUpdateTourElementIds():
    | {
        content?: string;
        anonymousWrap?: string;
        anonymousInput?: string;
        markAnsweredWrap?: string;
        markAnsweredInput?: string;
        submit?: string;
      }
    | null {
    if (this.tourPersonalWalkthroughAnchors) {
      return { content: "tour-walkthrough-update-content" };
    }
    if (this.tourUpdateAnchors) {
      return {
        content: "tour-prayer-update-content",
        anonymousWrap: "tour-prayer-update-anonymous-wrap",
        anonymousInput: "tour-prayer-update-anonymous-input",
        markAnsweredWrap: "tour-prayer-update-mark-answered-wrap",
        markAnsweredInput: "tour-prayer-update-mark-answered-input",
        submit: "tour-prayer-update-submit",
      };
    }
    return null;
  }

  closeAddUpdateForm(): void {
    this.showAddUpdateForm = false;
    this.cdr.markForCheck();
  }

  onAddUpdateSubmit(payload: PrayerAddUpdatePayload): void {
    const userEmail = this.getCurrentUserEmail();

    const userSession = this.userSessionService.getCurrentSession();
    const authorName = userSession?.fullName || this.getCurrentUserName();

    const updateData = {
      prayer_id: this.prayer.id,
      content: payload.content,
      author: authorName,
      author_email: userEmail,
      is_anonymous: payload.is_anonymous,
      mark_as_answered: payload.mark_as_answered,
    };

    this.addUpdate.emit(updateData);
    this.showAddUpdateForm = false;
    this.cdr.markForCheck();
  }

  closeAllDeleteRequestForms(): void {
    this.showDeleteRequestForm = false;
    this.showUpdateDeleteRequestForm = null;
    this.cdr.markForCheck();
  }

  onDeleteRequestModalSubmit(payload: PrayerDeleteRequestPayload): void {
    if (this.showUpdateDeleteRequestForm) {
      this.onUpdateDeleteRequestSubmit(payload);
    } else {
      this.onDeleteRequestSubmit(payload);
    }
  }

  closeDeleteRequestForm(): void {
    this.closeAllDeleteRequestForms();
  }

  onDeleteRequestSubmit(payload: PrayerDeleteRequestPayload): void {
    const nameParts = this.getCurrentUserName().split(' ');
    const requestData = {
      prayer_id: this.prayer.id,
      requester_first_name: nameParts[0] || '',
      requester_last_name: nameParts.slice(1).join(' ') || '',
      requester_email: this.getCurrentUserEmail(),
      reason: payload.reason,
    };

    this.requestDeletion.emit(requestData);
    this.showDeleteRequestForm = false;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
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

  closeUpdateDeleteRequestForm(): void {
    this.closeAllDeleteRequestForms();
  }

  onUpdateDeleteRequestSubmit(payload: PrayerDeleteRequestPayload): void {
    if (!this.showUpdateDeleteRequestForm) return;

    const nameParts = this.getCurrentUserName().split(' ');
    const requestData = {
      update_id: this.showUpdateDeleteRequestForm,
      requester_first_name: nameParts[0] || '',
      requester_last_name: nameParts.slice(1).join(' ') || '',
      requester_email: this.getCurrentUserEmail(),
      reason: payload.reason,
    };

    this.requestUpdateDeletion.emit(requestData);
    this.showUpdateDeleteRequestForm = null;
    this.cdr.markForCheck();
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