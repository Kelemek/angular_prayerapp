import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  Output,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import type { EmailTemplateRow } from '../../lib/admin-email-templates';
import { AdminEmailTemplatesEditorComponent } from '../admin-email-templates-editor/admin-email-templates-editor.component';

@Component({
  selector: 'app-admin-email-templates-list',
  standalone: true,
  imports: [CommonModule, AdminEmailTemplatesEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-templates-list.component.html',
})
export class AdminEmailTemplatesListComponent implements AfterViewInit {
  /** Header button that received the current pointer/mouse down, if any. */
  private pendingHeaderButton: HTMLElement | null = null;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly hostElement: ElementRef<HTMLElement>,
    private readonly destroyRef: DestroyRef,
  ) {}

  @Input() templates: EmailTemplateRow[] = [];
  @Input() selectedId: string | null = null;
  @Input() editedTemplate: EmailTemplateRow | null = null;
  @Input() showPreview = false;
  @Input() saving = false;
  @Input() error: string | null = null;
  @Input() success: string | null = null;

  @Output() select = new EventEmitter<EmailTemplateRow>();
  @Output() togglePreview = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() revert = new EventEmitter<void>();

  ngAfterViewInit(): void {
    const onDocPointerUp = (event: PointerEvent) => {
      this.disarmHeaderIfPointerUpOutside(event);
    };
    const onDocMouseUp = (event: MouseEvent) => {
      this.disarmHeaderIfPointerUpOutside(event);
    };
    const onHostPointerUp = (event: PointerEvent) => {
      this.disarmHeaderIfPointerUpOutside(event);
    };
    const onHostMouseUp = (event: MouseEvent) => {
      this.disarmHeaderIfPointerUpOutside(event);
    };

    this.document.addEventListener('pointerup', onDocPointerUp, true);
    this.document.addEventListener('mouseup', onDocMouseUp, true);
    const host = this.hostElement.nativeElement;
    host.addEventListener('pointerup', onHostPointerUp, true);
    host.addEventListener('mouseup', onHostMouseUp, true);

    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('pointerup', onDocPointerUp, true);
      this.document.removeEventListener('mouseup', onDocMouseUp, true);
      host.removeEventListener('pointerup', onHostPointerUp, true);
      host.removeEventListener('mouseup', onHostMouseUp, true);
    });
  }

  onHeaderPointerDown(event: Event): void {
    event.stopPropagation();
    this.pendingHeaderButton = event.currentTarget as HTMLElement;
  }

  onHeaderKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
    }
    event.stopPropagation();
    this.pendingHeaderButton = event.currentTarget as HTMLElement;
  }

  onEditorPointerActivity(event: Event): void {
    event.stopPropagation();
    this.cancelHeaderToggle();
  }

  onEditInteraction(): void {
    this.cancelHeaderToggle();
  }

  private disarmHeaderIfPointerUpOutside(event: Event): void {
    const pending = this.pendingHeaderButton;
    const target = event.target as Node | null;
    if (pending && target && !pending.contains(target)) {
      this.cancelHeaderToggle();
    }
  }

  private cancelHeaderToggle(): void {
    this.pendingHeaderButton = null;
  }

  onHeaderClick(template: EmailTemplateRow, event: MouseEvent): void {
    event.stopPropagation();
    const pending = this.pendingHeaderButton;
    const willEmit =
      pending !== null && event.currentTarget === pending;
    if (!willEmit) {
      this.pendingHeaderButton = null;
      return;
    }
    this.pendingHeaderButton = null;
    this.select.emit(template);
  }
}
