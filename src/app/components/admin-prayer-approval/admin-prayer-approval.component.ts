import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrayerCardComponent } from '../prayer-card/prayer-card.component';
import type { PrayerRequest } from '../../services/prayer.service';

@Component({
  selector: 'app-admin-prayer-approval',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, PrayerCardComponent],
  template: `
    <div class="space-y-4">
      <!-- Prayer Card -->
      <app-prayer-card
        [prayer]="prayer"
        [isPersonal]="false"
        (delete)="onDelete.emit($event)"
        (edit)="onEdit.emit($event)"
        (toggleUpdateAnswered)="onToggleUpdateAnswered.emit($event)"
        (toggleMemberUpdateAnswered)="onToggleMemberUpdateAnswered.emit($event)"
      ></app-prayer-card>

      <!-- Denial Form -->
      @if (isDenying) {
        <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for denial (optional)
          </label>
          <textarea
            [(ngModel)]="denialReason"
            rows="3"
            placeholder="Explain why this prayer request is being denied..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
          ></textarea>
        </div>
      }

      <!-- Admin Action Buttons -->
      <div class="flex gap-3 justify-end bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        @if (!isDenying) {
          <button
            (click)="isDenying = true"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Deny
          </button>
          <button
            (click)="onApprove.emit(prayer.id)"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Approve
          </button>
        } @else {
          <button
            (click)="handleDeny()"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Confirm Denial
          </button>
          <button
            (click)="isDenying = false; denialReason = ''"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
        }
      </div>
    </div>
  `,
  styles: []
})
export class AdminPrayerApprovalComponent {
  @Input() prayer!: PrayerRequest;
  
  @Output() onApprove = new EventEmitter<string>();
  @Output() onDeny = new EventEmitter<{ id: string; reason: string | null }>();
  @Output() onEdit = new EventEmitter<{ id: string; updates: any }>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onToggleUpdateAnswered = new EventEmitter<any>();
  @Output() onToggleMemberUpdateAnswered = new EventEmitter<any>();

  isDenying = false;
  denialReason = '';

  handleDeny(): void {
    this.onDeny.emit({ id: this.prayer.id, reason: this.denialReason || null });
    this.isDenying = false;
    this.denialReason = '';
  }
}
