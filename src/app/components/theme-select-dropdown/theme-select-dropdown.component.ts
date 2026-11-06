import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import type { ThemeSelectOption } from '../../lib/theme-options';
import type { Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-select-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-select-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class ThemeSelectDropdownComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) theme!: Theme;
  @Input({ required: true }) options!: readonly ThemeSelectOption[];
  @Input() tourAnchorId = '';
  @Input() dropdownKey = 'theme';

  @Output() themeChange = new EventEmitter<Theme>();

  @ViewChild('triggerButton') triggerButton?: ElementRef<HTMLButtonElement>;

  open = false;
  activeIndex = -1;

  get selectedOption(): ThemeSelectOption | undefined {
    return this.options.find((o) => o.value === this.theme);
  }

  get displayLabel(): string {
    return this.selectedOption?.label ?? 'System';
  }

  toggleOpen(): void {
    this.open = !this.open;
    if (this.open) {
      const idx = this.options.findIndex((o) => o.value === this.theme);
      this.activeIndex = idx >= 0 ? idx : 0;
    }
    this.cdr.markForCheck();
  }

  close(): void {
    this.open = false;
    this.activeIndex = -1;
    this.cdr.markForCheck();
  }

  selectTheme(value: Theme): void {
    if (value !== this.theme) {
      this.themeChange.emit(value);
    }
    this.close();
    this.triggerButton?.nativeElement.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.open) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.triggerButton?.nativeElement.focus();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % this.options.length;
      this.cdr.markForCheck();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex =
        (this.activeIndex - 1 + this.options.length) % this.options.length;
      this.cdr.markForCheck();
      return;
    }
    if (event.key === 'Enter' && this.activeIndex >= 0) {
      event.preventDefault();
      this.selectTheme(this.options[this.activeIndex].value);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    const host = this.triggerButton?.nativeElement.closest('.theme-select-dropdown');
    if (host && !host.contains(target)) {
      this.close();
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.open) {
        this.toggleOpen();
      }
    }
  }
}
