import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-email-subscribers-toolbar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-subscribers-toolbar.component.html',
})
export class AdminEmailSubscribersToolbarComponent {
  @Input() showCSVUpload = false;
  @Input() showAddForm = false;

  @Output() toggleCsv = new EventEmitter<void>();
  @Output() toggleAdd = new EventEmitter<void>();
}
