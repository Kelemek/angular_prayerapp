import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";

export interface HomeAddChoiceOption<Id extends string = string> {
  id: Id;
  label: string;
  description: string;
  disabled?: boolean;
  hint?: string;
}

@Component({
  selector: "app-home-add-choice-modal",
  standalone: true,
  imports: [ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `
    @if (isOpen) {
      <app-modal-shell
        [title]="title"
        titleId="home-add-choice-title"
        panelClass="max-w-sm"
        closeAriaLabel="Close"
        (close)="close.emit()"
      >
        <div class="flex flex-col gap-3 p-4 sm:p-6">
          @for (option of options; track option.id) {
            <button
              type="button"
              class="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-left text-gray-800 transition-all dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 enabled:cursor-pointer enabled:hover:border-gray-400 dark:enabled:hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
              [disabled]="option.disabled === true"
              (click)="chooseOption(option)"
            >
              <span class="block text-sm font-semibold">{{ option.label }}</span>
              <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                {{ option.description }}
              </span>
              @if (option.disabled && option.hint) {
                <span class="mt-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  {{ option.hint }}
                </span>
              }
            </button>
          }
        </div>
      </app-modal-shell>
    }
  `,
})
export class HomeAddChoiceModalComponent<Id extends string = string> {
  @Input() isOpen = false;
  @Input() title = "";
  @Input() options: readonly HomeAddChoiceOption<Id>[] = [];

  @Output() choose = new EventEmitter<Id>();
  @Output() close = new EventEmitter<void>();

  chooseOption(option: HomeAddChoiceOption<Id>): void {
    if (option.disabled) return;
    this.choose.emit(option.id);
  }
}
