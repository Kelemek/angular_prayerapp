import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-login-registration-form",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./login-registration-form.component.html",
})
export class LoginRegistrationFormComponent {
  @Input() firstName = "";
  @Input() lastName = "";
  @Input() affiliationReason = "";
  @Input() requiresApproval = false;
  @Input() loading = false;
  @Input() error = "";

  @Output() firstNameChange = new EventEmitter<string>();
  @Output() lastNameChange = new EventEmitter<string>();
  @Output() affiliationReasonChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<void>();

  get canSave(): boolean {
    return (
      !!this.firstName.trim() &&
      !!this.lastName.trim() &&
      (!this.requiresApproval || !!this.affiliationReason.trim())
    );
  }

  onSave(): void {
    this.save.emit();
  }
}
