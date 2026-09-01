import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from "@angular/core";
import { ModalShellComponent } from "../modal-shell/modal-shell.component";
import {
  INFO_MEMORIZE_PRACTICE_SLIDES,
  nextMemorizePracticeSlideIndex,
  previousMemorizePracticeSlideIndex,
  type InfoMemorizePracticeSlide,
} from "../../lib/info-memorize-practice-preview";

@Component({
  selector: "app-info-preview-memorize-practice-modal",
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: "./info-preview-memorize-practice-modal.component.html",
})
export class InfoPreviewMemorizePracticeModalComponent {
  readonly slides = INFO_MEMORIZE_PRACTICE_SLIDES;
  slideIndex = 0;

  private openValue = false;
  private readonly cdr = inject(ChangeDetectorRef);

  @Input()
  set open(value: boolean) {
    const wasOpen = this.openValue;
    this.openValue = value;
    if (value && !wasOpen) {
      this.slideIndex = 0;
    }
    this.cdr.markForCheck();
  }

  get open(): boolean {
    return this.openValue;
  }

  @Output() closeModal = new EventEmitter<void>();

  currentSlide(): InfoMemorizePracticeSlide {
    return this.slides[this.slideIndex] ?? this.slides[0];
  }

  isFirstSlide(): boolean {
    return this.slideIndex <= 0;
  }

  isLastSlide(): boolean {
    return this.slideIndex >= this.slides.length - 1;
  }

  goNext(): void {
    this.slideIndex = nextMemorizePracticeSlideIndex(this.slideIndex);
  }

  goPrevious(): void {
    this.slideIndex = previousMemorizePracticeSlideIndex(this.slideIndex);
  }

  slideLabel(): string {
    return `${this.slideIndex + 1} of ${this.slides.length}`;
  }
}
