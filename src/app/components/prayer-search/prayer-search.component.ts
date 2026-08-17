import {
  Component,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PrayerService } from '../../services/prayer.service';
import { AdminPrayerEditorSectionComponent } from '../admin-prayer-editor-section/admin-prayer-editor-section.component';
import { AdminPrayerEditorPanelComponent } from '../admin-prayer-editor-panel/admin-prayer-editor-panel.component';
import { AdminPrayerEditorDialogsComponent } from '../admin-prayer-editor-dialogs/admin-prayer-editor-dialogs.component';
import { PrayerEditorFacade } from '../../lib/admin-prayer-editor-facade';

@Component({
  selector: 'app-prayer-search',
  standalone: true,
  imports: [
    CommonModule,
    AdminPrayerEditorSectionComponent,
    AdminPrayerEditorPanelComponent,
    AdminPrayerEditorDialogsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prayer-search.component.html',
  styles: [`:host { display: block; }`],
})
export class PrayerSearchComponent
  extends PrayerEditorFacade
  implements OnDestroy
{
  @ViewChild('sectionRef') sectionRef?: AdminPrayerEditorSectionComponent;
  @ViewChild('panelRef') panelRef?: AdminPrayerEditorPanelComponent;
  @ViewChild(AdminPrayerEditorDialogsComponent)
  dialogsRef?: AdminPrayerEditorDialogsComponent;

  constructor(
    supabaseService: SupabaseService,
    toast: ToastService,
    cdr: ChangeDetectorRef,
    prayerService: PrayerService,
  ) {
    super({
      supabase: supabaseService,
      toast,
      prayerService,
      markForCheck: () => cdr.markForCheck(),
    });
  }

  ngOnDestroy(): void {
    this.destroySearchDebouncer();
  }
}
