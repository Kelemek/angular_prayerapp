import { Component, EventEmitter, Output } from '@angular/core';
import type { InfoPersonalActionPreview } from '../../lib/info-home-filter-preview.types';
import { CardActionsOverflowMenuComponent } from '../card-actions-overflow-menu/card-actions-overflow-menu.component';
import type { CardActionsOverflowItem } from '../card-actions-overflow-menu/card-actions-overflow-menu.types';

@Component({
  selector: 'app-info-home-filter-preview-personal-card',
  standalone: true,
  imports: [CardActionsOverflowMenuComponent],
  templateUrl: './info-home-filter-preview-personal-card.component.html',
})
export class InfoHomeFilterPreviewPersonalCardComponent {
  @Output() openPersonalAction = new EventEmitter<InfoPersonalActionPreview>();

  readonly overflowItems: CardActionsOverflowItem[] = [
    {
      id: 'answered',
      label: 'Mark as answered',
      icon: 'check',
      tone: 'gray',
      onSelect: () => this.openPersonalAction.emit('answered'),
    },
    {
      id: 'edit',
      label: 'Edit prayer',
      icon: 'edit',
      tone: 'blue',
      onSelect: () => this.openPersonalAction.emit('edit'),
    },
    {
      id: 'delete',
      label: 'Delete prayer',
      icon: 'trash',
      tone: 'red',
      onSelect: () => this.openPersonalAction.emit('delete'),
    },
  ];
}
