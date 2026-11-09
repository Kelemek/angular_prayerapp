import { Component, EventEmitter, Input, Output } from "@angular/core";
import { PrayerCardMetaHeaderComponent } from "../prayer-card-meta-header/prayer-card-meta-header.component";
import { joinCardShellClassParts } from "../../lib/card-shell-chrome";
import { getPrayerCardVariantLayout } from "../../lib/prayer-card-layout";

@Component({
  selector: "app-info-home-filter-preview-prayer-mock",
  standalone: true,
  imports: [PrayerCardMetaHeaderComponent],
  templateUrl: "./info-home-filter-preview-prayer-mock.component.html",
  host: { class: "block" },
})
export class InfoHomeFilterPreviewPrayerMockComponent {
  readonly layout = getPrayerCardVariantLayout("home");

  @Input({ required: true }) borderClass!: string;
  @Input({ required: true }) prayerCreatedAt!: string;
  @Input() isPersonal = false;
  @Input() category: string | null = null;
  @Input() groupName: string | null = null;
  @Input() groupColor: string | null = null;
  @Input() status = "current";
  @Input() showStatus = false;
  @Input() showDelete = false;
  @Output() toggleAnswered = new EventEmitter<void>();
  @Output() editPrayer = new EventEmitter<void>();
  @Output() deletePrayer = new EventEmitter<void>();

  get shellClasses(): string {
    return joinCardShellClassParts(
      this.layout.shellBaseClasses,
      this.layout,
      this.borderClass
    );
  }
}
