import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToastService, Toast } from "../../services/toast.service";
import { Observable } from "rxjs";

@Component({
  selector: "app-toast-container",
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Toast Container: centered at top, respects safe area (notch, home indicator) -->
    <div
      class="contrast-chip-surface fixed top-0 left-0 right-0 z-[250] flex flex-col items-center space-y-2 w-full max-w-md mx-auto pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pointer-events-none"
    >
      @for (toast of toasts$ | async; track toast.id) {
      <div
        [class]="
          'cp-toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg animate-slide-down ' +
          toastVariantClass(toast.type) +
          ' ' +
          toastService.getToastStyles(toast.type)
        "
      >
        <!-- Icon -->
        <svg
          class="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>

        <!-- Message -->
        <span class="text-sm font-medium">{{ toast.message }}</span>

        <!-- Close Button -->
        <button
          (click)="toastService.removeToast(toast.id)"
          class="opacity-90 hover:opacity-100 text-inherit ml-auto p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Dismiss"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      @keyframes slide-down {
        from {
          transform: translateY(-120%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .animate-slide-down {
        animation: slide-down 0.3s ease-out;
      }
    `,
  ],
})
export class ToastContainerComponent implements OnInit {
  toasts$!: Observable<Toast[]>;
  public toastService = inject(ToastService);

  ngOnInit(): void {
    this.toasts$ = this.toastService.toasts$;
  }

  toastVariantClass(type: Toast["type"]): string {
    switch (type) {
      case "success":
        return "cp-toast--success";
      case "error":
        return "cp-toast--error";
      case "warning":
        return "cp-toast--warning";
      case "info":
        return "cp-toast--info";
      default: {
        const unreachable: never = type;
        return unreachable;
      }
    }
  }
}
