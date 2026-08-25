import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';
import {
  PRAYER_CARD_META_HEADER_ICON_BUTTON_BASE_CLASSES,
  getMetaHeaderBandLayoutClasses,
  type MetaHeaderBandSize,
} from '../../lib/prayer-card-layout';
import { getSafeAreaViewportBounds } from '../../lib/fixed-popover-placement';
import {
  CARD_ACTIONS_OVERFLOW_MIN_WIDTH_PX,
  computeCardActionsOverflowPosition,
  estimateCardActionsOverflowHeight,
} from './card-actions-overflow-menu-placement';
import { CardActionsOverflowIconComponent } from './card-actions-overflow-icon.component';
import type {
  CardActionsOverflowItem,
  CardActionsOverflowTone,
} from './card-actions-overflow-menu.types';

@Component({
  selector: 'app-card-actions-overflow-menu',
  standalone: true,
  imports: [CardActionsOverflowIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (items.length > 0) {
    <button
      #trigger
      type="button"
      data-card-actions-trigger
      data-testid="card-actions-overflow-trigger"
      [attr.aria-expanded]="menuOpen"
      aria-haspopup="menu"
      aria-label="Card actions"
      title="Card actions"
      [class]="
        iconButtonBaseClasses +
        ' text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer ' +
        layoutClasses.iconButtonPaddingClasses
      "
      (click)="toggleMenu($event)"
    >
      <svg
        [class]="layoutClasses.iconSizeClasses"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="4" y1="6" x2="20" y2="6"></line>
        <line x1="4" y1="12" x2="20" y2="12"></line>
        <line x1="4" y1="18" x2="20" y2="18"></line>
      </svg>
    </button>
    }

    <ng-template #menuPortal>
      <div
        role="menu"
        aria-label="Card actions"
        data-card-actions-overflow-menu
        class="fixed z-50 min-w-48 rounded-lg border border-gray-300 bg-white p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
        [style.left.px]="menuPos.left"
        [style.top.px]="menuPos.top"
      >
        @for (item of items; track item.id) {
        <button
          type="button"
          role="menuitem"
          [attr.id]="item.tourAnchorId || null"
          [attr.data-card-action]="item.id"
          [attr.aria-label]="item.ariaLabel || item.label"
          [class]="itemButtonClass(item.tone)"
          (click)="selectItem($event, item)"
        >
          <app-card-actions-overflow-icon [icon]="item.icon" [filled]="!!item.filled" />
          <span>{{ item.label }}</span>
        </button>
        }
      </div>
    </ng-template>
  `,
})
export class CardActionsOverflowMenuComponent implements OnChanges, OnDestroy {
  private readonly appRef = inject(ApplicationRef);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly iconButtonBaseClasses = PRAYER_CARD_META_HEADER_ICON_BUTTON_BASE_CLASSES;

  @Input() items: CardActionsOverflowItem[] = [];
  @Input() bandSize: MetaHeaderBandSize = 'sm';
  /** Optional async prep (e.g. load reminder state) before the menu opens. */
  @Input() beforeMenuOpen?: () => void | Promise<void>;

  /** Emitted after `beforeMenuOpen` resolves and before the portal renders. */
  @Output() menuWillOpen = new EventEmitter<void>();

  @ViewChild('trigger') triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('menuPortal') menuPortalTpl?: TemplateRef<unknown>;

  menuOpen = false;
  menuPos = { left: 0, top: 0 };

  private menuPortalView: EmbeddedViewRef<unknown> | null = null;
  private positionRaf = 0;
  private scrollListener: (() => void) | null = null;
  private resizeListener: (() => void) | null = null;
  private openMenuGeneration = 0;

  get layoutClasses() {
    return getMetaHeaderBandLayoutClasses(this.bandSize);
  }

  itemButtonClass(tone: CardActionsOverflowTone): string {
    return (
      'flex w-full min-h-[44px] items-center gap-3 rounded-md px-3 text-left text-sm font-medium cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ' +
      this.toneClass(tone)
    );
  }

  toneClass(tone: CardActionsOverflowTone): string {
    switch (tone) {
      case 'blue':
        return 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20';
      case 'green':
        return 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20';
      case 'gray':
        return 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/40';
      case 'red':
        return 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20';
      default: {
        const _exhaustive: never = tone;
        return _exhaustive;
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] && this.menuOpen) {
      this.syncMenuPortal();
      this.updatePosition();
    }
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    if (this.menuOpen) {
      this.closeMenu();
      return;
    }
    void this.openMenu();
  }

  async openMenu(): Promise<void> {
    if (this.items.length === 0 || this.menuOpen) {
      return;
    }
    const generation = ++this.openMenuGeneration;
    await this.runBeforeMenuOpen();
    if (generation !== this.openMenuGeneration) {
      return;
    }
    if (!this.triggerRef?.nativeElement.isConnected) {
      return;
    }
    this.menuWillOpen.emit();
    this.menuOpen = true;
    this.cdr.markForCheck();
    this.schedulePositionUpdate();
  }

  private async runBeforeMenuOpen(): Promise<void> {
    const prepare = this.beforeMenuOpen;
    if (!prepare) {
      return;
    }
    await prepare();
  }

  closeMenu(): void {
    if (!this.menuOpen) {
      return;
    }
    this.menuOpen = false;
    this.detachMenuPortal();
    this.detachPositionListeners();
    this.cdr.markForCheck();
  }

  selectItem(event: Event, item: CardActionsOverflowItem): void {
    event.stopPropagation();
    item.onSelect();
    this.closeMenu();
    this.triggerRef?.nativeElement.focus();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.menuOpen) return;
    const target = event.target as Node;
    if (this.triggerRef?.nativeElement.contains(target)) return;
    if (this.getMenuElement()?.contains(target)) return;
    this.closeMenu();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.menuOpen || event.key !== 'Escape') return;
    this.closeMenu();
    this.triggerRef?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.openMenuGeneration += 1;
    this.detachMenuPortal();
    this.detachPositionListeners();
    if (this.positionRaf) {
      cancelAnimationFrame(this.positionRaf);
    }
  }

  private schedulePositionUpdate(): void {
    if (this.positionRaf) {
      cancelAnimationFrame(this.positionRaf);
    }
    this.positionRaf = requestAnimationFrame(() => {
      this.positionRaf = 0;
      if (this.menuOpen) {
        this.attachMenuPortal();
      }
      this.updatePosition();
    });
    this.attachPositionListeners();
  }

  private updatePosition(): void {
    const trigger = this.triggerRef?.nativeElement;
    if (!trigger) return;
    const menu = this.getMenuElement();
    const r = trigger.getBoundingClientRect();
    const viewport = getSafeAreaViewportBounds(trigger);
    const menuW = menu?.offsetWidth ?? CARD_ACTIONS_OVERFLOW_MIN_WIDTH_PX;
    const menuH =
      menu?.offsetHeight ?? estimateCardActionsOverflowHeight(this.items.length);
    const position = computeCardActionsOverflowPosition(
      r,
      { width: menuW, height: menuH },
      viewport
    );
    this.menuPos = { left: position.leftPx, top: position.topPx };
    this.syncMenuPortal();
  }

  private attachPositionListeners(): void {
    if (this.scrollListener) return;
    this.scrollListener = () => this.updatePosition();
    this.resizeListener = () => this.updatePosition();
    window.addEventListener('resize', this.resizeListener);
    window.addEventListener('scroll', this.scrollListener, true);
  }

  private detachPositionListeners(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener, true);
      this.scrollListener = null;
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
  }

  private attachMenuPortal(): void {
    if (this.menuPortalView || !this.menuPortalTpl) return;
    const viewRef = this.menuPortalTpl.createEmbeddedView(null);
    this.appRef.attachView(viewRef);
    for (const node of viewRef.rootNodes) {
      if (node instanceof Node) {
        document.body.appendChild(node);
      }
    }
    this.menuPortalView = viewRef;
    viewRef.detectChanges();
  }

  private detachMenuPortal(): void {
    if (!this.menuPortalView) return;
    const viewRef = this.menuPortalView;
    this.menuPortalView = null;
    for (const node of viewRef.rootNodes) {
      if (node instanceof Node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    this.appRef.detachView(viewRef);
    viewRef.destroy();
  }

  private getMenuElement(): HTMLDivElement | null {
    if (!this.menuPortalView) return null;
    for (const node of this.menuPortalView.rootNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches('[data-card-actions-overflow-menu]')) {
        return node as HTMLDivElement;
      }
      const nested = node.querySelector('[data-card-actions-overflow-menu]');
      if (nested instanceof HTMLDivElement) return nested;
    }
    return null;
  }

  private syncMenuPortal(): void {
    this.cdr.markForCheck();
    this.menuPortalView?.detectChanges();
  }
}
