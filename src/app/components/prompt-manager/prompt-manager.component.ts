import {
  Component,
  OnDestroy,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { AdminPromptManagerSectionComponent } from '../admin-prompt-manager-section/admin-prompt-manager-section.component';
import { AdminPromptManagerPanelComponent } from '../admin-prompt-manager-panel/admin-prompt-manager-panel.component';
import { AdminPromptManagerDialogsComponent } from '../admin-prompt-manager-dialogs/admin-prompt-manager-dialogs.component';
import { PromptManagerFacade } from '../../lib/admin-prompt-manager-facade';

@Component({
  selector: 'app-prompt-manager',
  standalone: true,
  imports: [
    CommonModule,
    AdminPromptManagerSectionComponent,
    AdminPromptManagerPanelComponent,
    AdminPromptManagerDialogsComponent,
  ],
  templateUrl: './prompt-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [],
})
export class PromptManagerComponent
  extends PromptManagerFacade
  implements OnDestroy
{
  @Output() onSave = new EventEmitter<void>();

  @ViewChild('panelRef')
  override panelRef?: AdminPromptManagerPanelComponent;

  @ViewChild('dialogsRef')
  override dialogsRef?: AdminPromptManagerDialogsComponent;

  constructor(
    supabase: SupabaseService,
    toast: ToastService,
    cdr: ChangeDetectorRef,
  ) {
    super({
      supabase,
      toast,
      markForCheck: () => cdr.markForCheck(),
    });
  }

  ngOnDestroy(): void {
    this.destroyPromptSearchDebouncer();
  }

  protected override notifySaved(): void {
    this.onSave.emit();
  }
}
