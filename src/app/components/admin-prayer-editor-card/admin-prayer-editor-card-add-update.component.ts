import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSubscriberPickComponent } from '../admin-subscriber-pick/admin-subscriber-pick.component';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { AdminPrayerEditorCardComponent } from './admin-prayer-editor-card.component';

@Component({
  selector: 'app-admin-prayer-editor-card-add-update',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSubscriberPickComponent,
    RichTextEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-card-add-update.component.html',
})
export class AdminPrayerEditorCardAddUpdateComponent {
  @Input({ required: true }) card!: AdminPrayerEditorCardComponent;

  @ViewChild('addUpdateSubscriberPick')
  addUpdateSubscriberPick?: AdminSubscriberPickComponent;

  resetSubscriberPick(): void {
    this.addUpdateSubscriberPick?.reset();
  }
}
