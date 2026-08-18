import {
  ApplicationRef,
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PromptService } from '../../services/prompt.service';
import { AdminPrayerTypesSectionComponent } from '../admin-prayer-types-section/admin-prayer-types-section.component';
import { AdminPrayerTypesPanelComponent } from '../admin-prayer-types-panel/admin-prayer-types-panel.component';
import { AdminPrayerTypesDialogsComponent } from '../admin-prayer-types-dialogs/admin-prayer-types-dialogs.component';
import { PrayerTypesFacade } from '../../lib/admin-prayer-types-facade';

@Component({
  selector: 'app-prayer-types-manager',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    AdminPrayerTypesSectionComponent,
    AdminPrayerTypesPanelComponent,
    AdminPrayerTypesDialogsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prayer-types-manager.component.html',
  styles: [],
})
export class PrayerTypesManagerComponent extends PrayerTypesFacade {
  @Output() onSave = new EventEmitter<void>();

  @ViewChild('panelRef')
  override panelRef?: AdminPrayerTypesPanelComponent;

  @ViewChild('dialogsRef')
  override dialogsRef?: AdminPrayerTypesDialogsComponent;

  constructor(
    supabase: SupabaseService,
    toast: ToastService,
    promptService: PromptService,
    cdr: ChangeDetectorRef,
    appRef: ApplicationRef,
  ) {
    super({
      supabase,
      toast,
      promptService,
      markForCheck: () => cdr.markForCheck(),
      afterBookletUiRefresh: () => {
        cdr.detectChanges();
        appRef.tick();
      },
    });
  }

  protected override notifySaved(): void {
    this.onSave.emit();
  }
}
