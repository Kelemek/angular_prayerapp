import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { PrayerSearchComponent } from '../prayer-search/prayer-search.component';
import { PrayerListBookletPrintComponent } from '../prayer-list-booklet-print/prayer-list-booklet-print.component';
import { PrayerArchiveTimelineComponent } from '../prayer-archive-timeline/prayer-archive-timeline.component';
import { BackupStatusComponent } from '../backup-status/backup-status.component';

@Component({
  selector: 'app-admin-settings-tools-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrayerSearchComponent,
    PrayerListBookletPrintComponent,
    PrayerArchiveTimelineComponent,
    BackupStatusComponent,
  ],
  template: `
    <div class="space-y-6">
      <div class="mb-4">
        <app-prayer-search #prayerSearch></app-prayer-search>
      </div>
      <div class="mb-4">
        <app-prayer-list-booklet-print></app-prayer-list-booklet-print>
      </div>
      <div class="mb-4">
        <app-prayer-archive-timeline></app-prayer-archive-timeline>
      </div>
      <div class="mb-4">
        <app-backup-status></app-backup-status>
      </div>
    </div>
  `,
})
export class AdminSettingsToolsPanelComponent {
  @ViewChild('prayerSearch') prayerSearchRef?: PrayerSearchComponent;
}
