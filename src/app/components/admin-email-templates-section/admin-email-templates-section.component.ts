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
  selector: 'app-admin-email-templates-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-templates-section.component.html',
})
export class AdminEmailTemplatesSectionComponent {
  @Input() expanded = false;

  @Output() toggle = new EventEmitter<void>();

  @ViewChild('sectionContainer', { read: ElementRef })
  private sectionContainer?: ElementRef<HTMLElement>;

  /** True only after pointer/mouse down started on the section title row. */
  private triggerToggleArmed = false;

  get containerElement(): HTMLElement | undefined {
    return this.sectionContainer?.nativeElement;
  }

  onShellClick(): void {
    if (!this.expanded) {
      this.toggle.emit();
    }
  }

  onTriggerPointerDown(event: Event): void {
    event.stopPropagation();
    this.triggerToggleArmed = true;
  }

  onTriggerKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
    }
    event.stopPropagation();
    this.triggerToggleArmed = true;
  }

  onTriggerClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.triggerToggleArmed) {
      return;
    }
    this.triggerToggleArmed = false;
    this.toggle.emit();
  }

  stopPanelClick(event: Event): void {
    event.stopPropagation();
    this.triggerToggleArmed = false;
  }
}
