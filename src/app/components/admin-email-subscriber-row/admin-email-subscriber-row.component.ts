import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailSubscriberTimestampComponent } from '../email-subscriber-timestamp/email-subscriber-timestamp.component';
import type {
  EmailSubscriberRow,
  EmailSubscriberRowAction,
} from '../../lib/admin-email-subscribers';

@Component({
  selector: 'app-admin-email-subscriber-row',
  standalone: true,
  imports: [CommonModule, EmailSubscriberTimestampComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './admin-email-subscriber-row.component.html',
})
export class AdminEmailSubscriberRowComponent {
  @Input({ required: true }) subscriber!: EmailSubscriberRow;
  @Input() isFirst = false;
  @Output() action = new EventEmitter<EmailSubscriberRowAction>();

  onToggleActiveClick(): void {
    this.action.emit({ type: 'toggleActive' });
  }

  onToggleReceivePushClick(): void {
    this.action.emit({ type: 'toggleReceivePush' });
  }

  onToggleBlockedClick(): void {
    this.action.emit({ type: 'toggleBlocked' });
  }

  onEditClick(): void {
    this.action.emit({ type: 'edit' });
  }

  onDeleteClick(): void {
    this.action.emit({ type: 'delete' });
  }
}
