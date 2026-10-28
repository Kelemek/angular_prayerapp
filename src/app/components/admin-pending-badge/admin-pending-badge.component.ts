import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-admin-pending-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Host must not be a flex item, or the parent button's gap widens it.
  host: { class: 'contents' },
  template: `
    @if (count > 0) {
      <span
        class="absolute -top-2 -right-2 z-10 inline-flex items-center justify-center min-w-5 h-5 px-1 bg-[#39704D] text-white rounded-full text-xs font-bold pointer-events-none"
        data-testid="admin-pending-badge"
        >{{ count > 99 ? '99+' : count }}</span
      >
    }
  `,
})
export class AdminPendingBadgeComponent {
  @Input({ required: true }) count!: number;
}
