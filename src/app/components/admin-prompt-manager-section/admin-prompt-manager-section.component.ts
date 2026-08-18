import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-prompt-manager-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prompt-manager-section.component.html',
})
export class AdminPromptManagerSectionComponent {
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
