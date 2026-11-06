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

/** Dropdown row: value + label + optional tour id. */
export type ThemeDropdownOption<T extends string = string> = {
  value: T;
  label: string;
  tourOptionId?: string;
};

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
export class ThemeSelectDropdownComponent<T extends string = string> {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) value!: T;
  @Input({ required: true }) options!: readonly ThemeDropdownOption<T>[];
  /** When set, replaces the closed-state label (e.g. family row shows Day/Night for High Contrast). */
  @Input() triggerLabelOverride: string | null = null;
  /** Which icon set to render in rows and trigger. */
  @Input() iconVariant: 'family' | 'mode' = 'family';
  @Input() tourAnchorId = '';
  @Input() dropdownKey = 'theme';

  @Output() valueChange = new EventEmitter<T>();

  @ViewChild('triggerButton') triggerButton?: ElementRef<HTMLButtonElement>;

  open = false;
  activeIndex = -1;

  get selectedOption(): ThemeDropdownOption<T> | undefined {
    return this.options.find((o) => o.value === this.value);
  }

  get displayLabel(): string {
    return this.triggerLabelOverride ?? this.selectedOption?.label ?? '';
  }

  toggleOpen(): void {
    this.open = !this.open;
    if (this.open) {
      const idx = this.options.findIndex((o) => o.value === this.value);
      this.activeIndex = idx >= 0 ? idx : 0;
    }
    this.cdr.markForCheck();
  }

  close(): void {
    this.open = false;
    this.activeIndex = -1;
    this.cdr.markForCheck();
  }

  selectValue(next: T): void {
    if (next !== this.value) {
      this.valueChange.emit(next);
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
      this.selectValue(this.options[this.activeIndex].value);
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
