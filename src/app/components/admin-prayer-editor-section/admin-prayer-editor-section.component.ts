import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-prayer-editor-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-section.component.html',
})
export class AdminPrayerEditorSectionComponent {
  @Input() expanded = false;

  @Output() toggle = new EventEmitter<void>();

  @ViewChild('sectionContainer', { read: ElementRef })
  private sectionContainer?: ElementRef<HTMLElement>;

  get containerElement(): HTMLElement | undefined {
    return this.sectionContainer?.nativeElement;
  }

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
