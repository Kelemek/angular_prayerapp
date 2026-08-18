import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-prayer-types-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-types-section.component.html',
})
export class AdminPrayerTypesSectionComponent {
  @Input() expanded = false;

  @Output() toggle = new EventEmitter<void>();

  onShellClick(): void {
    if (!this.expanded) {
      this.toggle.emit();
    }
  }

  onTriggerClick(event: MouseEvent): void {
    event.stopPropagation();
    this.toggle.emit();
  }

  stopPanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
