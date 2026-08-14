import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-info-mock-search-bar",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-mock-search-bar.component.html",
})
export class InfoMockSearchBarComponent {
  @Output() openSearch = new EventEmitter<void>();
}
