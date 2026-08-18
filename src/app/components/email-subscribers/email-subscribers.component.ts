import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { AdminDataService } from '../../services/admin-data.service';
import { AdminEmailSubscribersSectionComponent } from '../admin-email-subscribers-section/admin-email-subscribers-section.component';
import { AdminEmailSubscribersPanelComponent } from '../admin-email-subscribers-panel/admin-email-subscribers-panel.component';
import { AdminEmailSubscribersDialogsComponent } from '../admin-email-subscribers-dialogs/admin-email-subscribers-dialogs.component';
import { EmailSubscribersFacade } from '../../lib/admin-email-subscribers-facade';

@Component({
  selector: 'app-email-subscribers',
  standalone: true,
  imports: [
    CommonModule,
    AdminEmailSubscribersSectionComponent,
    AdminEmailSubscribersPanelComponent,
    AdminEmailSubscribersDialogsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-subscribers.component.html',
  styles: [`:host { display: block; }`],
})
export class EmailSubscribersComponent
  extends EmailSubscribersFacade
  implements OnInit, OnDestroy
{
  @ViewChild('sectionRef') override sectionRef?: AdminEmailSubscribersSectionComponent;
  @ViewChild('panelRef') override panelRef?: AdminEmailSubscribersPanelComponent;
  @ViewChild(AdminEmailSubscribersDialogsComponent)
  override dialogsRef?: AdminEmailSubscribersDialogsComponent;

  private breakpointSub: Subscription | null = null;

  constructor(
    supabase: SupabaseService,
    toast: ToastService,
    cdr: ChangeDetectorRef,
    adminDataService: AdminDataService,
    private breakpointObserver: BreakpointObserver,
  ) {
    super({
      supabase,
      toast,
      adminDataService,
      markForCheck: () => cdr.markForCheck(),
    });
  }

  ngOnInit(): void {
    this.breakpointSub = this.breakpointObserver
      .observe('(max-width: 640px)')
      .subscribe((state) => {
        this.maxPaginationButtons = state.matches ? 3 : 5;
        this.markForCheck();
      });

    this.initOrientationTracking();
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
    this.destroySearchDebouncer();
    this.destroyOrientationTracking();
  }
}
