import { Component, Input } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-login-header",
  standalone: true,
  imports: [RouterModule],
  templateUrl: "./login-header.component.html",
})
export class LoginHeaderComponent {
  @Input() useLogo = false;
  @Input() logoUrl = "";
  @Input() requireSiteLogin = false;
}
