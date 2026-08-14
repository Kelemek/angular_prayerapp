import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-login-email-form",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./login-email-form.component.html",
})
export class LoginEmailFormComponent {
  @Input() email = "";
  @Input() loading = false;
  @Input() error = "";
  @Input() canSubmit = false;

  @Output() emailChange = new EventEmitter<string>();
  @Output() submitForm = new EventEmitter<Event>();

  onEmailChange(value: string): void {
    this.emailChange.emit(value);
  }

  onSubmit(event: Event): void {
    this.submitForm.emit(event);
  }
}
