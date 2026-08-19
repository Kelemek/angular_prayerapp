import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrayerEncouragementService } from '../../services/prayer-encouragement.service';

@Component({
  selector: 'app-prompt-card-pray-for-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-card-pray-for-modal.component.html',
})
export class PromptCardPrayForModalComponent {
  readonly prayerEncouragementService = inject(PrayerEncouragementService);

  @Input({ required: true }) isOpen!: boolean;

  @Output() confirm = new EventEmitter<boolean>();
  @Output() cancel = new EventEmitter<void>();

  prayForDoNotShowAgain = false;

  onCancel(): void {
    this.prayForDoNotShowAgain = false;
    this.cancel.emit();
  }

  onConfirm(): void {
    this.confirm.emit(this.prayForDoNotShowAgain);
    this.prayForDoNotShowAgain = false;
  }
}
