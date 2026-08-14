import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-login-mfa-panel",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./login-mfa-panel.component.html",
})
export class LoginMfaPanelComponent {
  @Input() email = "";
  @Input() codeLength = 4;
  @Input() mfaCodeInput = "";
  @Input() loading = false;
  @Input() resendLoading = false;
  @Input() error = "";
  @Input() showInstructions = true;

  @Output() mfaCodeInputChange = new EventEmitter<string>();
  @Output() codeInput = new EventEmitter<void>();
  @Output() codeBlur = new EventEmitter<void>();
  @Output() enterSubmit = new EventEmitter<Event>();
  @Output() resend = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  @ViewChild("codeField") private codeField?: ElementRef<HTMLInputElement>;

  focusCodeInput(): void {
    setTimeout(() => {
      this.codeField?.nativeElement.focus();
    }, 0);
  }

  onMfaCodeInputChange(value: string): void {
    this.mfaCodeInputChange.emit(value);
  }

  onCodeInput(): void {
    this.codeInput.emit();
  }

  onCodeBlur(): void {
    this.codeBlur.emit();
  }

  onEnterSubmit(event: Event): void {
    this.enterSubmit.emit(event);
  }

  onResend(): void {
    this.resend.emit();
  }

  onReset(): void {
    this.reset.emit();
  }
}
